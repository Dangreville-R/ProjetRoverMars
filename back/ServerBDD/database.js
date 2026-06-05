<<<<<<< HEAD
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
=======
// chargement des variables d'environnement depuis le fichier .env
require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Classe Database — Gère la connexion à la base de données MySQL.
 * Encapsule le pool de connexions et fournit des méthodes d'accès.
 */
class Database {
    constructor() {
        // création du pool de connexion avec les paramètres du .env
        this._pool = mysql.createPool({
            host: process.env.Serveur_BDD,
            user: process.env.User_BDD,
            password: process.env.Mot_De_Passe_BDD,
            database: process.env.Nom_BDD,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    /**
     * Retourne le pool de connexion MySQL (pour les requêtes via pool.query()).
     * @returns {mysql.Pool}
     */
    getPool() {
        return this._pool;
    }

    /**
     * Crée une connexion directe à la base de données (hors pool).
     * Utilisée par les routes qui gèrent manuellement la connexion.
     * @returns {Promise<mysql.Connection>}
     */
    async getConnection() {
        return mysql.createConnection({
            host: process.env.Serveur_BDD,
            user: process.env.User_BDD,
            password: process.env.Mot_De_Passe_BDD,
            database: process.env.Nom_BDD,
            connectTimeout: 10000
        });
    }

    /**
     * Vérifie que la connexion au pool fonctionne.
     * Affiche un message de succès ou d'erreur dans la console.
     */
    async testConnection() {
        try {
            const connection = await this._pool.getConnection();
            console.log("Connecté à la BDD via pool !");
            connection.release();
        } catch (err) {
            console.error("Erreur de connexion à la BDD :", err.message);
        }
    }
}

// export d'une instance unique (singleton) — test de connexion au chargement
const database = new Database();
database.testConnection();

module.exports = database;
>>>>>>> 454bb72bf1a353f7ffd7ae53e6378e479bc7171f
