require('dotenv').config();
const mysql = require('mysql2'); // On utilise la version standard pour correspondre à tes étapes

// 1. Créer le pool de connexion
const pool = mysql.createPool({
  host: process.env.Serveur_BDD,
  user: process.env.User_BDD,
  password: process.env.Mot_De_Passe_BDD,
  database: process.env.Nom_BDD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Ajouter un pool.getConnection() pour vérifier la réponse
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Erreur de connexion à la BDD :", err.message);
    return;
  }
  // 3. Afficher le message en cas de succès
  console.log("Connecté à la BDD !");
  
  // Important : on libère la connexion après le test
  connection.release();
});

// 4. Rendre le pool accessible (module.exports)
module.exports = pool;

/** pour utiliser le pool dans d'autres fichiers: *
 *
 *  const pool = require('./db'); // Importe le pool que l'on vient de créer

async function uneFonction() {
    const [rows] = await pool.query("SELECT * FROM mesures LIMIT 5");
    console.log(rows);
}
 */