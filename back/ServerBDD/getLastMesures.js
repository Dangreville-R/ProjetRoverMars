// back/ServerBDD/getLastMesures.js

// On importe la connexion à la base de données configurée avec process.env
const db = require('./database');

/**
 * Récupérer les mesures en temps réel pour l'IHM
 * Récupère toutes les mesures des X dernières secondes pour un Rover donné.
 * @param {number} secondes - Fenêtre de temps glissante (par défaut 60s)
 * @param {number} idRover - Identifiant du rover (par défaut 1)
 * @returns {Promise<Array>} Tableau d'objets [ { temperature, humidite, CO2, date }, ... ]
 */
const getLastMesure = (secondes = 60, idRover = 1) => {
  return new Promise((resolve, reject) => {
    
    // Requête SQL triée par date ascendante pour l'affichage chronologique des graphiques du Front-End
    // On filtre avec INTERVAL pour ne prendre que les données fraîches de la dernière minute
    const query = `
      SELECT temperature, humidite, CO2, date
      FROM mesures
      WHERE date >= NOW() - INTERVAL ? SECOND
      ORDER BY date ASC
    `;

    // Exécution de la requête sur le pool de connexion MariaDB
    db.query(query, [secondes], (err, results) => {
      if (err) {
        console.error('[getLastMesure] Erreur SQL rencontrée :', err);
        return reject(err);
      }

      // Renvoie les lignes trouvées (ou un tableau vide [] si le rover n'a rien envoyé depuis 60s)
      resolve(results); 
    });
  });
};

// Exportation de la fonction pour qu'elle soit exploitable par server.js (Route /api/mesures/latest)
module.exports = getLastMesure;