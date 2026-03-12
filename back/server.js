require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt'); // Module pour le Rover
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration Réseau
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Stockage temporaire des sessions 2FA (en mémoire)
const sessions2FA = {};

// Fonction pour récupérer le token GTK (obligatoire pour l'API École Directe)
async function fetchGTKToken() {
    const response = await axios.get('https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
    });

    // Récupérer le cookie GTK depuis les headers de réponse
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) throw new Error('Impossible de récupérer le token GTK.');

    // Extraire la valeur GTK
    const allCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    const match = allCookies.match(/GTK=([^;]+)/);
    if (!match) throw new Error('Token GTK introuvable dans les cookies.');

    const gtkValue = match[1];
    // Extraire uniquement les paires nom=valeur des cookies (sans les attributs path, domain, etc.)
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');

    return {
        gtkHeader: gtkValue,
        gtkCookie: cookieHeader
    };
}

// Fonction pour faire une requête à l'API École Directe
async function ecoleDirecteRequest(path, payload = {}, extraHeaders = {}) {
    const body = new URLSearchParams({ data: JSON.stringify(payload) }).toString();

    const response = await axios.post(`https://api.ecoledirecte.com/v3${path}`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            ...extraHeaders
        }
    });

    return response;
}

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

// Route statut serveur
app.get('/api/status', (req, res) => {
    res.json({ status: "online", port: PORT });
});

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

// Route Auth École Directe (Gestion personnalisée des tokens pour éviter le bug de l'API)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifiant, motdepasse } = req.body;

        if (!identifiant || !motdepasse) {
            return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
        }

        // Étape 1 : Récupérer le token GTK (obligatoire)
        const gtk = await fetchGTKToken();

        // Étape 2 : Login avec GTK
        const response = await ecoleDirecteRequest('/login.awp', {
            identifiant,
            motdepasse,
            acceptationCharte: true
        }, {
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        const data = response.data;
        const token1 = data.token;
        const twofa1 = response.headers['2fa-token'] || token1;

        // Cas 1 : Connexion réussie directement
        if (data.code === 200 && token1) {
            const compte = data.data.accounts[0];
            console.log(`Connexion réussie pour ${compte.prenom} ${compte.nom}`);

            return res.json({
                token: token1,
                user: {
                    id: compte.id,
                    prenom: compte.prenom,
                    nom: compte.nom,
                    typeCompte: compte.typeCompte,
                    email: compte.email || ''
                }
            });

            // Cas 2 : Double authentification requise (code 250)
        } else if (data.code === 250) {
            // Étape 3 : Récupérer la question 2FA
            const questionRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=get', {}, {
                'X-Token': token1,
                '2fa-Token': twofa1,
                'X-Gtk': gtk.gtkHeader,
                'Cookie': gtk.gtkCookie
            });

            const qData = questionRes.data.data || {};
            const rawQuestion = qData.question || '';
            const rawPropositions = qData.propositions || [];

            const question = rawQuestion ? Buffer.from(rawQuestion, 'base64').toString('utf8') : 'Vérification de sécurité';
            const propositions = rawPropositions.map(p => Buffer.from(p, 'base64').toString('utf8'));

            const sessionId = crypto.randomUUID();

            // Mettre à jour les tokens à partir de la réponse
            const token2 = questionRes.data.token || token1;
            const twofa2 = questionRes.headers['2fa-token'] || twofa1;

            // Stocker la session 2FA (GARDE LE MEME GTK !)
            sessions2FA[sessionId] = {
                identifiant,
                motdepasse,
                gtk,
                token: token2,
                twoFAToken: twofa2,
                rawPropositions,
                createdAt: Date.now()
            };

            // Nettoyage auto après 5 minutes
            setTimeout(() => { delete sessions2FA[sessionId]; }, 5 * 60 * 1000);

            console.log(`2FA requise pour ${identifiant}`);

            return res.json({
                twoFactorRequired: true,
                question,
                propositions,
                sessionId
            });

            // Cas 3 : Identifiants incorrects
        } else {
            return res.status(401).json({ message: data.message || 'Identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('Erreur login École Directe:', error.message);
        return res.status(500).json({ message: 'Impossible de contacter École Directe.' });
    }
});

// Route validation 2FA École Directe
app.post('/api/auth/login/2fa/verify', async (req, res) => {
    try {
        const { sessionId, answer } = req.body;

        if (!sessionId || !answer) {
            return res.status(400).json({ message: 'Session et réponse obligatoires.' });
        }

        const session = sessions2FA[sessionId];
        if (!session) {
            return res.status(401).json({ message: 'Session expirée ou invalide. Reconnectez-vous.' });
        }

        const { identifiant, motdepasse, gtk, token, twoFAToken, rawPropositions } = session;

        // Trouver la proposition base64 correspondante
        const rawAnswer = rawPropositions.find(
            p => Buffer.from(p, 'base64').toString('utf8') === answer
        );

        if (!rawAnswer) {
            return res.status(400).json({ message: 'Réponse invalide. Veuillez sélectionner une proposition.' });
        }

        // Étape 4 : Valider la réponse 2FA avec le MÊME GTK
        const ansRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post', {
            choix: rawAnswer
        }, {
            'X-Token': token,
            '2fa-Token': twoFAToken,
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        if (ansRes.data.code !== 200) {
            return res.status(401).json({ message: ansRes.data.message || 'Réponse 2FA incorrecte.' });
        }

        // Mettre à jour les tokens à partir de la réponse
        const cn = ansRes.data.data?.cn || '';
        const cv = ansRes.data.data?.cv || '';
        const token3 = ansRes.data.token || token;
        const twofa3 = ansRes.headers['2fa-token'] || twoFAToken;

        // Étape 5 : Re-login final avec les tokens mis à jour et le MÊME GTK
        const reloginPayload = { identifiant, motdepasse, acceptationCharte: true };
        if (cn && cv) {
            reloginPayload.cn = cn;
            reloginPayload.cv = cv;
        }

        const loginRes = await ecoleDirecteRequest('/login.awp', reloginPayload, {
            'X-Token': token3,
            '2fa-Token': twofa3,
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        const finalData = loginRes.data;

        if (finalData.code === 200 && finalData.token) {
            delete sessions2FA[sessionId];

            const compte = finalData.data.accounts[0];
            console.log(`2FA validée pour ${compte.prenom} ${compte.nom}`);

            return res.json({
                token: finalData.token,
                user: {
                    id: compte.id,
                    prenom: compte.prenom,
                    nom: compte.nom,
                    typeCompte: compte.typeCompte,
                    email: compte.email || ''
                }
            });
        } else {
            return res.status(401).json({ message: finalData.message || 'Échec de reconnexion finale 2FA.' });
        }

    } catch (error) {
        console.error('Erreur 2FA École Directe:', error.message);
        return res.status(500).json({ message: 'Impossible de valider la double authentification.' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Serveur en ligne : http://${HOST}:${PORT}`);
});