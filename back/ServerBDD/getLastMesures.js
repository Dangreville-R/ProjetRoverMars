const pool = require('./database');

/**
 * Récupère toutes les mesures des X dernières secondes pour un Rover spécifique.
 * @param {number} rover_id - L'identifiant du rover (ex: 1)
 * @param {number} secondes - Fenêtre de temps glissante (par défaut 60s)
 * @returns {Promise<Array>} Tableau d'objets mesures [ { temperature, humidite, CO2, date, rover_id }, ... ]
 */
async function getLastMesures(rover_id, secondes = 60) {
    //  On utilise "rover_id" à la place de "id_rover"
    const sql = `
        SELECT temperature, humidite, CO2, date, rover_id
        FROM mesures 
        WHERE rover_id = ? 
          AND date >= NOW() - INTERVAL ? SECOND
        ORDER BY date ASC
    `;
    
    try {
        const [rows] = await pool.execute(sql, [rover_id, secondes]);
        return rows; 
    } catch (error) {
        console.error('[getLastMesure] Erreur SQL rencontrée :', error.message);
        throw error;
    }
}

module.exports = getLastMesures;