require('dotenv').config({ path: '../.env' });

const getMesuresBetween = require('./getMesuresBetween');
const pool = require('./database');

// ══════════════════════════════════════════════════════════════
//  CONFIGURATION : CHOISIS TES DATES ICI
// ══════════════════════════════════════════════════════════════
// Tu peux utiliser le format "AAAA-MM-JJ HH:mm:ss"
const ROVER_ID = 1;
const START    = "2026-06-08 07:00:00"; // Date de début souhaitée
const END      = "2026-06-08 11:30:00"; // Date de fin souhaitée
// ══════════════════════════════════════════════════════════════

const EXPECTED = {
  temperature: { min: -40, max: 30 },
  humidite:    { min: 0,   max: 100 },
  CO2:         { min: 300, max: 5000 },
};

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

async function runTests() {
  console.log('\n══════════════════════════════════════');
  console.log(' TEST HISTORY — getMesuresBetween');
  console.log('══════════════════════════════════════');
  console.log(`  rover  : ${ROVER_ID}`);
  console.log(`  start  : ${START}`);
  console.log(`  end    : ${END}\n`);

  let mesures;
  try {
    // Appel de la fonction avec les dates que tu as choisies
    mesures = await getMesuresBetween(ROVER_ID, START, END);
  } catch (err) {
    console.error(`${FAIL}  Erreur lors de l'appel :`, err.message);
    process.exit(1);
  }

  // ── 1. Présence de données ──────────────────────
  console.log('[ Présence ]');
  assert(Array.isArray(mesures), 'Retourne un tableau');
  assert(mesures.length > 0, `Au moins une mesure trouvée (reçu : ${mesures.length})`);

  if (mesures.length === 0) {
    console.log('\n  Aucune mesure trouvée sur cette plage horaire.\n');
    printSummary();
    return;
  }

  console.log(`\n  ${mesures.length} mesure(s) récupérée(s) :\n`);
  console.table(mesures);

  // ── 2. Structure ────────────────────────────────
  console.log('[ Structure ]');
  const CHAMPS = ['temperature', 'humidite', 'CO2', 'date', 'rover_id'];
  mesures.forEach((row, i) => {
    CHAMPS.forEach(champ => {
      assert(champ in row, `Ligne ${i + 1} — champ « ${champ} » présent`);
    });
  });

  // ── 3. Valeurs dans les plages attendues ────────
  console.log('\n[ Valeurs ]');
  mesures.forEach((row, i) => {
    assert(inRange(row.temperature, EXPECTED.temperature),
      `Ligne ${i + 1} — température [${EXPECTED.temperature.min}, ${EXPECTED.temperature.max}] °C`,
      `valeur : ${row.temperature}`);
    assert(inRange(row.humidite, EXPECTED.humidite),
      `Ligne ${i + 1} — humidité [${EXPECTED.humidite.min}, ${EXPECTED.humidite.max}] %`,
      `valeur : ${row.humidite}`);
    assert(inRange(row.CO2, EXPECTED.CO2),
      `Ligne ${i + 1} — CO₂ [${EXPECTED.CO2.min}, ${EXPECTED.CO2.max}] ppm`,
      `valeur : ${row.CO2}`);
    assert(Number(row.rover_id) === ROVER_ID,
      `Ligne ${i + 1} — rover_id = ${ROVER_ID}`,
      `valeur : ${row.rover_id}`);
  });

  // ── 4. Ordre chronologique ──────────────────────
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
    console.log(' \x1b[32m\x1b[1mTous les tests historiques sont OK ✔\x1b[0m');
  } else {
    console.log(` \x1b[31m\x1b[1m${failed} test(s) en échec ✘\x1b[0m`);
  }
  console.log('──────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();