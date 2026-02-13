// Importation Général 

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mysql = require('mysql2/promise'); // Pour la partie de Raphael (E3)
const app = express();
const cors = require('cors');

// Middleware
app.use(cors()); // Autorise le Front (E1) à communiquer avec le Back (E2)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration Romain (E2)

const PORT = process.env.PORT || 3000;
const API_E3_URL = process.env.API_E3_URL; 
// Exemple : http://172.29.16.157:4000/api


// Routes de Romain (Étudiant 2)

// Route Pour tester le Serveur
app.get('/api/status', (req, res) => {
  res.json({
    status: "online",
    message: "Le Serveur Fonctionne Correctement !!!"
  });
});

// Cette Fonction permet de faire le relais pour Étudiant 2 entre Étudiant 3 et Étudiant 1 
app.get('/api/mesures/history', async (req, res) => {
  try {
    const response = await axios.get(`${API_E3_URL}/mesures/history`);
    res.json(response.data);
  } catch (error) {
    console.error("Erreur D'API :", error.message);
    res.status(500).json({ error: "Connexion Impossible à Raphael" });
  }
});


// Section Étudiant 3 — SQL

// Connexion à la base de données
async function getConnection() {
  return mysql.createConnection({
    host: process.env.Serveur_BDD,
    user: process.env.User_BDD,
    password: process.env.Mot_De_Passe_BDD,
    database: process.env.Nom_BDD
  });
}

// Export pour les scripts externes Raphael (E3)
module.exports = {
  getConnection
};


// Lancement du Serveur sur la VM du projet : 

app.listen(PORT, () => {
  console.log("Le Serveur fonctionne correctement !");
  console.log(`URL : http://172.29.16.157:${PORT}`);
});