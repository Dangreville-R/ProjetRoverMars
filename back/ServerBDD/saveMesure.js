// 1. Importer le module de connexion (ton pool créé précédemment)
const pool = require('./database'); 

/**
 * 2. Définir les paramètres de la fonction
 * @param {Object} objetJSON - Contient les données envoyées par le Rover
 */
const saveMesure = async (objetJSON) => {
    // Extraction des données de l'objet JSON (Temp, CO2, Humidité, ID du Rover)
    const { temperature, co2, humidite, rover_id } = objetJSON;

    try {
        // Requête SQL d'insertion
        const sql = `
            INSERT INTO mesures (temperature, CO2, humidite, date, rover_id) 
            VALUES (?, ?, ?, NOW(), ?)
        `;

        // Exécution via le pool
        const [result] = await pool.promise().query(sql, [temperature, co2, humidite, rover_id]);
        
        console.log(`✅ Mesure enregistrée ! (ID local: ${result.insertId})`);
        return result.insertId;

    } catch (err) {
        console.error("❌ Erreur lors de l'insertion en BDD :", err.message);
        throw err;
    }
};

// 3. Rendre cette fonction disponible pour les autres fichiers du projet
module.exports = { saveMesure };