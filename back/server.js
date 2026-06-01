// chargement des variables d'environnement depuis le fichier .env
require('dotenv').config();

// importation des modules nécessaires
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

// importation des classes du projet
const database = require('./ServerBDD/database');
const MesureRepository = require('./ServerBDD/MesureRepository');
const AdminConfig = require('./AdminConfig');
const EcoleDirecteAuthService = require('./EcoleDirecteAuthService');
const MqttHandler = require('./MqttHandler');

/**
 * Classe RoverServer — Point d'entrée principal de l'application.
 * Orchestre Express, HTTP, WebSocket, MQTT, les routes API et les services.
 */
class RoverServer {
    constructor() {
        // création de l'application Express et du serveur HTTP/WebSocket
        this._app = express();
        this._server = http.createServer(this._app);
        this._wss = new WebSocket.Server({ server: this._server });

        // instanciation des services
        this._database = database;
        this._mesureRepository = new MesureRepository(this._database);
        this._adminConfig = new AdminConfig();
        this._authService = new EcoleDirecteAuthService();
        this._mqttHandler = new MqttHandler(
            'mqtt://172.29.17.249',
            this._wss,
            this._adminConfig,
            this._mesureRepository,
            this._database
        );

        // configuration du réseau (port et adresse)
        this._port = process.env.PORT || 3001;
        this._host = '0.0.0.0';

        // initialisation
        this._setupMiddlewares();
        this._setupWebSocket();
        this._setupRoutes();
        this._mqttHandler.connect();
    }

    /**
     * Configure les middlewares Express (CORS, JSON, URL-encoded).
     */
    _setupMiddlewares() {
        this._app.use(cors());
        this._app.use(express.json());
        this._app.use(express.urlencoded({ extended: true }));
    }

    /**
     * Configure le serveur WebSocket.
     */
    _setupWebSocket() {
        // quand un client se connecte en WebSocket
        this._wss.on('connection', (ws) => {
            console.log("Client web connecté en WebSocket");
        });
    }

    /**
     * Configure toutes les routes API de l'application.
     */
    _setupRoutes() {
        this._setupMesureRoutes();
        this._setupAdminRoutes();
        this._setupAuthRoutes();
    }

    // ─── Routes Mesures ──────────────────────────────────────────────

    /**
     * Configure les routes liées aux mesures (live, history, viabilite, latest).
     */
    _setupMesureRoutes() {
        // route : données live (dernière mesure en BDD)
        this._app.get('/api/mesures/live', async (req, res) => {
            let connection;
            try {
                connection = await this._database.getConnection();
                const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 1");

                if (rows.length > 0) {
                    const m = rows[0];
                    const config = this._adminConfig.get();
                    let alertes = [];
                    if (m.temperature > config.T_max || m.temperature < config.T_min) alertes.push("Température critique !");
                    if (m.CO2 > config.CO2_max) alertes.push("CO2 élevé !");
                    if (m.humidite > config.H_max) alertes.push("Humidité excessive !");

                    res.json({ donnees: m, messages: alertes, statut: alertes.length === 0 ? "RAS" : "ALERTE" });
                } else {
                    res.status(404).json({ message: "Vide" });
                }
            } catch (err) {
                res.status(500).json({ error: err.message });
            } finally {
                if (connection) await connection.end();
            }
        });

        // route : historique des mesures
        this._app.get('/api/mesures/history', async (req, res) => {
            let connection;
            try {
                const { start, end } = req.query;
                connection = await this._database.getConnection();
                let sql = "SELECT * FROM mesures";
                let params = [];
                if (start && end) {
                    sql += " WHERE date BETWEEN ? AND ?";
                    params = [start, end];
                }
                sql += " ORDER BY date DESC LIMIT 100";
                const [rows] = await connection.execute(sql, params);
                res.json(rows);
            } catch (err) {
                res.status(500).json({ error: err.message });
            } finally {
                if (connection) await connection.end();
            }
        });

        // route : calcul de viabilité
        this._app.get('/api/mesures/viabilite', async (req, res) => {
            let connection;
            try {
                const { start, end } = req.query;
                connection = await this._database.getConnection();
                let sql = "SELECT * FROM mesures";
                let params = [];
                let limit = 50;
                if (start && end) {
                    sql += " WHERE date BETWEEN ? AND ?";
                    params = [start, end];
                    limit = 500;
                }
                sql += ` ORDER BY date DESC LIMIT ${limit}`;
                const [rows] = await connection.execute(sql, params);
                const result = this._calculerViabilite(rows, this._adminConfig.get());
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: err.message });
            } finally {
                if (connection) await connection.end();
            }
        });

        // route : dernières mesures (fenêtre paramétrable via ?secondes=60)
        this._app.get('/api/mesures/latest', async (req, res) => {
            try {
                // fenêtre paramétrable via ?secondes=60 (défaut : 60)
                const secondes = parseInt(req.query.secondes) || 60;
                const mesures = await this._mesureRepository.getLastMesures(secondes);

                res.json(mesures); // [] si aucune mesure sur la fenêtre
            } catch (err) {
                console.error('[GET /api/mesures/latest] Erreur :', err);
                res.status(500).json({ message: 'Erreur serveur.' });
            }
        });
    }

    // ─── Routes Admin ────────────────────────────────────────────────

    /**
     * Configure les routes de configuration administrateur.
     */
    _setupAdminRoutes() {
        // route : récupérer la configuration actuelle
        this._app.get('/api/admin/config', (req, res) => {
            res.json(this._adminConfig.get());
        });

        // route : mettre à jour la configuration
        this._app.post('/api/admin/config', (req, res) => {
            this._adminConfig.update(req.body);
            res.json({ message: 'Configuration sauvegardée.', config: this._adminConfig.get() });
        });
    }

    // ─── Routes École Directe ────────────────────────────────────────

    /**
     * Configure les routes d'authentification École Directe.
     */
    _setupAuthRoutes() {
        // route : login École Directe
        this._app.post('/api/auth/login', async (req, res) => {
            try {
                const { identifiant, motdepasse } = req.body;
                if (!identifiant || !motdepasse) {
                    return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
                }

                const result = await this._authService.login(identifiant, motdepasse);

                if (result.success) {
                    return res.json({ token: result.token, user: result.user });
                } else if (result.twoFactorRequired) {
                    return res.json({ twoFactorRequired: true, question: result.question, propositions: result.propositions, sessionId: result.sessionId });
                } else {
                    return res.status(401).json({ message: result.message });
                }
            } catch (error) {
                console.error('Erreur login École Directe:', error.message);
                return res.status(500).json({ message: 'Impossible de contacter École Directe.' });
            }
        });

        // route : vérification 2FA
        this._app.post('/api/auth/login/2fa/verify', async (req, res) => {
            try {
                const { sessionId, answer } = req.body;
                if (!sessionId || !answer) return res.status(400).json({ message: 'Session et réponse obligatoires.' });

                const result = await this._authService.verify2FA(sessionId, answer);

                if (result.success) {
                    return res.json({ token: result.token, user: result.user });
                } else {
                    return res.status(result.status).json({ message: result.message });
                }
            } catch (error) {
                return res.status(500).json({ message: 'Erreur technique 2FA.' });
            }
        });
    }

    // ─── Logique Métier ──────────────────────────────────────────────

    /**
     * Calcule le score de viabilité à partir d'un ensemble de mesures et des seuils admin.
     * @param {Array} mesures - Tableau de mesures { temperature, CO2, humidite }
     * @param {Object} seuilsAdmin - Seuils { T_min, T_max, CO2_max, H_max }
     * @returns {Object} { score, statut, moyennes: { T_moy, CO2_moy, H_moy } }
     */
    _calculerViabilite(mesures, seuilsAdmin) {
        if (!mesures || mesures.length === 0) {
            return { score: 0, statut: "Inconnu", moyennes: { T_moy: 0, CO2_moy: 0, H_moy: 0 } };
        }
        const { T_min, T_max, CO2_max, H_max } = seuilsAdmin;
        let sumT = 0, sumCO2 = 0, sumH = 0;
        mesures.forEach(m => {
            sumT += Number(m.temperature);
            sumCO2 += Number(m.CO2);
            sumH += Number(m.humidite);
        });
        const total = mesures.length;
        const T_moy = sumT / total;
        const CO2_moy = sumCO2 / total;
        const H_moy = sumH / total;
        let score = 100;
        if (T_moy < T_min) score -= (T_min - T_moy) * 5;
        else if (T_moy > T_max) score -= (T_moy - T_max) * 5;
        if (CO2_moy > CO2_max) score -= ((CO2_moy - CO2_max) / 50);
        if (H_moy > H_max) score -= (H_moy - H_max) * 2;
        score = Math.max(0, Math.min(100, Math.round(score)));
        let statut = "Favorable";
        if (score < 50) statut = "Inhospitalier";
        else if (score <= 80) statut = "Limite";
        return {
            score,
            statut,
            moyennes: {
                T_moy: Number(T_moy.toFixed(2)),
                CO2_moy: Number(CO2_moy.toFixed(2)),
                H_moy: Number(H_moy.toFixed(2))
            }
        };
    }

    /**
     * Démarre le serveur HTTP sur le port et l'adresse configurés.
     */
    start() {
        this._server.listen(this._port, this._host, () => {
            console.log(`Serveur en ligne : http://${this._host}:${this._port}`);
        });
    }
}

// démarrage du serveur
new RoverServer().start();
