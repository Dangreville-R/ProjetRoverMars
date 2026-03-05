import React, { useState, useEffect } from 'react';
import './TempsReel.css';

// page temps reel - affiche les donnees en direct du rover
const TempsReel = ({ roverConnected }) => {
    // donnees simulees du rover (en vrai ca viendra de l'API)
    const [data, setData] = useState({
        temperature: '--',
        humidite: '--',
        pression: '--',
        luminosite: '--',
        batterie: '--',
        vitesse: '--',
    });

    // on simule la reception de donnees toutes les 3 secondes
    useEffect(() => {
        if (!roverConnected) return;

        const generateData = () => {
            setData({
                temperature: (Math.random() * 30 - 60).toFixed(1),
                humidite: (Math.random() * 5 + 0.1).toFixed(1),
                pression: (Math.random() * 2 + 5.5).toFixed(1),
                luminosite: Math.floor(Math.random() * 100),
                batterie: Math.floor(Math.random() * 30 + 65),
                vitesse: (Math.random() * 0.15).toFixed(3),
            });
        };

        generateData();
        const interval = setInterval(generateData, 3000);
        return () => clearInterval(interval);
    }, [roverConnected]);

    // les cartes a afficher
    const cards = [
        { label: 'Température', value: `${data.temperature}°C`, icon: '🌡️', color: '#f97316' },
        { label: 'Humidité', value: `${data.humidite}%`, icon: '💧', color: '#06b6d4' },
        { label: 'Pression', value: `${data.pression} hPa`, icon: '🌪️', color: '#8b5cf6' },
        { label: 'Luminosité', value: `${data.luminosite}%`, icon: '☀️', color: '#eab308' },
        { label: 'Batterie', value: `${data.batterie}%`, icon: '🔋', color: '#22c55e' },
        { label: 'Vitesse', value: `${data.vitesse} m/s`, icon: '🏎️', color: '#3b82f6' },
    ];

    return (
        <div className="temps-reel">
            <div className="temps-reel__header">
                <h2>Données en temps réel</h2>
                <p>Mise à jour automatique toutes les 3 secondes</p>
            </div>

            {!roverConnected ? (
                <div className="temps-reel__offline">
                    <span className="temps-reel__offline-icon">📡</span>
                    <h3>Rover déconnecté</h3>
                    <p>En attente de connexion avec le rover...</p>
                </div>
            ) : (
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
            )}
        </div>
    );
};

export default TempsReel;
