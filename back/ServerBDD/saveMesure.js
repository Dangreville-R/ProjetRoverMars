// ────────────────────────────────────────────────────────────────
// Fichier de compatibilité — la logique a été déplacée dans MesureRepository.js
// ────────────────────────────────────────────────────────────────
const MesureRepository = require('./MesureRepository');
const database = require('./database');

// On feinte le repository en lui passant un objet qui possède la méthode getPool()
const fakeDatabaseInstance = {
  getPool: () => database
};

const repository = new MesureRepository(fakeDatabaseInstance);

module.exports = { saveMesure: (data) => repository.saveMesure(data) };