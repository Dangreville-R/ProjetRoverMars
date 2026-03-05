require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mysql = require('mysql2/promise'); // pour E3 (Raphaël)

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// configuration port et api
const PORT = process.env.PORT || 3001; 
const API_E3_URL = process.env.API_E3_URL; 

// route pour tester le serveur
app.get('/api/status', (req, res) => {
  res.json({ status: "online", role: "E2 - Gateway Relais", port: PORT });
});

// route relais entrant 
app.post('/api/mesures/save', async (req, res) => {
  try {
    const response = await axios.post(`${API_E3_URL}/mesures/save`, req.body);
    res.json({ message: "relais réussi", data: response.data });
  } catch (error) {
    res.status(500).json({ error: "erreur de transfert vers E3" });
  }
});

// route relais sortant
app.get('/api/mesures/history', async (req, res) => {
  try {
    const response = await axios.get(`${API_E3_URL}/mesures/history`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "erreur récupération historique" });
  }
});

// route authentification via école directe (pour Noah - étudiant 1)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifiant, motdepasse } = req.body;
        if (!identifiant || !motdepasse) {
            return res.status(400).json({ message: 'identifiant et mot de passe obligatoires.' });
        }

        const response = await axios.post(
            'https://api.ecoledirecte.com/v3/login.awp',
            `data=${JSON.stringify({ identifiant, motdepasse })}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'MUSIC-MUSIC'
                }
            }
        );

        const data = response.data;
        if (data.code === 200 && data.token) {
            const compte = data.data.accounts[0];
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
            res.status(401).json({ message: data.message || 'identifiant ou mot de passe incorrect.' });
        }
    } catch (error) {
        console.error('erreur login école directe:', error.message);
        res.status(500).json({ message: 'impossible de contacter école directe.' });
    }
});

// partie Raphaël (étudiant 3) - sql
async function getConnection() {
  return mysql.createConnection({
    host: process.env.Serveur_BDD,
    user: process.env.User_BDD,
    password: process.env.Mot_De_Passe_BDD,
    database: process.env.Nom_BDD
  });
}

// lancement du serveur
const BIND_IP = '0.0.0.0';
app.listen(PORT, BIND_IP, () => {
    console.log(` SERVEUR E2 EN LIGNE`);
    console.log(` Ecoute sur : http://${BIND_IP}:${PORT}`);
});