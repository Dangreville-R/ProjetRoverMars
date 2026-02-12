require('dotenv').config({ path: '../back/.env' });
const mysql = require('mysql2/promise'); // Version promise pour async/await

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.Port,
    user: process.env.User_BDD,
    password: process.env.Mot_De_Passe_BDD,
    database: process.env.Nom_BDD
  });

  console.log("Connecté à la base de données !");
  await generateData(connection);
  await connection.end();
  console.log("Connexion fermée.");
}

async function generateData(connection) {
  const roverId = 1;
  const totalMesures = 100;
  const now = new Date();
  const intervalleMs = (24 * 60 * 60 * 1000) / totalMesures; // Intervalle régulier

  console.log(`Génération de ${totalMesures} mesures...`);

  for (let i = 0; i < totalMesures; i++) {
    const mesureDate = new Date(now.getTime() - (24 * 60 * 60 * 1000) + (i * intervalleMs));

    const temperature = Math.floor(Math.random() * 61) - 40; // -40 à 20°C
    const co2          = Math.floor(Math.random() * 500) + 800; // 800 à 1300 ppm
    const humidite     = Math.floor(Math.random() * 11) + 5;    // 5 à 15%

    const sql = "INSERT INTO mesures (temperature, CO2, humidite, date, rover_id) VALUES (?, ?, ?, ?, ?)";
    await connection.query(sql, [temperature, co2, humidite, mesureDate, roverId]);
  }

  console.log(`✅ ${totalMesures} mesures insérées avec succès.`);
}

main().catch(err => {
  console.error("Erreur :", err);
  process.exit(1);
});