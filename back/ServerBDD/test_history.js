// back/ServerBDD/test_history.js

require('dotenv').config({ path: '../.env' });  // charge le .env avant tout

const getMesuresBetween = require('./getMesuresBetween');

const ROVER_ID = 1;

const end   = new Date();
const start = new Date(end.getTime() - 10 * 60 * 1000);

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

async function runTests() {
  console.log('\n══════════════════════════════════════');
  console.log(' TEST HISTORY — getMesuresBetween');
  console.log('══════════════════════════════════════');
  console.log(`  rover  : ${ROVER_ID}`);
  console.log(`  start  : ${start.toISOString()}`);
  console.log(`  end    : ${end.toISOString()}\n`);

  let mesures;
  try {
    mesures = await getMesuresBetween(ROVER_ID, start, end);
  } catch (err) {
    console.error(`${FAIL}  Erreur lors de l'appel :`, err.message);
    process.exit(1);
  }

  // ── 1. Retour valide ────────────────────────
  console.log('[ Retour ]');
  assert(Array.isArray(mesures), `Retourne un tableau (${mesures.length} mesure(s))`);

  if (mesures.length === 0) {
    console.log(`\n  aucune mesure sur la période — les tests suivants sont ignorés.\n`);
    printSummary();
    return;
  }

  // ── 2. Aucune mesure hors période ───────────
  console.log('\n[ Mesures hors période ]');
  const startMs = start.getTime();
  const endMs   = end.getTime();

  mesures.forEach((row, i) => {
    const d = new Date(row.date).getTime();
    assert(
      d >= startMs && d <= endMs,
      `Ligne ${i + 1} dans la période`,
      `date : ${row.date}`
    );
  });

  // ── 3. Triées par date ASC ──────────────────
  console.log('\n[ Ordre chronologique ]');
  let ordreOk = true;
  let premierDesordre = '';

  for (let i = 1; i < mesures.length; i++) {
    if (new Date(mesures[i].date) < new Date(mesures[i - 1].date)) {
      ordreOk = false;
      premierDesordre = `ligne ${i} (${mesures[i - 1].date}) > ligne ${i + 1} (${mesures[i].date})`;
      break;
    }
  }
  assert(ordreOk, 'Triées par date ASC', premierDesordre);

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n──────────────────────────────────────');
  console.log(` Résultat : ${passed}/${total} test(s) passé(s)`);
  if (failed === 0) {
    console.log(' \x1b[32m\x1b[1mTous les tests sont OK ✔\x1b[0m');
  } else {
    console.log(` \x1b[31m\x1b[1m${failed} test(s) en échec ✘\x1b[0m`);
  }
  console.log('──────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();