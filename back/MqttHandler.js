const mqtt = require('mqtt');
const WebSocket = require('ws');

/**
 * Classe MqttHandler — Gère la connexion au broker MQTT et le traitement des messages.
 * Reçoit les mesures du rover, les enregistre en BDD et les diffuse via WebSocket.
 */
class MqttHandler {
    /**
     * @param {string} brokerUrl - URL du broker MQTT (ex: 'mqtt://172.29.17.249')
     * @param {WebSocket.Server} wss - Serveur WebSocket pour la diffusion temps réel
     * @param {import('./AdminConfig')} adminConfig - Instance de AdminConfig (seuils d'alerte)
     * @param {import('./ServerBDD/MesureRepository')} mesureRepository - Instance de MesureRepository (fallback BDD)
     * @param {import('./ServerBDD/database')} database - Instance de Database (connexion directe)
     */
    constructor(brokerUrl, wss, adminConfig, mesureRepository, database) {
        this._brokerUrl = brokerUrl;
        this._wss = wss;
        this._adminConfig = adminConfig;
        this._mesureRepository = mesureRepository;
        this._database = database;
        this._client = null;
        this._lastDbInsertTime = 0;
    }

    /**
     * Se connecte au broker MQTT et s'abonne aux topics du rover.
     */
    connect() {
        this._client = mqtt.connect(this._brokerUrl);

        this._client.on('connect', () => {
            console.log("Connecté au Broker MQTT");
            this._client.subscribe('rover/mesures'); // pour les capteurs
            this._client.subscribe('Rover/move');    // pour écouter l'App Inventor
        });

        this._client.on('message', async (topic, message) => {
            await this._onMessage(topic, message);
        });
    }

    /**
     * Traite un message MQTT reçu du rover.
     * 1. Enregistre les données en BDD avec limitation de fréquence (1/min)
     * 2. Construit le payload JSON pour le front-end
     * 3. Diffuse via WebSocket à tous les clients connectés
     * @param {string} topic - Le topic MQTT
     * @param {Buffer} message - Le message brut
     */
    async _onMessage(topic, message) {
        try {
            // conversion du message en objet JavaScript
            const data = JSON.parse(message.toString());
            const temperature = data.temperature ?? data.temp;
            const humidite = data.humidite ?? data.hum;
            const co2 = data.co2 ?? data.CO2;

            const now = Date.now();

            // 1. Enregistrement des données en BDD avec limite de fréquence (toutes les 60 secondes)
            if (now - this._lastDbInsertTime >= 60000) {
                try {
                    const connection = await this._database.getConnection();
                    const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
                    await connection.execute(sql, [temperature, co2, humidite]);
                    await connection.end();
                    console.log("Données MQTT enregistrées en BDD (Limitation: 1/min)");
                    this._lastDbInsertTime = now;
                } catch (dbError) {
                    console.error("Erreur BDD, tentative de sauvegarde locale via saveMesure...");
                    this._mesureRepository.saveMesure(data); // utilisation du repository de secours
                }
            }

            // 2. Structuration du JSON pour le Front-End
            const config = this._adminConfig.get();
            const payload = this._buildPayload(temperature, co2, humidite, config);

            // 3. Envoi des données structurées en temps réel via WebSocket
            this._broadcastToClients(payload);

            console.log(`Diffusion Temps Réel effectuée. Statut: ${payload.statut}`);
        } catch (e) {
            console.error("Erreur traitement message MQTT :", e.message);
        }
    }

    /**
     * Construit le payload JSON envoyé aux clients WebSocket.
     * @param {number} temperature
     * @param {number} co2
     * @param {number} humidite
     * @param {Object} config - Seuils d'alerte de AdminConfig
     * @returns {Object} Le payload structuré
     */
    _buildPayload(temperature, co2, humidite, config) {
        return {
            donnees: {
                temperature: Number(temperature),
                co2: Number(co2),
                humidite: Number(humidite),
                date: new Date().toISOString()
            },
            statut: (temperature > config.T_max || temperature < config.T_min || co2 > config.CO2_max || humidite > config.H_max)
                ? "ALERTE"
                : "RAS",
            timestamp: new Date().toLocaleTimeString()
        };
    }

    /**
     * Diffuse un payload JSON à tous les clients WebSocket connectés.
     * @param {Object} payload - Le payload à envoyer
     */
    _broadcastToClients(payload) {
        this._wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
    }
}

module.exports = MqttHandler;
