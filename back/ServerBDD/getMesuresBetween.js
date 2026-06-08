const pool = require('./database');

/**
 * Récupère les mesures d'un rover spécifique entre deux dates.
 * @param {number} rover_id - L'identifiant du rover (ex: 1)
 * @param {string|Date} start - Date de début (format ISO ou objet Date)
 * @param {string|Date} end - Date de fin (format ISO ou objet Date)
 * @returns {Promise<Array>} Tableau des mesures trouvées
 */
async function getMesuresBetween(rover_id, start, end) {
    // Requête SQL corrigée avec 'rover_id' à la place de 'id_rover'
    const sql = `
        SELECT temperature, humidite, CO2, date, rover_id
        FROM mesures
        WHERE rover_id = ?
          AND date >= ?
          AND date <= ?
        ORDER BY date ASC
    `;

    try {
        // Formatage des dates si ce sont des objets Date
        const startDate = start instanceof Date ? start.toISOString() : start;
        const endDate = end instanceof Date ? end.toISOString() : end;

        // Exécution de la requête avec les 3 paramètres attendus [?]
        const [rows] = await pool.execute(sql, [rover_id, startDate, endDate]);
        return rows;
    } catch (error) {
        console.error('[getMesuresBetween] Erreur SQL rencontré :', error.message);
        throw error;
    }
}

module.exports = getMesuresBetween;