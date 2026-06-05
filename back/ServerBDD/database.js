// back/ServerBDD/database.js

require('dotenv').config(); // Charge les variables d'environnement du fichier .env
const mysql = require('mysql2/promise'); // Version PROMISE obligatoire pour l'IHM et async/await

// 1. Création du pool de connexion asynchrone vers la machine MariaDB distante
const pool = mysql.createPool({
  host: process.env.Serveur_BDD,        // Récupère la vraie IP de la machine BDD
  user: process.env.User_BDD,           // Récupère l'utilisateur (rovermars_user)
  password: process.env.Mot_De_Passe_BDD, // Récupère le mot de passe
  database: process.env.Nom_BDD,         // Récupère le nom de la base de données
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Vérification immédiate de la connexion au démarrage du serveur (façon Promise)
pool.getConnection()
  .then((connection) => {
    console.log("✅ Connecté avec succès à la base de données MariaDB distante !");
    connection.release(); // Libère immédiatement la connexion pour ne pas bloquer le pool
  })
  .catch((err) => {
    console.error("❌ Erreur critique de connexion à la BDD :", err.message);
    console.error("Vérifie l'IP dans ton .env ou si la machine distante accepte les connexions.");
  });

// 3. On exporte le pool pour qu'il soit utilisé par getLastMesures.js et saveMesure.js
module.exports = pool;