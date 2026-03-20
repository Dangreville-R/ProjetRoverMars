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

// création de l'application Express et configuration des middlewares
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// configuration du réseau (port et adresse)
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// création serveur HTTP et le serveur WebSocket2
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// stockage des sessions de double authentification dans un objet
const sessions2FA = {};

// configuration admin modifiable (les seuils et la fréquence)
let adminConfig = {
    T_min: 5,
    T_max: 35,
    CO2_max: 1000,
    H_max: 70,
    frequence: 3
};

// récupération du token GTK depuis l'API école directe
// le token GTK est nécessaire pour s'authentifier
async function fetchGTKToken() {
    // requête GET pour récupérer le token
    const response = await axios.get('https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
    });

    // récupération des cookies de la réponse
    const setCookie = response.headers['set-cookie'];
    if (!setCookie) throw new Error('Impossible de récupérer le token GTK.');

    // recherche du cookie GTK dans les cookies
    const allCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    const match = allCookies.match(/GTK=([^;]+)/);
    if (!match) throw new Error('Token GTK introuvable dans les cookies.');

    // on retourne le token et les cookies
    const gtkValue = match[1];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    return { gtkHeader: gtkValue, gtkCookie: cookieHeader };
}

// envoie une requête POST à l'API école directe
// on l'utilise pour se connecter et pour la double authentification
async function ecoleDirecteRequest(path, payload = {}, extraHeaders = {}) {
    // transformation des données en format URL (c'est ce que l'API attend)
    const body = new URLSearchParams({ data: JSON.stringify(payload) }).toString();

    // envoie la requête POST
    const response = await axios.post(`https://api.ecoledirecte.com/v3${path}`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            ...extraHeaders
        }
    });
    return response;
}

// création d'une connexion à la base de données MySQL
// utilisation des variables d'environnement pour les identifiants
async function getConnection() {
    return mysql.createConnection({
        host: process.env.Serveur_BDD,
        user: process.env.User_BDD,
        password: process.env.Mot_De_Passe_BDD,
        database: process.env.Nom_BDD,
        connectTimeout: 10000
    });
}

// quand un client se connecte en WebSocket, on affiche un message
wss.on('connection', (ws) => {
    console.log("Client web connecté en WebSocket");
});

// connexion au broker MQTT pour recevoir les données du rover
const mqttClient = mqtt.connect('mqtt://172.29.17.249');

// quand on est connecté au broker, on s'abonne au topic du rover
mqttClient.on('connect', () => {
    console.log("Connecté au Broker MQTT");
    mqttClient.subscribe('rover/mesures');
});

// réception d'un message MQTT du rover
mqttClient.on('message', async (topic, message) => {
    try {
        // conversion du message en objet JavaScript
        const data = JSON.parse(message.toString());
        const { temperature, humidite, co2 } = data;

        // enregistrement des données dans la base de données
        const connection = await getConnection();
        const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
        await connection.execute(sql, [temperature, co2, humidite]);
        await connection.end();
        console.log("Données MQTT enregistrées en BDD");

        // vérification si les valeurs dépassent les seuils (comme l'API /live)
        let alertes = [];
        if (temperature > adminConfig.T_max || temperature < adminConfig.T_min) alertes.push("Température critique !");
        if (co2 > adminConfig.CO2_max) alertes.push("CO2 élevé !");
        if (humidite > adminConfig.H_max) alertes.push("Humidité excessive !");

        // on prépare l'objet qu'on envoie aux websockets
        const payload = {
            donnees: { temperature, humidite, CO2: co2 },
            messages: alertes,
            statut: alertes.length === 0 ? "RAS" : "ALERTE"
        };

        // envoie des données à tous les clients connectés en WebSocket
        // mise a jour automatique du dashboard en temps réel
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(payload));
            }
        });
    } catch (e) {
        console.error("Erreur MQTT :", e.message);
    }
});

// --- ROUTES API ---

// route pour récupérer la dernière mesure en temps réel
app.get('/api/mesures/live', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        // récupération de la dernière mesure de la BDD
        const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 1");

        if (rows.length > 0) {
            const m = rows[0];

            // vérification si les valeurs dépassent les seuils
            let alertes = [];
            if (m.temperature > 35 || m.temperature < 5) alertes.push("Température critique !");
            if (m.CO2 > 1000) alertes.push("CO2 élevé !");
            if (m.humidite > 70) alertes.push("Humidité excessive !");

            // renvoie des données avec les alertes
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

// calcul du score de viabilité à partir des mesures
// prend en paramètre les mesures et les seuils définis par l'admin
function calculerViabilite(mesures, seuilsAdmin) {
    // si pas de mesures, on retourne un score de 0
    if (!mesures || mesures.length === 0) {
        return { score: 0, statut: "Inconnu", moyennes: { T_moy: 0, CO2_moy: 0, H_moy: 0 } };
    }

    // récupération des seuils
    const { T_min, T_max, CO2_max, H_max } = seuilsAdmin;

    // calcul de la somme de chaque valeur pour faire la moyenne après
    let sumT = 0, sumCO2 = 0, sumH = 0;
    mesures.forEach(m => {
        sumT += Number(m.temperature);
        sumCO2 += Number(m.CO2);
        sumH += Number(m.humidite);
    });

    // calcul des moyennes
    const total = mesures.length;
    const T_moy = sumT / total;
    const CO2_moy = sumCO2 / total;
    const H_moy = sumH / total;

    // commence avec un score de 100 et enlève des points
    // si les moyennes dépassent les seuils
    let score = 100;

    // pénalité pour la température (trop basse ou trop haute)
    if (T_moy < T_min) score -= (T_min - T_moy) * 5;
    else if (T_moy > T_max) score -= (T_moy - T_max) * 5;

    // pénalité pour le CO2 (trop élevé)
    if (CO2_moy > CO2_max) score -= ((CO2_moy - CO2_max) / 50);

    // pénalité pour l'humidité (trop élevée)
    if (H_moy > H_max) score -= (H_moy - H_max) * 2;

    // s'assure que le score reste entre 0 et 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // détermine le statut en fonction du score
    let statut = "Favorable";
    if (score < 50) statut = "Inhospitalier";
    else if (score <= 80) statut = "Limite";

    // retourne le résultat
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

// récupération de l'historique des mesures
// filtre par date avec les paramètres "start" et "end"
app.get('/api/mesures/history', async (req, res) => {
    let connection;
    try {
        // récupération des dates de début et fin (si elles sont passées)
        const { start, end } = req.query;
        connection = await getConnection();
        let sql = "SELECT * FROM mesures";
        let params = [];

        // si des dates sont passées, on filtre les résultats
        if (start && end) {
            sql += " WHERE date BETWEEN ? AND ?";
            params = [start, end];
        }

        // tri par date et limite à 100 résultats
        sql += " ORDER BY date DESC LIMIT 100";
        const [rows] = await connection.execute(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// calcul de la viabilité
// filtre par date avec "start" et "end"
app.get('/api/mesures/viabilite', async (req, res) => {
    let connection;
    try {
        const { start, end } = req.query;
        connection = await getConnection();
        let sql = "SELECT * FROM mesures";
        let params = [];
        let limit = 50;

        // si on a des dates, on filtre et on prend plus de mesures
        if (start && end) {
            sql += " WHERE date BETWEEN ? AND ?";
            params = [start, end];
            limit = 500;
        }

        sql += ` ORDER BY date DESC LIMIT ${limit}`;
        const [rows] = await connection.execute(sql, params);

        // calcul de la viabilité avec les seuils de l'admin
        const result = calculerViabilite(rows, adminConfig);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.end();
    }
});

// récupération de la configuration admin actuelle
app.get('/api/admin/config', (req, res) => {
    res.json(adminConfig);
});

// modification de la configuration admin
// réception des nouvelles valeurs dans le body de la requête
app.post('/api/admin/config', (req, res) => {
    const { T_min, T_max, CO2_max, H_max, frequence } = req.body;

    // met à jour seulement les valeurs qui sont envoyées
    if (T_min !== undefined) adminConfig.T_min = Number(T_min);
    if (T_max !== undefined) adminConfig.T_max = Number(T_max);
    if (CO2_max !== undefined) adminConfig.CO2_max = Number(CO2_max);
    if (H_max !== undefined) adminConfig.H_max = Number(H_max);
    if (frequence !== undefined) adminConfig.frequence = Number(frequence);

    console.log('Config admin mise à jour :', adminConfig);
    res.json({ message: 'Configuration sauvegardée.', config: adminConfig });
});

// --- ROUTES ECOLE DIRECTE ---

// connexion à école directe
app.post('/api/auth/login', async (req, res) => {
    try {
        // récupération de l'identifiant et du mot de passe
        const { identifiant, motdepasse } = req.body;
        if (!identifiant || !motdepasse) {
            return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
        }

        // récupération du token GTK (nécessaire pour l'authentification)
        const gtk = await fetchGTKToken();

        // envoie de la requête de connexion à école directe
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

        // cas 1 : connexion réussie directement (code 200)
        if (data.code === 200 && token1) {
            const compte = data.data.accounts[0];
            return res.json({
                token: token1,
                user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte, email: compte.email || '' }
            });

            // cas 2 : double authentification requise (code 250)
        } else if (data.code === 250) {
            // récupération de la question de sécurité
            const questionRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=get&v=4.96.3', {}, {
                'X-Token': token1,
                '2fa-Token': twofa1,
                'X-Gtk': gtk.gtkHeader,
                'Cookie': gtk.gtkCookie
            });

            const qData = questionRes.data.data || {};
            const rawQuestion = qData.question || '';
            const rawPropositions = qData.propositions || [];

            // décodage de la question et des propositions (elles sont en base64)
            const question = rawQuestion ? Buffer.from(rawQuestion, 'base64').toString('utf8') : 'Vérification de sécurité';
            const propositions = rawPropositions.map(p => Buffer.from(p, 'base64').toString('utf8'));

            // création d'une session pour stocker les infos de connexion
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

            // la session expire après 5 minutes
            setTimeout(() => { delete sessions2FA[sessionId]; }, 5 * 60 * 1000);

            // renvoie la question au front
            return res.json({
                twoFactorRequired: true,
                question,
                propositions,
                sessionId
            });

            // cas 3 : erreur de connexion
        } else {
            return res.status(401).json({ message: data.message || 'Identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('Erreur login École Directe:', error.message);
        return res.status(500).json({ message: 'Impossible de contacter École Directe.' });
    }
});

// vérification de la réponse à la double authentification
app.post('/api/auth/login/2fa/verify', async (req, res) => {
    try {
        // récupération de la session et de la réponse choisie par l'utilisateur
        const { sessionId, answer } = req.body;
        if (!sessionId || !answer) {
            return res.status(400).json({ message: 'Session et réponse obligatoires.' });
        }

        // vérification que la session existe toujours
        const session = sessions2FA[sessionId];
        if (!session) {
            return res.status(401).json({ message: 'Session expirée ou invalide. Reconnectez-vous.' });
        }

        const { identifiant, motdepasse, gtk, token, twoFAToken, rawPropositions } = session;

        // récupération de la réponse en base64 qui correspond au texte choisi
        const rawAnswer = rawPropositions.find(
            p => Buffer.from(p, 'base64').toString('utf8') === answer
        );

        if (!rawAnswer) {
            return res.status(400).json({ message: 'Réponse invalide. Veuillez sélectionner une proposition.' });
        }

        // envoie de la réponse à école directe
        const ansRes = await ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post&v=4.96.3', {
            choix: rawAnswer
        }, {
            'X-Token': token,
            '2fa-Token': twoFAToken,
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        // si la réponse est incorrecte
        if (ansRes.data.code !== 200) {
            return res.status(401).json({ message: ansRes.data.message || 'Réponse 2FA incorrecte.' });
        }

        // récupération des infos pour la reconnexion finale
        const cn = ansRes.data.data?.cn || '';
        const cv = ansRes.data.data?.cv || '';
        const token3 = ansRes.data.token || token;
        const twofa3 = ansRes.headers['2fa-token'] || twoFAToken;

        // reconnexion finale avec les infos de la 2FA
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

        // si la reconnexion est réussie, on renvoie le token et les infos
        if (finalData.code === 200 && finalData.token) {
            // suppression de la session 2FA car elle n'est plus utile
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

// démarrage du serveur sur le port et l'adresse configurés
server.listen(PORT, HOST, () => console.log(`Serveur en ligne : http://${HOST}:${PORT}`));


