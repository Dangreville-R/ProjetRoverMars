// back/ServerBDD/getMesuresBetween.js

const db = require('./database');

/**
 * Récupère les mesures d'un rover entre deux dates.
 * @param {number} idRover - Identifiant du rover
 * @param {Date|string} start - Date de début
 * @param {Date|string} end   - Date de fin
 * @returns {Promise<Array>} [ { temperature, humidite, CO2, date, id_rover }, ... ]
 */
const getMesuresBetween = async (idRover, start, end) => {
  const query = `
    SELECT temperature, humidite, CO2, date, id_rover
    FROM mesures
    WHERE id_rover = ?
      AND date >= ?
      AND date <= ?
    ORDER BY date ASC
  `;

  try {
    const [rows] = await db.query(query, [idRover, start, end]);
    return rows;
  } catch (err) {
    console.error('[getMesuresBetween] Erreur SQL :', err);
    throw err;
  }
};

module.exports = getMesuresBetween;