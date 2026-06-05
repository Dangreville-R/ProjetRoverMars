// back/ServerBDD/getLastMesure.js

const db = require('./database');

/**
 * Récupère toutes les mesures des N dernières secondes pour un rover donné.
 * @param {number} idRover  - Identifiant du rover
 * @param {number} secondes - Fenêtre temporelle (défaut : 60)
 * @returns {Promise<Array>} [ { temperature, humidite, CO2, date, id_rover }, ... ]
 */
const getLastMesure = async (idRover, secondes = 60) => {
  const query = `
    SELECT temperature, humidite, CO2, date, id_rover
    FROM mesures
    WHERE date >= NOW() - INTERVAL ? SECOND AND id_rover = ?
    ORDER BY date ASC
  `;

  try {
    const [rows] = await db.query(query, [secondes, idRover]);
    return rows;
  } catch (err) {
    console.error('[getLastMesure] Erreur SQL :', err);
    throw err;
  }
};

module.exports = getLastMesure;