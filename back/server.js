// chargement des variables d'environnement depuis le fichier .env
require('dotenv').config();

// importation des modules nécessaires
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
const mqtt = require('mqtt');
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');
const { saveMesure } = require('./ServerBDD/saveMesure');
const fs = require('fs');
const mesuresService = require('./ServerBDD/mesuresService');

// création de l'application Express et configuration des middlewares
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURATION RÉSEAU ---
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// --- CRÉATION DU SERVEUR UNIQUE ---
const server = http.createServer(app);

// Initialisation de Socket.io
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- GESTION DES CONNEXIONS ---
io.on('connection', (socket) => {
    console.log(`🔌 Nouveau client connecté : ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`❌ Client déconnecté : ${socket.id}`);
    });
});

// Initialisation de WebSocket (wss) pour l'étudiant 2
const wss = new WebSocket.Server({ server });

// stockage des sessions de double authentification dans un objet
const sessions2FA = {};

// Variables globales pour la position du rover ---
let posX = 0; 
let posY = 0;

// configuration admin modifiable (les seuils et la fréquence)
let adminConfig = {
    T_min: 5,
    T_max: 35,
    CO2_max: 1000,
    H_max: 70,
    frequence: 3
};

// récupération du token GTK depuis l'API école directe
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

async function getConnection() {
    return mysql.createConnection({
        host: process.env.Serveur_BDD,
        user: process.env.User_BDD,
        password: process.env.Mot_De_Passe_BDD,
        database: process.env.Nom_BDD,
        connectTimeout: 10000
    });
}

// quand un client se connecte en WebSocket
wss.on('connection', (ws) => {
    console.log("Client web connecté en WebSocket");
});

// connexion au broker MQTT
const mqttClient = mqtt.connect('mqtt://localhost');

mqttClient.on('connect', () => {
    console.log("✅ Broker MQTT connecté !");
    mqttClient.subscribe('#'); 
});

// GESTION DES MESSAGES MQTT 
mqttClient.on('message', async (topic, message) => {
    const rawMessage = message.toString();
    console.log(`📩 Message reçu sur ${topic} : ${rawMessage}`);
        
    // Cette ligne envoie la donnée à tous les navigateurs connectés
   try {
    const data = JSON.parse(rawMessage);
    io.emit('mqtData', { topic, data }); // Envoie l'objet JSON directement
    } catch (e) {
    io.emit('mqtData', { topic, message: rawMessage }); // Envoie le texte si c'est pas du JSON
}
    // --- CAS 1 : COMMANDE DE MOUVEMENT (ÉTUDIANT 2) ---
    if (topic === 'Rover/move') {
        const commande = rawMessage;
        
        // Calcul des coordonnées 2D
        if (commande === "Avance") posY++;
        if (commande === "Recule") posY--;
        if (commande === "Gauche") posX--;
        if (commande === "Droite") posX++;

        console.log(`📍 Position calculée -> X: ${posX}, Y: ${posY}`);

        // Mise à jour de la BDD (Table 'rover')
        let conn;
        try {
            conn = await getConnection();
            await conn.execute(
                "UPDATE rover SET pos_x = ?, pos_y = ? WHERE id = 1", 
                [posX, posY]
            );
            console.log("💾 Position sauvegardée en BDD");
        } catch (err) {
            console.error("❌ Erreur MAJ Position BDD :", err.message);
        } finally {
            if (conn) await conn.end();
        }

        // Diffusion de la position via WebSocket
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "POSITION", x: posX, y: posY }));
            }
        });
    }

    // --- CAS 2 : DONNÉES CAPTEURS (ÉTUDIANT 3) ---
    // On suppose que le rover envoie ses capteurs sur un autre topic ou via un JSON spécifique
    // Si tes capteurs arrivent aussi sur 'Rover / move' sous forme de JSON, ce bloc s'exécute :
    if (rawMessage.includes('{')) { 
        try {
            const data = JSON.parse(rawMessage);
            const { temperature, humidite, co2 } = data;

            let conn;
            try {
                conn = await getConnection();
                const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
                await conn.execute(sql, [temperature, co2, humidite]);
                console.log("Données MQTT enregistrées en BDD");
            } catch (dbError) {
                console.error("Erreur BDD, sauvegarde locale...");
                saveMesure(data);
            } finally {
                if (conn) await conn.end();
            }

            // Structuration pour le Front
            const payload = {
                donnees: {
                    temperature: Number(temperature),
                    co2: Number(co2),
                    humidite: Number(humidite),
                    date: new Date().toISOString()
                },
                statut: (temperature > adminConfig.T_max || temperature < adminConfig.T_min || co2 > adminConfig.CO2_max || humidite > adminConfig.H_max) 
                        ? "ALERTE" : "RAS",
                position: { x: posX, y: posY }, // On inclut la position actuelle
                timestamp: new Date().toLocaleTimeString()
            };

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(payload));
                }
            });
        } catch (e) {
            // Si ce n'est pas un JSON, on ignore l'erreur de parsing (c'est probablement une commande texte)
        }
    }
});

// --- ROUTES API ---

app.get('/api/mesures/live', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 1");

        if (rows.length > 0) {
            const m = rows[0];
            let alertes = [];
            if (m.temperature > adminConfig.T_max || m.temperature < adminConfig.T_min) alertes.push("Température critique !");
            if (m.CO2 > adminConfig.CO2_max) alertes.push("CO2 élevé !");
            if (m.humidite > adminConfig.H_max) alertes.push("Humidité excessive !");

            res.json({ donnees: m, messages: alertes, statut: alertes.length === 0 ? "RAS" : "ALERTE", position: {x: posX, y: posY} });
        } else {
            res.status(404).json({ message: "Vide" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

function calculerViabilite(mesures, seuilsAdmin) {
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

app.get('/api/mesures/history', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        let sql = "SELECT * FROM mesures ORDER BY date DESC LIMIT 100";
        const [rows] = await connection.execute(sql);
        res.json(rows);
    } catch (err) {
        // Logique Conditionel : Si BDD en panne = fichier de secours (local)
        console.error("Échec BDD, lecture du fichier de secours...");
        
        if (fs.existsSync('./ServerBDD/mesures.json')) { // Adapte le chemin vers ton fichier
            const localData = JSON.parse(fs.readFileSync('./ServerBDD/mesures.json', 'utf8'));
            res.json(localData); 
        } else {
            res.status(500).json({ error: "BDD et Fichier local indisponibles" });
        }
    } finally {
        if (connection) await connection.end();
    }
});

app.get('/api/mesures/viabilite', async (req, res) => {
    let connection;
    try {
        const { start, end } = req.query;
        connection = await getConnection();
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
        const result = calculerViabilite(rows, adminConfig);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

app.get('/api/admin/config', (req, res) => {
    res.json(adminConfig);
});

app.post('/api/admin/config', (req, res) => {
    const { T_min, T_max, CO2_max, H_max, frequence } = req.body;
    if (T_min !== undefined) adminConfig.T_min = Number(T_min);
    if (T_max !== undefined) adminConfig.T_max = Number(T_max);
    if (CO2_max !== undefined) adminConfig.CO2_max = Number(CO2_max);
    if (H_max !== undefined) adminConfig.H_max = Number(H_max);
    if (frequence !== undefined) adminConfig.frequence = Number(frequence);
    console.log('Config admin mise à jour :', adminConfig);
    res.json({ message: 'Configuration sauvegardée.', config: adminConfig });
});

// --- ROUTES ECOLE DIRECTE ---

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
            sessions2FA[sessionId] = { identifiant, motdepasse, gtk, token: token2, twoFAToken: twofa2, rawPropositions, createdAt: Date.now() };
            setTimeout(() => { delete sessions2FA[sessionId]; }, 5 * 60 * 1000);
            return res.json({ twoFactorRequired: true, question, propositions, sessionId });
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
        if (!sessionId || !answer) return res.status(400).json({ message: 'Session et réponse obligatoires.' });
        const session = sessions2FA[sessionId];
        if (!session) return res.status(401).json({ message: 'Session expirée ou invalide.' });

        const { identifiant, motdepasse, gtk, token, twoFAToken, rawPropositions } = session;
        const rawAnswer = rawPropositions.find(p => Buffer.from(p, 'base64').toString('utf8') === answer);
        if (!rawAnswer) return res.status(400).json({ message: 'Réponse invalide.' });

        const ansRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post&v=4.96.3', { choix: rawAnswer }, {
            'X-Token': token, '2fa-Token': twoFAToken, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
        });

        if (ansRes.data.code !== 200) return res.status(401).json({ message: 'Réponse 2FA incorrecte.' });

        const cn = ansRes.data.data?.cn || '';
        const cv = ansRes.data.data?.cv || '';
        const loginRes = await ecoleDirecteRequest('/login.awp?v=4.96.3', { identifiant, motdepasse, acceptationCharte: true, cn, cv }, {
            'X-Token': ansRes.data.token || token, '2fa-Token': ansRes.headers['2fa-token'] || twoFAToken, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
        });

        if (loginRes.data.code === 200 && loginRes.data.token) {
            delete sessions2FA[sessionId];
            const compte = loginRes.data.data.accounts[0];
            return res.json({ token: loginRes.data.token, user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte } });
        }
        return res.status(401).json({ message: 'Échec final 2FA.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erreur technique 2FA.' });
    }
});

// démarrage du serveur
server.listen(PORT, HOST, () => console.log(`Serveur en ligne : http://${HOST}:${PORT}`));