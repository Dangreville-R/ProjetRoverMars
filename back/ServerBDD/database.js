// 1. Importer les modules nécessaires
require('dotenv').config(); // Charge les variables du fichier .env
const mysql = require('mysql2/promise'); // Version 'promise' pour utiliser async/await

// 2. Créer le pool de connexion avec les paramètres du .env
const pool = mysql.createPool({
  host: process.env.Serveur_BDD,
  user: process.env.User_BDD,
  password: process.env.Mot_De_Passe_BDD,
  database: process.env.Nom_BDD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * 3. Vérifier la connexion au démarrage
 * On tente de récupérer une connexion du pool pour valider les identifiants
 */
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    // 4. Afficher le message de succès
    console.log(" Connecté à la BDD ! (Projet RoverMars)");
    connection.release(); // Libère la connexion pour qu'elle retourne dans le pool
  } catch (err) {
    console.error(" Erreur de connexion à la base de données :", err.message);
    process.exit(1); // Arrête le script si la BDD est injoignable
  }
}

checkConnection();

/**
 * 5. Rendre le pool accessible aux autres fichiers
 */
module.exports = pool;

/** pour utiliser le pool dans d'autres fichiers: *
 *
 *  const pool = require('./db'); // Importe le pool que l'on vient de créer

async function uneFonction() {
    const [rows] = await pool.query("SELECT * FROM mesures LIMIT 5");
    console.log(rows);
}
 */