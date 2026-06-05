// back/ServerBDD/history.js

const db = require('./database');

/**
 * Récupère les mesures dans une fenêtre temporelle [NOW() - secondes, NOW()].
 *
 * Améliorations vs getLastMesure.js :
 *  - Validation des bornes : secondes doit être un entier > 0 et <= MAX_WINDOW
 *  - Tri ASC garanti sur created_at (index recommandé sur cette colonne)
 *  - Rejet explicite avec TypeError pour paramètres invalides
 *
 * @param {number} [secondes=60]  Fenêtre temporelle en secondes (1 – 86400)
 * @returns {Promise<Array<{temperature: number, humidite: number, CO2: number, created_at: Date}>>}
 */

const MAX_WINDOW = 86400; // 24 h — borne haute arbitraire, à ajuster selon le projet

const getHistory = (secondes = 60) => {
  return new Promise((resolve, reject) => {

    // ── Validation des bornes temporelles ──────────────────────────────────
    const sec = Number(secondes);

    if (!Number.isFinite(sec)) {
      return reject(new TypeError(
        `[history] "secondes" doit être un nombre fini (reçu : ${secondes})`
      ));
    }

    if (!Number.isInteger(sec)) {
      return reject(new TypeError(
        `[history] "secondes" doit être un entier (reçu : ${secondes})`
      ));
    }

    if (sec <= 0) {
      return reject(new RangeError(
        `[history] "secondes" doit être > 0 (reçu : ${sec})`
      ));
    }

    if (sec > MAX_WINDOW) {
      return reject(new RangeError(
        `[history] "secondes" dépasse la fenêtre maximale de ${MAX_WINDOW} s (reçu : ${sec})`
      ));
    }

    // ── Requête SQL ────────────────────────────────────────────────────────
    // ORDER BY created_at ASC  → tri chronologique garanti côté BDD
    // INTERVAL ? SECOND        → borne inférieure = NOW() - sec
    // La borne supérieure est implicitement NOW() (pas de données futures)
    const query = `
      SELECT temperature, humidite, CO2, created_at
      FROM mesures
      WHERE created_at >= NOW() - INTERVAL ? SECOND
        AND created_at <= NOW()
      ORDER BY created_at ASC
    `;

    db.query(query, [sec], (err, results) => {
      if (err) {
        console.error('[history] Erreur SQL :', err);
        return reject(err);
      }

      // Résultat vide = fenêtre valide sans mesures → [] est correct
      resolve(results);
    });
  });
};

module.exports = getHistory;