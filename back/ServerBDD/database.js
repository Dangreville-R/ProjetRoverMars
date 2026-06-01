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