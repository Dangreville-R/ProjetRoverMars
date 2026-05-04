const pool = require('./database'); 
const mesuresService = {
    // Cette fonction est "l'abstraction" qui va gérer l'insertion des données dans la BDD
    sauvegarder: async (data) => {
        const sql = "INSERT INTO mesures (temperature, humidite, co2, date_mesure) VALUES (?, ?, ?, NOW())";
        const values = [data.temperature, data.humidite, data.co2];

        try {
            // On utilise .promise() pour pouvoir utiliser async/await avec mysql2
            await pool.promise().query(sql, values);
            console.log("Donnée enregistrée en BDD");
        } catch (err) {
            console.error("Erreur SQL :", err.message);
        }
    }
};

module.exports = mesuresService;