// Configuration de l'environnement et import des dépendances
require('dotenv').config(); // Charge mon fichier de configuration caché .env
const express = require('express'); // Framework pour créer mes routes API HTTP
const cors = require('cors'); // Middleware pour autoriser mon IHM React à se connecter
const mysql = require('mysql2/promise'); // Client SQL pour communiquer avec MariaDB
const axios = require('axios'); // Client HTTP pour interroger l'API externe d'École Directe
const mqtt = require('mqtt'); // Client MQTT pour intercepter les trames du Rover
const crypto = require('crypto'); // Module natif pour générer des identifiants uniques (UUID)
const http = require('http'); // Serveur HTTP natif de Node.js
const WebSocket = require('ws'); // Module pour la communication temps réel bi-directionnelle

// Imports des modules BDD développés en équipe
const { saveMesure } = require('./ServerBDD/saveMesure');
const getLastMesure = require('./ServerBDD/getLastMesures');

class MarsRoverServer {
    constructor() {
        // 1. Initialisation des composants réseaux et serveurs
        this.app = express();
        this.PORT = process.env.PORT || 3001;
        this.HOST = '0.0.0.0';
        
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        // 2. Initialisation des variables d'état (Propriétés de l'objet)
        this.sessions2FA = {};
        this.adminConfig = {
            T_min: 5,
            T_max: 35,
            CO2_max: 1000,
            H_max: 70,
            frequence: 3
        };

        // 3. Lancement automatique de la configuration
        this.configureMiddleware();
        this.configureRoutes();
        this.initializeWebSockets();
        this.initializeMQTT();
    }

    // Configuration des sécurités et des formats de requêtes
    configureMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    // Méthode de connexion à la base de données distante
    async getConnection() {
        return mysql.createConnection({
            host: process.env.Serveur_BDD,
            user: process.env.User_BDD,
            password: process.env.Mot_De_Passe_BDD,
            database: process.env.Nom_BDD,
            connectTimeout: 10000
        });
    }

    // LOGIQUE ÉCOLE DIRECTE
    async fetchGTKToken() {
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

        const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
        return { gtkHeader: match[1], gtkCookie: cookieHeader };
    }

    async ecoleDirecteRequest(path, payload = {}, extraHeaders = {}) {
        const body = new URLSearchParams({ data: JSON.stringify(payload) }).toString();
        return await axios.post(`https://api.ecoledirecte.com/v3${path}`, body, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                ...extraHeaders
            }
        });
    }

    // --- LOGIQUE TEMPS RÉEL (WebSockets & MQTT) ---
    initializeWebSockets() {
        this.wss.on('connection', (ws) => {
            console.log("Client web connecté en WebSocket");
        });
    }

    initializeMQTT() {
        this.mqttClient = mqtt.connect('mqtt://172.29.17.249');

        this.mqttClient.on('connect', () => {
            console.log("Connecté au Broker MQTT");
            this.mqttClient.subscribe('rover/mesures');
            this.mqttClient.subscribe('Rover/move');
        });

        // Routine principale de réception MQTT liée à l'instance courante via Arrow Function
        this.mqttClient.on('message', async (topic, message) => {
            await this.handleMqttMessage(topic, message);
        });
    }

    async handleMqttMessage(topic, message) {
        try {
            // Interception des commandes de pilotage
            if (topic === 'Rover/move') {
                console.log(`Commande de déplacement App Inventor reçue : ${message.toString()}`);
                return;
            }

            if (topic === 'rover/mesures') {
                const data = JSON.parse(message.toString());
                const { temperature, humidite, co2 } = data;

                // 1. Sauvegarde en BDD (Rôle Étudiant 3)
                try {
                    const connection = await this.getConnection();
                    const sql = "INSERT INTO mesures (temperature, CO2, humidite, date) VALUES (?, ?, ?, NOW())";
                    await connection.execute(sql, [temperature, co2, humidite]);
                    await connection.end();
                    console.log("Données MQTT enregistrées en BDD");
                } catch (dbError) {
                    console.error("Erreur BDD, bascule sur la sauvegarde locale...");
                    saveMesure(data);
                }

                // Structuration enrichie du JSON
                const payload = {
                    donnees: {
                        temperature: Number(temperature),
                        co2: Number(co2),
                        humidite: Number(humidite),
                        date: new Date().toISOString()
                    },
                    statut: (temperature > this.adminConfig.T_max || temperature < this.adminConfig.T_min || co2 > this.adminConfig.CO2_max || humidite > this.adminConfig.H_max) 
                            ? "ALERTE" 
                            : "RAS",
                    timestamp: new Date().toLocaleTimeString()
                };

                // Diffusion instantanée
                this.wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(payload));
                    }
                });
                
                console.log(`Diffusion Temps Réel effectuée. Statut: ${payload.statut}`);
            }
        } catch (e) {
            console.error("Erreur traitement message MQTT :", e.message);
        }
    }

    calculerViabilite(mesures) {
        if (!mesures || mesures.length === 0) {
            return { score: 0, statut: "Inconnu", moyennes: { T_moy: 0, CO2_moy: 0, H_moy: 0 } };
        }
        const { T_min, T_max, CO2_max, H_max } = this.adminConfig;
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

    // --- CONFIGURATION DES ROUTES API (HTTP GET/POST) ---
    configureRoutes() {
        // Route Live
        this.app.get('/api/mesures/live', async (req, res) => {
            let connection;
            try {
                connection = await this.getConnection();
                const [rows] = await connection.execute("SELECT * FROM mesures ORDER BY date DESC LIMIT 1");

                if (rows.length > 0) {
                    const m = rows[0];
                    let alertes = [];
                    if (m.temperature > this.adminConfig.T_max || m.temperature < this.adminConfig.T_min) alertes.push("Température critique !");
                    if (m.CO2 > this.adminConfig.CO2_max) alertes.push("CO2 élevé !");
                    if (m.humidite > this.adminConfig.H_max) alertes.push("Humidité excessive !");

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

        // Route Historique
        this.app.get('/api/mesures/history', async (req, res) => {
            let connection;
            try {
                const { start, end } = req.query;
                connection = await this.getConnection();
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

        // Route Viabilité
        this.app.get('/api/mesures/viabilite', async (req, res) => {
            let connection;
            try {
                const { start, end } = req.query;
                connection = await this.getConnection();
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
                const result = this.calculerViabilite(rows);
                res.json(result);
            } catch (err) {
                res.status(500).json({ error: err.message });
            } finally {
                if (connection) await connection.end();
            }
        });

        // Routes Configuration Admin
        this.app.get('/api/admin/config', (req, res) => {
            res.json(this.adminConfig);
        });

        this.app.post('/api/admin/config', (req, res) => {
            const { T_min, T_max, CO2_max, H_max, frequence } = req.body;
            if (T_min !== undefined) this.adminConfig.T_min = Number(T_min);
            if (T_max !== undefined) this.adminConfig.T_max = Number(T_max);
            if (CO2_max !== undefined) this.adminConfig.CO2_max = Number(CO2_max);
            if (H_max !== undefined) this.adminConfig.H_max = Number(H_max);
            if (frequence !== undefined) this.adminConfig.frequence = Number(frequence);
            console.log('Config admin mise à jour :', this.adminConfig);
            res.json({ message: 'Configuration sauvegardée.', config: this.adminConfig });
        });

        // Route Fenêtre Glissante (Graphique)
        this.app.get('/api/mesures/latest', async (req, res) => {
            try {
                const secondes = parseInt(req.query.secondes) || 60;
                const mesures = await getLastMesure(secondes);
                res.json(mesures);
            } catch (err) {
                console.error('[GET /api/mesures/latest] Erreur :', err);
                res.status(500).json({ message: 'Erreur serveur.' });
            }
        });

        // --- CONTEXTE ÉCOLE DIRECTE (API REST EXTIERNE + 2FA) ---
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { identifiant, motdepasse } = req.body;
                if (!identifiant || !motdepasse) {
                    return res.status(400).json({ message: 'Identifiant et mot de passe obligatoires.' });
                }
                const gtk = await this.fetchGTKToken();
                const response = await this.ecoleDirecteRequest('/login.awp?v=4.96.3', {
                    identifiant, motdepasse, acceptationCharte: true
                }, {
                    'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
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
                    const questionRes = await this.ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=get&v=4.96.3', {}, {
                        'X-Token': token1, '2fa-Token': twofa1, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
                    });
                    const qData = questionRes.data.data || {};
                    const rawQuestion = qData.question || '';
                    const rawPropositions = qData.propositions || [];
                    const question = rawQuestion ? Buffer.from(rawQuestion, 'base64').toString('utf8') : 'Vérification de sécurité';
                    const propositions = rawPropositions.map(p => Buffer.from(p, 'base64').toString('utf8'));
                    const sessionId = crypto.randomUUID();
                    const token2 = questionRes.data.token || token1;
                    const twofa2 = questionRes.headers['2fa-token'] || twofa1;
                    
                    this.sessions2FA[sessionId] = { identifiant, motdepasse, gtk, token: token2, twoFAToken: twofa2, rawPropositions, createdAt: Date.now() };
                    setTimeout(() => { delete this.sessions2FA[sessionId]; }, 5 * 60 * 1000);
                    
                    return res.json({ twoFactorRequired: true, question, propositions, sessionId });
                } else {
                    return res.status(401).json({ message: data.message || 'Identifiant ou mot de passe incorrect.' });
                }
            } catch (error) {
                console.error('Erreur login École Directe:', error.message);
                return res.status(500).json({ message: 'Impossible de contacter École Directe.' });
            }
        });

        this.app.post('/api/auth/login/2fa/verify', async (req, res) => {
            try {
                const { sessionId, answer } = req.body;
                if (!sessionId || !answer) return res.status(400).json({ message: 'Session et réponse obligatoires.' });
                const session = this.sessions2FA[sessionId];
                if (!session) return res.status(401).json({ message: 'Session expirée ou invalide.' });

                const { identifiant, motdepasse, gtk, token, twoFAToken, rawPropositions } = session;
                const rawAnswer = rawPropositions.find(p => Buffer.from(p, 'base64').toString('utf8') === answer);
                if (!rawAnswer) return res.status(400).json({ message: 'Réponse invalide.' });

                const ansRes = await this.ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post&v=4.96.3', { choix: rawAnswer }, {
                    'X-Token': token, '2fa-Token': twoFAToken, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
                });

                if (ansRes.data.code !== 200) return res.status(401).json({ message: 'Réponse 2FA incorrecte.' });

                const cn = ansRes.data.data?.cn || '';
                const cv = ansRes.data.data?.cv || '';
                const loginRes = await this.ecoleDirecteRequest('/login.awp?v=4.96.3', { identifiant, motdepasse, acceptationCharte: true, cn, cv }, {
                    'X-Token': ansRes.data.token || token, '2fa-Token': ansRes.headers['2fa-token'] || twoFAToken, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
                });

                if (loginRes.data.code === 200 && loginRes.data.token) {
                    delete this.sessions2FA[sessionId];
                    const compte = loginRes.data.data.accounts[0];
                    return res.json({ token: loginRes.data.token, user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte } });
                }
                return res.status(401).json({ message: 'Échec final 2FA.' });
            } catch (error) {
                return res.status(500).json({ message: 'Erreur technique 2FA.' });
            }
        });
    }

    // Démarrage effectif du serveur HTTP
    start() {
        this.server.listen(this.PORT, this.HOST, () => {
            console.log(`Serveur en ligne : http://${this.HOST}:${this.PORT}`);
        });
    }
}

// Instanciation de la classe et démarrage du serveur
const marsServer = new MarsRoverServer();
marsServer.start();
