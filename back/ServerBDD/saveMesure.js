// On importe le pool depuis ton fichier database.js
const pool = require('./database'); 

/**
 * Fonction pour sauvegarder une mesure
 * @param {Object} data - L'objet JSON (temp, co2, humidite, rover_id)
 */
const saveMesure = async (data) => {
    try {
        const sql = `INSERT INTO mesures (temperature, CO2, humidite, date, rover_id) 
                     VALUES (?, ?, ?, NOW(), ?)`;
        
        const values = [data.temperature, data.co2, data.humidite, data.rover_id];

        // .promise() est nécessaire si tu as créé un pool standard
        const [result] = await pool.promise().query(sql, values);
        console.log("Insertion réussie, ID mesure :", result.insertId);
        return result;
    } catch (err) {
        console.error("Erreur lors de l'INSERT :", err.message);
    }
};

module.exports = { saveMesure };