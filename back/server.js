require('dotenv').config();
const express = require('express');
const cors = require('cors');
<<<<<<< HEAD
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt'); // <-- 1. IMPORT MQTT AJOUTÉ ICI
=======
const { Session } = require('api-ecoledirecte');

const tempSessions = new Map();
const mysql = require('mysql2/promise'); // pour E3 (Raphaël)
>>>>>>> b3ce4b8fb798bf7f7292520af09e83c9199065b9

const app = express();
app.use(cors());
app.use(express.json());

<<<<<<< HEAD
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
=======
// configuration port et api
const PORT = process.env.PORT || 3001;
const API_E3_URL = process.env.API_E3_URL;
>>>>>>> b3ce4b8fb798bf7f7292520af09e83c9199065b9

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

<<<<<<< HEAD
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
=======
// route authentification via école directe (pour Noah - étudiant 1)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifiant, motdepasse } = req.body;
    if (!identifiant || !motdepasse) {
      return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
    }

    const session = new Session();

    try {
      await session.login(identifiant, motdepasse);

      // Si pas de 2FA requis
      if (session.accounts.length > 0) {
        const compte = session.accounts[0];
        return res.json({
          token: session.token,
          user: {
            id: compte.id,
            prenom: compte.prenom,
            nom: compte.nom,
            typeCompte: compte.typeCompte,
            email: compte.email || ''
          }
        });
      }
    } catch (err) {
      if (err.code === 250) {
        // Double authentification requise
        const questionData = await session.fetch2FAQuestion(identifiant, motdepasse);
        const sessionId = Date.now().toString();
        tempSessions.set(sessionId, { session, identifiant, motdepasse, questionData });

        return res.json({
          twoFactorRequired: true,
          sessionId,
          question: questionData.question,
          propositions: questionData.propositions
        });
      }
      return res.status(401).json({ message: err.edMessage || 'Identifiant ou mot de passe incorrect.' });
    }
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

// Route pour valider la 2FA
app.post('/api/auth/login/2fa/verify', async (req, res) => {
  try {
    const { sessionId, answer } = req.body;
    const temp = tempSessions.get(sessionId);

    if (!temp) {
      return res.status(400).json({ message: 'Session expirée ou invalide. Veuillez recommencer.' });
    }

    const { session, identifiant, motdepasse, questionData } = temp;

    // On trouve l'index de la réponse
    const index = questionData.propositions.indexOf(answer);
    if (index === -1) {
      return res.status(400).json({ message: 'Réponse invalide.' });
>>>>>>> b3ce4b8fb798bf7f7292520af09e83c9199065b9
    }

    // On envoie le choix au serveur d'Ecole Directe
    const choice = questionData.rawPropositions[index];
    const faResult = await session.fetch2FACreds(choice);

    // Une fois validé, on se reconnecte pour avoir le token final avec les codes de sécurité
    await session.login(identifiant, motdepasse, faResult);
    tempSessions.delete(sessionId);

    const compte = session.accounts[0];
    res.json({
      token: session.token,
      user: {
        id: compte.id,
        prenom: compte.prenom,
        nom: compte.nom,
        typeCompte: compte.typeCompte,
        email: compte.email || ''
      }
    });
  } catch (error) {
    console.error('Erreur 2FA:', error);
    res.status(401).json({ message: error.edMessage || 'Erreur lors de la validation 2FA.' });
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

<<<<<<< HEAD
// Lancement du serveur
app.listen(PORT, HOST, () => {
    console.log("Serveur  PRÊT");
    console.log(`URL : http://${HOST}:${PORT}`);
=======
// lancement du serveur
const BIND_IP = '0.0.0.0';
app.listen(PORT, BIND_IP, () => {
  console.log(` SERVEUR E2 EN LIGNE`);
  console.log(` Ecoute sur : http://${BIND_IP}:${PORT}`);
>>>>>>> b3ce4b8fb798bf7f7292520af09e83c9199065b9
});