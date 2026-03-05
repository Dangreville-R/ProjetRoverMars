require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Session } = require('api-ecoledirecte');

const tempSessions = new Map();
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