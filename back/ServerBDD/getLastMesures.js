// ────────────────────────────────────────────────────────────────
// Fichier de compatibilité — la logique a été déplacée dans MesureRepository.js
// Ce fichier maintient l'ancien format d'export : module.exports = function
// ────────────────────────────────────────────────────────────────
const MesureRepository = require('./MesureRepository');
const database = require('./database');

const repository = new MesureRepository(database);

module.exports = (secondes) => repository.getLastMesures(secondes);