require('dotenv').config();
const { getConnection } = require('../server');

// Fonction d'insertion d'une mesure
async function insertMesure(connection, temperature, co2, humidite, date, roverId) {
  const sql = `
    INSERT INTO mesures (temperature, CO2, humidite, date, rover_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  await connection.query(sql, [temperature, co2, humidite, date, roverId]);
}

// Fonction de génération de données fictives
async function generateFakeData() {
  const connection = await getConnection();
  console.log("Connecté à la base de données !");

  const roverId = 1;
  const totalMesures = 100;
  const now = new Date();
  const intervalleMs = (24 * 60 * 60 * 1000) / totalMesures;

  console.log(`Génération de ${totalMesures} mesures...`);

  for (let i = 0; i < totalMesures; i++) {
    const mesureDate = new Date(now.getTime() - (24 * 60 * 60 * 1000) + (i * intervalleMs));

    const temperature = Math.floor(Math.random() * 61) - 40;
    const co2 = Math.floor(Math.random() * 500) + 800;
    const humidite = Math.floor(Math.random() * 11) + 5;

    await insertMesure(connection, temperature, co2, humidite, mesureDate, roverId);
  }

  console.log(`${totalMesures} mesures insérées avec succès.`);
  await connection.end();
  console.log("Connexion fermée.");
}

console.log("Lancement du script de génération de fausses données...");

generateFakeData()
  .then(() => {
    console.log("Script terminé avec succès !");
    process.exit(0);
  })
  .catch(err => {
    console.error("Erreur lors de la génération :", err);
    process.exit(1);
  }); 