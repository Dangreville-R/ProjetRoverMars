// back/ServerBDD/saveDeplacement.js
const pool = require('./database');

/**
 * Met à jour la position du rover en base de données
 * @param {Object} data - { id_rover, posX, posY }
 */
const savePosition = async (data) => {
    try {
        const sql = `
            UPDATE rover
            SET posX = ?, posY = ?
            WHERE id_rover = ?
        `;

        const values = [data.posX, data.posY, data.id_rover];

        const [result] = await pool.promise().query(sql, values);
        console.log("Position mise à jour pour le rover :", data.id_rover);
        return result;

    } catch (err) {
        console.error("Erreur lors de la mise à jour de la position :", err.message);
    }
};

/**
 * Récupère la position actuelle d'un rover
 * @param {number} idRover - L'identifiant du rover
 */
const getPosition = async (idRover) => {
    try {
        const sql = `
            SELECT posX, posY
            FROM rover
            WHERE id_rover = ?
        `;

        const [rows] = await pool.promise().execute(sql, [idRover]);
        return rows[0] ?? null;

    } catch (err) {
        console.error("Erreur lors de la récupération de la position :", err.message);
        return null;
    }
};

module.exports = { savePosition, getPosition };