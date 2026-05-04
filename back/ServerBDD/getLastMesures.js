// back/ServerBDD/getLastMesure.js
 
const db = require('./database');
 
/**
 * Récupère toutes les mesures des 60 dernières secondes.
 * @returns {Promise<Array>} [ { temperature, humidite, CO2, created_at }, ... ]
 */
const getLastMesure = (secondes = 60) => {
  return new Promise((resolve, reject) => {
    // ⚠️ Adapte "mesures" et "created_at" selon ton vrai schéma
    const query = `
      SELECT temperature, humidite, CO2, created_at
      FROM mesures
      WHERE created_at >= NOW() - INTERVAL ? SECOND
      ORDER BY created_at ASC
    `;
 
    db.query(query, [secondes], (err, results) => {
      if (err) {
        console.error('[getLastMesure] Erreur SQL :', err);
        return reject(err);
      }
 
      resolve(results); // tableau vide [] si aucune mesure sur la fenêtre
    });
  });
};
 
module.exports = getLastMesure;
 