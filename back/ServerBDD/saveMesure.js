const pool = require('./database');
const fs = require('fs'); 

/**
 * Fonction pour sauvegarder une mesure (avec Plan B en local)
 */
const saveMesure = async (data) => {
    try {
        const sql = `INSERT INTO mesures (temperature, CO2, humidite, date, rover_id) 
                     VALUES (?, ?, ?, NOW(), ?)`;
        const values = [data.temperature, data.co2, data.humidite, data.rover_id];
        
        const [result] = await pool.promise().query(sql, values);
        console.log("Insertion réussie, ID mesure :", result.insertId);
        return result;
    } catch (err) {
        console.error("Erreur lors de l'INSERT, passage au Plan B (Local) :", err.message);
        
        // Logique Conditionnelle : Si BDD en panne = fichier de secours (local)
        const cheminFichier = './ServerBDD/mesures.json';
        let historique = [];

        // 1. On récupère l'ancien contenu s'il existe
        if (fs.existsSync(cheminFichier)) {
            historique = JSON.parse(fs.readFileSync(cheminFichier, 'utf8'));
        }

        // 2. On ajoute la nouvelle mesure avec un timestamp
        const nouvelleMesure = { ...data, date: new Date().toISOString() };
        historique.push(nouvelleMesure);

        // 3. On sauvegarde tout dans le fichier
        fs.writeFileSync(cheminFichier, JSON.stringify(historique, null, 2));
        console.log("Donnée sauvegardée localement dans mesures.json");
    }
};

module.exports = { saveMesure };