import React, { useState } from 'react';
import './Historique.css';

// donnees simulees de l'historique (en vrai ca viendra de l'API)
const MOCK_HISTORY = [
    { id: 1, date: '2026-03-05 09:12', temperature: '-42.3', humidite: '2.1', pression: '6.1', batterie: '89' },
    { id: 2, date: '2026-03-05 09:09', temperature: '-43.1', humidite: '2.0', pression: '6.0', batterie: '88' },
    { id: 3, date: '2026-03-05 09:06', temperature: '-44.5', humidite: '1.9', pression: '6.2', batterie: '87' },
    { id: 4, date: '2026-03-05 09:03', temperature: '-45.2', humidite: '2.2', pression: '5.9', batterie: '86' },
    { id: 5, date: '2026-03-05 09:00', temperature: '-46.0', humidite: '2.3', pression: '6.0', batterie: '85' },
    { id: 6, date: '2026-03-05 08:57', temperature: '-47.8', humidite: '2.1', pression: '5.8', batterie: '84' },
    { id: 7, date: '2026-03-05 08:54', temperature: '-48.3', humidite: '1.8', pression: '6.1', batterie: '83' },
    { id: 8, date: '2026-03-05 08:51', temperature: '-49.1', humidite: '2.0', pression: '6.3', batterie: '82' },
];

// page historique - affiche les anciennes mesures du rover
const Historique = () => {
    const [filter, setFilter] = useState('all');

    // colonnes du tableau
    const columns = [
        { key: 'date', label: 'Date & Heure' },
        { key: 'temperature', label: 'Temp. (°C)' },
        { key: 'humidite', label: 'Humid. (%)' },
        { key: 'pression', label: 'Pres. (hPa)' },
        { key: 'batterie', label: 'Batterie (%)' },
    ];

    return (
        <div className="historique">
            <div className="historique__header">
                <div>
                    <h2>Historique des mesures</h2>
                    <p>{MOCK_HISTORY.length} enregistrements</p>
                </div>
                <div className="historique__filters">
                    <select
                        className="historique__select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">Toutes les données</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                    </select>
                </div>
            </div>

            {/* tableau des donnees */}
            <div className="historique__table-wrapper">
                <table className="historique__table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_HISTORY.map((row, index) => (
                            <tr
                                key={row.id}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <td className="historique__date">{row.date}</td>
                                <td>{row.temperature}°C</td>
                                <td>{row.humidite}%</td>
                                <td>{row.pression}</td>
                                <td>
                                    <div className="historique__battery">
                                        <div
                                            className="historique__battery-bar"
                                            style={{ width: `${row.batterie}%` }}
                                        />
                                        <span>{row.batterie}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* note explicative */}
            <p className="historique__note">
                Les données seront récupérées depuis l'API du back-end une fois connecté.
            </p>
        </div>
    );
};

export default Historique;
