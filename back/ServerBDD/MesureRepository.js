/**
 * Classe MesureRepository — Gère toutes les opérations BDD liées aux mesures.
 * Regroupe la sauvegarde et la récupération des mesures capteurs.
 */
class MesureRepository {
    /**
     * @param {import('./database')} database - Instance de la classe Database
     */
    constructor(database) {
        this._database = database;
    }

    /**
     * Sauvegarde une mesure dans la base de données (via le pool).
     * Gère les différents noms de champs possibles (temperature/temp, co2/CO2, humidite/hum).
     * @param {Object} data - L'objet JSON contenant les données capteur
     * @returns {Promise<Object|undefined>} Le résultat de l'insertion ou undefined en cas d'erreur
     */
    async saveMesure(data) {
        try {
            const sql = `INSERT INTO mesures (temperature, CO2, humidite, date, rover_id) 
                         VALUES (?, ?, ?, NOW(), ?)`;

            const temp = data.temperature ?? data.temp;
            const co2 = data.co2 ?? data.CO2;
            const hum = data.humidite ?? data.hum;
            const values = [temp, co2, hum, data.rover_id || null];

            // utilisation directe du pool mysql2/promise
            const [result] = await this._database.getPool().query(sql, values);
            console.log("Insertion réussie, ID mesure :", result.insertId);
            return result;
        } catch (err) {
            console.error("Erreur lors de l'INSERT :", err.message);
        }
    }

    /**
     * Récupère toutes les mesures des N dernières secondes.
     * @param {number} secondes - Fenêtre temporelle en secondes (défaut: 60)
     * @returns {Promise<Array>} [ { temperature, humidite, CO2, date }, ... ]
     */
    async getLastMesures(secondes = 60) {
        const query = `
          SELECT temperature, humidite, CO2, date
          FROM mesures
          WHERE date >= NOW() - INTERVAL ? SECOND
          ORDER BY date ASC
        `;

        try {
            const [results] = await this._database.getPool().query(query, [secondes]);
            return results; // tableau vide [] si aucune mesure sur la fenêtre
        } catch (err) {
            console.error('[getLastMesure] Erreur SQL :', err);
            throw err;
        }
    }
}

module.exports = MesureRepository;
