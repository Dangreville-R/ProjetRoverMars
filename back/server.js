require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt');
const crypto = require('crypto');
const http = require('http'); // Requis pour le WebSocket
const WebSocket = require('ws'); // Module WebSocket
const { saveMesure } = require('./ServerBDD/saveMesure');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration Réseau
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// Création du serveur HTTP pour supporter le WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const sessions2FA = {};

async function fetchGTKToken() {
    const response = await axios.get('https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
    });
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) throw new Error('Impossible de récupérer le token GTK.');
    const allCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    const match = allCookies.match(/GTK=([^;]+)/);
    if (!match) throw new Error('Token GTK introuvable dans les cookies.');
    const gtkValue = match[1];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    return { gtkHeader: gtkValue, gtkCookie: cookieHeader };
}

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

// Fonction de connexion BDD
async function getConnection() {
    return mysql.createConnection({
        host: process.env.Serveur_BDD,
        user: process.env.User_BDD,
        password: process.env.Mot_De_Passe_BDD,
        database: process.env.Nom_BDD,
        connectTimeout: 10000
    });
}

// ==========================================
// WEBSOCKET : DIFFUSION TEMPS RÉEL
// ==========================================
wss.on('connection', (ws) => {
    console.log("Client web connecté en WebSocket");
});

// ==========================================
// MQTT : RÉCEPTION NOAH
// ==========================================
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

        // Diffusion WebSocket vers tous les clients connectés
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (e) {
        console.error("Erreur MQTT :", e.message);
    }
});

// ==========================================
// API : ROUTES HTTP
// ==========================================

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

// Fonction utilitaire pour le calcul de viabilité
function calculerViabilite(mesures, seuilsAdmin) {
    if (!mesures || mesures.length === 0) {
        return { score: 0, statut: "Inconnu", moyennes: { T_moy: 0, CO2_moy: 0, H_moy: 0 } };
    }

    const { T_min, T_max, CO2_max, H_max } = seuilsAdmin;

    // Logique de moyenne
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

    // Comparaison aux seuils (Admin) et Calcul du Score
    let score = 100;

    // Pénalités
    if (T_moy < T_min) score -= (T_min - T_moy) * 5;
    else if (T_moy > T_max) score -= (T_moy - T_max) * 5;

    if (CO2_moy > CO2_max) score -= ((CO2_moy - CO2_max) / 50);
    if (H_moy > H_max) score -= (H_moy - H_max) * 2;

    score = Math.max(0, Math.min(100, Math.round(score)));

    // Statut
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

app.get('/api/mesures/history', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 100");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (connection) await connection.end(); }
});

app.get('/api/mesures/viabilite', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 50");

        // Seuils Admin par défaut
        const seuilsAdmin = {
            T_min: 5,
            T_max: 35,
            CO2_max: 1000,
            H_max: 70
        };

        const result = calculerViabilite(rows, seuilsAdmin);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (connection) await connection.end(); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifiant, motdepasse } = req.body;
        if (!identifiant || !motdepasse) {
            return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
        }

        const gtk = await fetchGTKToken();
        const response = await ecoleDirecteRequest('/login.awp?v=4.96.3', {
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

        if (data.code === 200 && token1) {
            const compte = data.data.accounts[0];
            return res.json({
                token: token1,
                user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte, email: compte.email || '' }
            });

        } else if (data.code === 250) {
            const questionRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=get&v=4.96.3', {}, {
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
            const token2 = questionRes.data.token || token1;
            const twofa2 = questionRes.headers['2fa-token'] || twofa1;

            sessions2FA[sessionId] = {
                identifiant,
                motdepasse,
                gtk,
                token: token2,
                twoFAToken: twofa2,
                rawPropositions,
                createdAt: Date.now()
            };

            setTimeout(() => { delete sessions2FA[sessionId]; }, 5 * 60 * 1000);

            return res.json({
                twoFactorRequired: true,
                question,
                propositions,
                sessionId
            });

        } else {
            return res.status(401).json({ message: data.message || 'Identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('Erreur login École Directe:', error.message);
        return res.status(500).json({ message: 'Impossible de contacter École Directe.' });
    }
});

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

        const rawAnswer = rawPropositions.find(
            p => Buffer.from(p, 'base64').toString('utf8') === answer
        );

        if (!rawAnswer) {
            return res.status(400).json({ message: 'Réponse invalide. Veuillez sélectionner une proposition.' });
        }

        const ansRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post&v=4.96.3', {
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

        const cn = ansRes.data.data?.cn || '';
        const cv = ansRes.data.data?.cv || '';
        const token3 = ansRes.data.token || token;
        const twofa3 = ansRes.headers['2fa-token'] || twoFAToken;

        const reloginPayload = { identifiant, motdepasse, acceptationCharte: true };
        if (cn && cv) {
            reloginPayload.cn = cn;
            reloginPayload.cv = cv;
        }

        const loginRes = await ecoleDirecteRequest('/login.awp?v=4.96.3', reloginPayload, {
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

// Lancement du serveur via le constructeur 'server' et non 'app'
server.listen(PORT, HOST, () => console.log(`Serveur en ligne : http://${HOST}:${PORT}`));
