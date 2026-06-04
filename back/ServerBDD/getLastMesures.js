<<<<<<< HEAD
// ────────────────────────────────────────────────────────────────
// Fichier de compatibilité — la logique a été déplacée dans MesureRepository.js
// Ce fichier maintient l'ancien format d'export : module.exports = function
// ────────────────────────────────────────────────────────────────
const MesureRepository = require('./MesureRepository');
const database = require('./database');

const repository = new MesureRepository(database);

module.exports = (secondes) => repository.getLastMesures(secondes);
=======
// back/ServerBDD/getLastMesure.js
 
const db = require('./database');
 
/**
 * Récupère toutes les mesures des 60 dernières secondes.
 * @returns {Promise<Array>} [ { temperature, humidite, CO2, date }, ... ]
 */
const getLastMesure = (secondes = 60) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT temperature, humidite, CO2, date, id_rover
      FROM mesures
      WHERE date >= NOW() - INTERVAL ? SECOND AND id_rover = ?
      ORDER BY date ASC
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
 
>>>>>>> 7b4fd5bcc9bbac790b07f988f1f0697a915bcd3a
