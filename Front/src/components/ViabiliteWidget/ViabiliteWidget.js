import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './ViabiliteWidget.css';

const getScoreColor = (score) => {
    if (score > 80) return '#22c55e'; // Favorable (vert)
    if (score >= 50) return '#eab308'; // Limite (jaune)
    return '#ef4444'; // Inhospitalier (rouge)
};

const ViabiliteWidget = ({ viabilite, showExplanation = false }) => {
    if (!viabilite) return null;

    return (
        <div className="viabilite-widget">
            <div className="viabilite-widget__header">
                <ShieldCheck size={28} className="viabilite-widget__icon" />
                <h3>Bilan Viabilité Global</h3>
                <span className={`viabilite-widget__badge viabilite-${viabilite.statut.toLowerCase()}`}>
                    {viabilite.statut}
                </span>
            </div>
            
            {showExplanation && (
                <div className="viabilite-widget__explanation">
                    Ce score de viabilité est calculé sur la base des 50 dernières mesures historiques du rover.
                </div>
            )}

            <div className="viabilite-widget__content">
                <div className="viabilite-widget__score-box">
                    <div className="viabilite-widget__score">
                        <span className="viabilite-widget__score-value">{viabilite.score}</span>
                        <span className="viabilite-widget__score-max">/100</span>
                    </div>
                    <div className="viabilite-widget__progress-bg">
                        <div 
                            className="viabilite-widget__progress-fill" 
                            style={{ 
                                width: `${viabilite.score}%`, 
                                backgroundColor: getScoreColor(viabilite.score) 
                            }}
                        />
                    </div>
                </div>
                <div className="viabilite-widget__details">
                    <p className="viabilite-widget__subtitle">Moyennes récentes & Seuils :</p>
                    <ul className="viabilite-widget__list">
                        <li>Température : <strong>{viabilite.moyennes.T_moy}°C</strong> <span>(Idéal : 5°C - 35°C)</span></li>
                        <li>Humidité : <strong>{viabilite.moyennes.H_moy}%</strong> <span>(Max : 70%)</span></li>
                        <li>CO2 : <strong>{viabilite.moyennes.CO2_moy} ppm</strong> <span>(Max : 1000 ppm)</span></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ViabiliteWidget;
