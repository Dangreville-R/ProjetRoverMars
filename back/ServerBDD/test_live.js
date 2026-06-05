// back/ServerBDD/test_live.js

require('dotenv').config({ path: '../.env' });

const pool = require('./database');

const getLastMesure = require('./getLastMesures');

// ─── Jeu de données de test attendu ───────────────
const ROVER_ID = 1;
const FENETRE  = 60; // secondes

const EXPECTED = {
  temperature: { min: -10, max: 60 },   // °C
  humidite:    { min: 0,   max: 100 },  // %
  CO2:         { min: 300, max: 5000 }, // ppm
};

// ─── Helpers ──────────────────────────────────────
const OK   = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✘\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    console.log(`  ${OK}  ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL}  ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
  }
}

function inRange(value, { min, max }) {
  return typeof value === 'number' && value >= min && value <= max;
}

// ─── Test principal ───────────────────────────────
async function runTests() {
  console.log('\n══════════════════════════════════════════');
  console.log(' TEST LIVE — getLastMesure');
  console.log('══════════════════════════════════════════');
  console.log(`  rover   : ${ROVER_ID}`);
  console.log(`  fenêtre : ${FENETRE} s\n`);

  let mesures;
  try {
    mesures = await getLastMesure(ROVER_ID, FENETRE);
  } catch (err) {
    console.error(`${FAIL}  Impossible d'interroger la base :`, err.message);
    process.exit(1);
  }

  // ── 1. Présence de données ──────────────────────
  console.log('[ Présence ]');
  assert(Array.isArray(mesures), 'Retourne un tableau');
  assert(mesures.length > 0, `Au moins une mesure (reçu : ${mesures.length})`);

  if (mesures.length === 0) {
    console.log('\n  Aucune mesure — vérifiez que le rover envoie des données.\n');
    printSummary();
    return;
  }

  console.log(`\n  ${mesures.length} mesure(s) récupérée(s) :\n`);
  console.table(mesures);

  // ── 2. Structure ────────────────────────────────
  console.log('[ Structure ]');
  const CHAMPS = ['temperature', 'humidite', 'CO2', 'date', 'id_rover'];
  mesures.forEach((row, i) => {
    CHAMPS.forEach(champ => {
      assert(champ in row, `Ligne ${i + 1} — champ « ${champ} » présent`);
    });
  });

  // ── 3. Valeurs dans les plages attendues ────────
  console.log('\n[ Valeurs ]');
  mesures.forEach((row, i) => {
    const d = new Date(row.date).toISOString();
    assert(inRange(row.temperature, EXPECTED.temperature),
      `Ligne ${i + 1} — température [${EXPECTED.temperature.min}, ${EXPECTED.temperature.max}] °C`,
      `valeur : ${row.temperature}`);
    assert(inRange(row.humidite, EXPECTED.humidite),
      `Ligne ${i + 1} — humidité [${EXPECTED.humidite.min}, ${EXPECTED.humidite.max}] %`,
      `valeur : ${row.humidite}`);
    assert(inRange(row.CO2, EXPECTED.CO2),
      `Ligne ${i + 1} — CO₂ [${EXPECTED.CO2.min}, ${EXPECTED.CO2.max}] ppm`,
      `valeur : ${row.CO2}`);
    assert(Number(row.id_rover) === ROVER_ID,
      `Ligne ${i + 1} — id_rover = ${ROVER_ID}`,
      `valeur : ${row.id_rover}`);
  });

  // ── 4. Fraîcheur ────────────────────────────────
  console.log('\n[ Fraîcheur ]');
  const derniere = new Date(mesures[mesures.length - 1].date).getTime();
  const ecartSec = Math.round((Date.now() - derniere) / 1000);
  assert(ecartSec <= FENETRE,
    `Dernière mesure il y a ${ecartSec} s (≤ ${FENETRE} s)`,
    `date : ${mesures[mesures.length - 1].date}`);

  // ── 5. Ordre chronologique ──────────────────────
  console.log('\n[ Ordre ]');
  let ordreOk = true;
  for (let i = 1; i < mesures.length; i++) {
    if (new Date(mesures[i].date) < new Date(mesures[i - 1].date)) {
      ordreOk = false; break;
    }
  }
  assert(ordreOk, 'Triées par date ASC');

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n──────────────────────────────────────────');
  console.log(` Résultat : ${passed}/${total} test(s) passé(s)`);
  if (failed === 0) {
    console.log(' \x1b[32m\x1b[1mTous les tests sont OK ✔\x1b[0m');
  } else {
    console.log(` \x1b[31m\x1b[1m${failed} test(s) en échec ✘\x1b[0m`);
  }
  console.log('──────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();