// test_insert.js


// Tout en haut de test_insert.js
require('dotenv').config({ path: '../.env' });

const { saveMesure } = require('./saveMesure');

const pool = require('./database');

async function testInsertSimple() {
  console.log("=== Test 1 – Insertion simple ===");


  const mesureFixe = {
    temperature: 15,
    co2: 950,
    humidite: 8,
    rover_id: 1
  };


  const result = await saveMesure(mesureFixe);


  if (result && result.insertId) {
    console.log("Test réussi — Mesure insérée avec l'ID :", result.insertId);
  } else {
    console.log("Test échoué — Résultat inattendu :", result);
  }
}


testInsertSimple()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Erreur inattendue :", err);
    process.exit(1);
  });




