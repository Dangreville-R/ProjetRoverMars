import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind, AlertCircle, Radio, ShieldCheck } from 'lucide-react';
import './TempsReel.css';

// Page Temps Réel
const TempsReel = ({ roverConnected }) => {
    // Données réelles
    const [data, setData] = useState({
        temperature: '--',
        humidite: '--',
        co2: '--',
    });
    const [alertes, setAlertes] = useState([]);
    
    // Viabilité
    const [viabilite, setViabilite] = useState(null);

    // Fetch de l'API live et Viabilité
    useEffect(() => {
        if (!roverConnected) return;

        const fetchData = async () => {
            try {
                // Remplacer par l'URL dynamique si nécessaire ou le proxy proxy react
                const response = await fetch('/api/mesures/live');
                if (response.ok) {
                    const result = await response.json();
                    if (result.donnees) {
                        setData({
                            temperature: result.donnees.temperature.toFixed(1),
                            humidite: result.donnees.humidite.toFixed(1),
                            co2: result.donnees.CO2,
                        });
                        setAlertes(result.messages || []);
                    }
                }
            } catch (error) {
                console.error("Erreur de récupération des données live:", error);
            }
        };

        const fetchViabilite = async () => {
             try {
                 const response = await fetch('/api/mesures/viabilite');
                 if (response.ok) {
                     const result = await response.json();
                     setViabilite(result);
                 }
             } catch (error) {
                 console.error("Erreur de récupération de la viabilité:", error);
             }
         };

        fetchData();
        fetchViabilite();
        
        const interval = setInterval(() => {
            fetchData();
            fetchViabilite();
        }, 3000);
        
        return () => clearInterval(interval);
    }, [roverConnected]);

    // Cartes affichées cohérentes avec la base de données
    const cards = [
        { label: 'Température', value: `${data.temperature}°C`, icon: <Thermometer size={24} />, color: '#f97316' },
        { label: 'Humidité', value: `${data.humidite}%`, icon: <Droplets size={24} />, color: '#06b6d4' },
        { label: 'CO2', value: `${data.co2} ppm`, icon: <Wind size={24} />, color: '#8b5cf6' },
    ];

    return (
        <div className="temps-reel">
            <div className="temps-reel__header">
                <h2>Données en temps réel</h2>
                <p>Mise à jour automatique toutes les 3 secondes</p>
            </div>

            {!roverConnected ? (
                <div className="temps-reel__offline">
                    <span className="temps-reel__offline-icon"><Radio size={48} /></span>
                    <h3>Rover déconnecté</h3>
                    <p>En attente de connexion avec le rover...</p>
                </div>
            ) : (
                <div className="temps-reel__grid-container">
                    {alertes.length > 0 && (
                        <div className="temps-reel__alerts">
                            <AlertCircle size={20} className="temps-reel__alert-icon" />
                            <div className="temps-reel__alert-messages">
                                {alertes.map((msg, i) => <span key={i}>{msg}</span>)}
                            </div>
                        </div>
                    )}
                    <div className="temps-reel__grid">
                    {cards.map((card, index) => (
                        <div
                            key={card.label}
                            className="temps-reel__card"
                            style={{
                                '--card-color': card.color,
                                animationDelay: `${index * 0.08}s`,
                            }}
                        >
                            <div className="temps-reel__card-header">
                                <span className="temps-reel__card-icon">{card.icon}</span>
                                <span className="temps-reel__card-label">{card.label}</span>
                            </div>
                            <div className="temps-reel__card-value">{card.value}</div>
                            <div className="temps-reel__card-bar">
                                <div className="temps-reel__card-bar-fill" />
                            </div>
                        </div>
                    ))}
                    </div>

                    {/* Section Viabilité */}
                    {viabilite && (
                        <div className="temps-reel__viabilite">
                            <div className="temps-reel__viabilite-header">
                                <ShieldCheck size={28} className="temps-reel__viabilite-icon" />
                                <h3>Score de Viabilité Globale</h3>
                                <span className={`temps-reel__viabilite-badge viabilite-${viabilite.statut.toLowerCase()}`}>
                                    {viabilite.statut}
                                </span>
                            </div>
                            <div className="temps-reel__viabilite-content">
                                <div className="temps-reel__viabilite-score-box">
                                    <div className="temps-reel__viabilite-score">
                                        <span className="temps-reel__viabilite-score-value">{viabilite.score}</span>
                                        <span className="temps-reel__viabilite-score-max">/100</span>
                                    </div>
                                    <div className="temps-reel__viabilite-progress-bg">
                                        <div 
                                            className="temps-reel__viabilite-progress-fill" 
                                            style={{ width: `${viabilite.score}%`, backgroundColor: getScoreColor(viabilite.score) }}
                                        />
                                    </div>
                                </div>
                                <div className="temps-reel__viabilite-details">
                                    <p className="temps-reel__viabilite-subtitle">Moyennes récentes & Seuils :</p>
                                    <ul className="temps-reel__viabilite-list">
                                        <li>Température : <strong>{viabilite.moyennes.T_moy}°C</strong> <span>(Idéal : 5°C - 35°C)</span></li>
                                        <li>Humidité : <strong>{viabilite.moyennes.H_moy}%</strong> <span>(Max : 70%)</span></li>
                                        <li>CO2 : <strong>{viabilite.moyennes.CO2_moy} ppm</strong> <span>(Max : 1000 ppm)</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Fonction utilitaire pour la couleur de la barre
const getScoreColor = (score) => {
    if (score > 80) return '#22c55e'; // Favorable (vert)
    if (score >= 50) return '#eab308'; // Limite (jaune)
    return '#ef4444'; // Inhospitalier (rouge)
};

export default TempsReel;
