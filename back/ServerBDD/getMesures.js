// back/ServerBDD/getMesures.js
const pool = require('./database');

async function getLastMesures(idRover, duree) {
  const query = `
    SELECT *
    FROM mesures
    WHERE id_rover = ?
      AND timestamp >= NOW() - INTERVAL ? SECOND
    ORDER BY timestamp DESC
  `;

  // .promise() convertit le pool callback en version async/await
  const [rows] = await pool.promise().execute(query, [idRover, duree]);
  return rows;
}

module.exports = { getLastMesures };