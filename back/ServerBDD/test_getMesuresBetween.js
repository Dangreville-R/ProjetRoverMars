// back/ServerBDD/test_getMesuresBetween.js
 
const getMesuresBetween = require('./getMesuresBetween.js');
 
const ROVER_ID = 1; // À adapter
 
// Fenêtre de test : les 10 dernières minutes
const end   = new Date();
const start = new Date(end.getTime() - 10 * 60 * 1000);
 
console.log(`Récupération des mesures du rover ${ROVER_ID}`);
console.log(`  de : ${start.toISOString()}`);
console.log(`  à  : ${end.toISOString()}\n`);
 
getMesuresBetween(ROVER_ID, start, end).then((mesures) => {
  console.log(`${mesures.length} mesure(s) trouvée(s) :`);
  console.table(mesures);
}).catch((err) => {
  console.error('Erreur :', err);
});
 