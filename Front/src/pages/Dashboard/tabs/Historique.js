import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Historique.css';

// Fausses données historiques si le rover est déconnecté
const MOCK_HISTORY = [
    { id: 1, date: '2026-03-05T09:12:00', temperature: -42.3, humidite: 2.1, CO2: 810 },
    { id: 2, date: '2026-03-05T09:09:00', temperature: -43.1, humidite: 2.0, CO2: 805 },
    { id: 3, date: '2026-03-05T09:06:00', temperature: -44.5, humidite: 1.9, CO2: 815 },
    { id: 4, date: '2026-03-05T09:03:00', temperature: -45.2, humidite: 2.2, CO2: 820 },
    { id: 5, date: '2026-03-05T09:00:00', temperature: -46.0, humidite: 2.3, CO2: 830 },
    { id: 6, date: '2026-03-05T08:57:00', temperature: -47.8, humidite: 2.1, CO2: 825 },
    { id: 7, date: '2026-03-05T08:54:00', temperature: -48.3, humidite: 1.8, CO2: 840 },
    { id: 8, date: '2026-03-05T08:51:00', temperature: -49.1, humidite: 2.0, CO2: 845 },
];

// Formateur de date pour le graphique
const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// Page Historique
const Historique = ({ roverConnected }) => {
    const [history, setHistory] = useState([]);
    const [filter, setFilter] = useState('all');
    
    // Nouveaux states pour les graphiques
    const [view, setView] = useState('table'); // 'table' ou 'chart'
    const [activeChart, setActiveChart] = useState('all'); // 'all', 'temperature', 'humidite', 'co2'

    // Récupération de l'historique
    useEffect(() => {
        const fetchHistory = async () => {
            if (!roverConnected) {
                setHistory(MOCK_HISTORY);
                return;
            }
            try {
                const response = await fetch('/api/mesures/history');
                if (response.ok) {
                    const data = await response.json();
                    
                    // On trie pour que le graphique soit chronologique (de gauche à droite)
                    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
                    setHistory(sortedData);
                }
            } catch (error) {
                console.error("Erreur de récupération de l'historique:", error);
            }
        };

        fetchHistory();
    }, [roverConnected]);

    // Colonnes du tableau (réelles de la BDD)
    const columns = [
        { key: 'date', label: 'Date & Heure' },
        { key: 'temperature', label: 'Temp. (°C)' },
        { key: 'humidite', label: 'Humid. (%)' },
        { key: 'co2', label: 'CO2 (ppm)' },
    ];

    return (
        <div className="historique">
            <div className="historique__header">
                <div>
                    <h2>Historique des mesures {roverConnected ? '' : '(Données de simulation)'}</h2>
                    <p>{history.length} enregistrements</p>
                </div>
                
                <div className="historique__controls">
                    {/* Switcher Tableau / Graphique */}
                    <div className="historique__view-toggle">
                        <button 
                            className={`historique__toggle-btn ${view === 'table' ? 'active' : ''}`}
                            onClick={() => setView('table')}
                        >
                            Tableau
                        </button>
                        <button 
                            className={`historique__toggle-btn ${view === 'chart' ? 'active' : ''}`}
                            onClick={() => setView('chart')}
                        >
                            Graphique
                        </button>
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
            </div>

            {view === 'table' ? (
                /* Vue Tableau */
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
                        {history.map((row, index) => (
                            <tr
                                key={row.id_mesure || row.id || index}
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <td className="historique__date">{new Date(row.date).toLocaleString('fr-FR')}</td>
                                <td>{row.temperature}°C</td>
                                <td>{row.humidite}%</td>
                                <td>{row.CO2} ppm</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            ) : (
                /* Vue Graphique */
                <div className="historique__chart-container">
                    <div className="historique__chart-controls">
                        <button className={activeChart === 'all' ? 'active' : ''} onClick={() => setActiveChart('all')}>Tous</button>
                        <button className={activeChart === 'temperature' ? 'active' : ''} onClick={() => setActiveChart('temperature')}>Température</button>
                        <button className={activeChart === 'humidite' ? 'active' : ''} onClick={() => setActiveChart('humidite')}>Humidité</button>
                        <button className={activeChart === 'co2' ? 'active' : ''} onClick={() => setActiveChart('co2')}>CO2</button>
                    </div>
                    
                    <div className="historique__chart-wrapper">
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={history} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={formatTime} 
                                    stroke="var(--text-muted)" 
                                    tick={{fontSize: 12}}
                                />
                                <YAxis stroke="var(--text-muted)" tick={{fontSize: 12}} />
                                <Tooltip 
                                    labelFormatter={(label) => new Date(label).toLocaleString('fr-FR')}
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <Legend />
                                
                                {(activeChart === 'all' || activeChart === 'temperature') && (
                                    <Line type="monotone" dataKey="temperature" name="Température (°C)" stroke="#f97316" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                )}
                                {(activeChart === 'all' || activeChart === 'humidite') && (
                                    <Line type="monotone" dataKey="humidite" name="Humidité (%)" stroke="#06b6d4" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                )}
                                {(activeChart === 'all' || activeChart === 'co2') && (
                                    <Line type="monotone" dataKey="CO2" name="CO2 (ppm)" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Message */}
            <p className="historique__note">
                {roverConnected 
                    ? "Les données sont synchronisées avec la Base de Données." 
                    : "⚠️ Mode simulation (Rover déconnecté)."
                }
            </p>
        </div>
    );
};

export default Historique;
