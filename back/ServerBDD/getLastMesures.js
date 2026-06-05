// back/ServerBDD/getLastMesures.js
const pool = require('./database');

/**
 * Récupère toutes les mesures des X dernières secondes pour l'IHM React.
 * @param {number} secondes - Fenêtre de temps glissante (par défaut 60s)
 * @returns {Promise<Array>} Tableau d'objets mesures [ { temperature, humidite, CO2, date }, ... ]
 */
async function getLastMesures(secondes = 60) {
    // Requête SQL triée par date ascendante pour l'affichage chronologique des graphiques du Front-End
    const sql = `
        SELECT temperature, humidite, CO2, date 
        FROM mesures 
        WHERE date >= NOW() - INTERVAL ? SECOND
        ORDER BY date ASC
    `;
    
    try {
        // Exécution de la requête sur le pool de connexion MariaDB (version async/await)
        const [rows] = await pool.execute(sql, [secondes]);
        return rows; 
    } catch (error) {
        console.error('[getLastMesure] Erreur SQL rencontrée :', error.message);
        throw error;
    }
}

// Exportation de la fonction pour qu'elle soit exploitable par server.js (Route /api/mesures/latest)
module.exports = getLastMesures;
