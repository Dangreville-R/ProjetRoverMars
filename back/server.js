require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt'); // <-- 1. IMPORT MQTT AJOUTÉ ICI

const app = express();
app.use(cors());
app.use(express.json());

// Configuration Réseau
const PORT = process.env.PORT || 3001;
const HOST = '172.29.17.249';

// Fonction pour se connecter à la BDD de Raphaël (E3)
async function getConnection() {
    return mysql.createConnection({
        host: process.env.Serveur_BDD,
        user: process.env.User_BDD,
        password: process.env.Mot_De_Passe_BDD,
        database: process.env.Nom_BDD,
        connectTimeout: 10000
    });
}

const mqttClient = mqtt.connect('mqtt://172.29.17.249'); // L'adresse du Broker

mqttClient.on('connect', () => {
    console.log("Connecté au Broker MQTT");
    mqttClient.subscribe('rover/mesures'); 
});

mqttClient.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        const { temperature, humidite, co2 } = data;

        console.log(`[MQTT] Données reçues : T=${temperature}, H=${humidite}, CO2=${co2}`);

        // Sauvegarde automatique dans la BDD de Raphaël
        const connection = await getConnection();
        const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
        await connection.execute(sql, [temperature, co2, humidite]);
        await connection.end();

        console.log("Sauvegardé en BDD via MQTT avec succès");
    } catch (e) {
        console.error("Erreur lors de la réception MQTT :", e.message);
    }
});



// ROUTE 1 : STATUT DU SERVEUR
app.get('/api/status', (req, res) => {
    res.json({
        status: "online",
        gateway: "E2 - Romain",
        sensors: ["temperature", "humidite", "CO2"],
        target_db: process.env.Serveur_BDD
    });
});

// ROUTE 2 : ENREGISTREMENT (Alternative HTTP au cas où Noah change d'avis)
app.post('/api/mesures/save', async (req, res) => {
    let connection;
    try {
        const { temperature, humidite, co2 } = req.body;
        connection = await getConnection();
        const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
        await connection.execute(sql, [temperature, co2, humidite]);
        res.json({ message: "Succès du transfert" });
    } catch (error) {
        res.status(500).json({ error: "erreur de transfert" });
    } finally {
        if (connection) await connection.end();
    }
});

// ROUTE 3 : HISTORIQUE POUR TON FRONT-END 
app.get('/api/mesures/history', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 50");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Impossible de lire l'historique" });
    } finally {
        if (connection) await connection.end();
    }
});

// ROUTE 4 : RÉCUPÉRER LES 3 MESURES EN DIRECT (Avec Logique Conditionnelle)
app.get('/api/mesures/live', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute(
            "SELECT temperature, CO2, humidite, date FROM mesures ORDER BY date DESC LIMIT 1"
        );

        if (rows.length > 0) {
            const m = rows[0];
            let alertes = [];
            if (m.temperature > 35 || m.temperature < 5) alertes.push("Température critique !");
            if (m.CO2 > 1000) alertes.push("CO2 trop élevé ! Danger.");
            if (m.humidite > 70) alertes.push("Humidité trop forte !");

            res.json({
                donnees: m,
                sauve: alertes.length === 0,
                messages: alertes,
                statut: alertes.length === 0 ? "RAS" : "ALERTE"
            });
        } else {
            res.status(404).json({ message: "Aucune donnée" });
        }
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    } finally {
        if (connection) await connection.end();
    }
});

// ROUTE 5 : AUTHENTIFICATION ÉCOLE DIRECTE
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifiant, motdepasse } = req.body;
        const loginData = 'data=' + JSON.stringify({ identifiant, motdepasse });
        const response = await axios.post('https://api.ecoledirecte.com/v3/login.awp', loginData);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erreur École Directe" });
    }
});

// Lancement du serveur
app.listen(PORT, HOST, () => {
    console.log("Serveur  PRÊT");
    console.log(`URL : http://${HOST}:${PORT}`);
});