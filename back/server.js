require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt'); // Module pour le Rover

const app = express();
app.use(cors());
app.use(express.json());

// Configuration Réseau
const PORT = process.env.PORT || 3001;
const HOST = '172.29.17.249';

// Fonction de connexion BDD (Raphael étudiant 3)
async function getConnection() {
    return mysql.createConnection({
        host: process.env.Serveur_BDD,
        user: process.env.User_BDD,
        password: process.env.Mot_De_Passe_BDD,
        database: process.env.Nom_BDD,
        connectTimeout: 10000
    });
}


//  MQTT : RÉCEPTION NOAH
const mqttClient = mqtt.connect('mqtt://172.29.17.249');

mqttClient.on('connect', () => {
    console.log("Connecté au Broker MQTT");
    mqttClient.subscribe('rover/mesures');
});

mqttClient.on('message', async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        const { temperature, humidite, co2 } = data;
        
        const connection = await getConnection();
        const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
        await connection.execute(sql, [temperature, co2, humidite]);
        await connection.end();
        console.log("Données MQTT enregistrées en BDD");
    } catch (e) {
        console.error("Erreur MQTT :", e.message);
    }
});

// API : ROUTES HTTP

// Route des Mesure Live avec logique Conditionnelle
app.get('/api/mesures/live', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 1");
        if (rows.length > 0) {
            const m = rows[0];
            let alertes = [];
            if (m.temperature > 35 || m.temperature < 5) alertes.push("Température critique !");
            if (m.CO2 > 1000) alertes.push("CO2 élevé !");
            if (m.humidite > 70) alertes.push("Humidité excessive !");
            
            res.json({ donnees: m, messages: alertes, statut: alertes.length === 0 ? "RAS" : "ALERTE" });
        } else { res.status(404).json({ message: "Vide" }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (connection) await connection.end(); }
});

// Route Historique
app.get('/api/mesures/history', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 50");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (connection) await connection.end(); }
});

// Route Auth École Directe
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifiant, motdepasse } = req.body;
        
        if (!identifiant || !motdepasse) {
            return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
        }

        // On prépare les données comme dans ton script de test qui marche
        const payload = JSON.stringify({ identifiant, motdepasse });
        
        const response = await axios.post(
            'https://api.ecoledirecte.com/v3/login.awp?v=4.53.0', // <-- Ajout de la version
            `data=${encodeURIComponent(payload)}`, // <-- Encodage plus sûr
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // <-- User-Agent plus "crédible"
                }
            }
        );

        const data = response.data;

        if (data.code === 200 && data.token) {
            // On récupère le premier compte trouvé (élève)
            const compte = data.data.accounts[0];
            
            console.log(`Connexion réussie pour ${compte.prenom} ${compte.nom}`);

            res.json({
                token: data.token,
                user: {
                    id: compte.id,
                    prenom: compte.prenom,
                    nom: compte.nom,
                    typeCompte: compte.typeCompte,
                    email: compte.email || ''
                }
            });
        } else {
            res.status(401).json({ message: data.message || 'Identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('Erreur login École Directe:', error.message);
        res.status(500).json({ message: 'Impossible de contacter École Directe.' });
    }
});

app.listen(PORT, HOST, () => console.log(`Serveur en ligne : http://${HOST}:${PORT}`));