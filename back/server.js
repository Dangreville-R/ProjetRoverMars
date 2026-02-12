// ===============================
// IMPORTS
// ===============================
const express = require('express');
const axios = require('axios');
require('dotenv').config();

// ===============================
// CONFIGURATION
// ===============================
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// URL de l'API interne de l'étudiant 3 (E3)
const API_E3 = process.env.API_E3_URL; 
// Exemple dans .env : API_E3_URL=http://172.29.16.157:4000/api

// ===============================
// ROUTES API
// ===============================

// Route de test
app.get('/api/status', (req, res) => {
    res.json({
        status: "online",
        message: "Serveur E2 opérationnel"
    });
});

// Réception des données du rover (E1) → Transmission à E3
app.post('/api/mesures/save', async (req, res) => {
    try {
        const mesures = req.body;
        console.log("📥 Mesures reçues de E1 :", mesures);

        // Transmission à E3
        await axios.post(`${API_E3}/save`, mesures);

        res.status(200).json({ message: "Mesures transmises à E3 avec succès" });
    } catch (error) {
        console.error("❌ Erreur API E3 :", error.message);
        res.status(500).json({ error: "Impossible de contacter l'API E3" });
    }
});

// ===============================
// Lancement du serveur
// ===============================
app.listen(PORT, () => {
    console.log(`🚀 Serveur E2 lancé sur le port ${PORT}`);
});
