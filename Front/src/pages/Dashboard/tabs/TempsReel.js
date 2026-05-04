import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Wind, AlertCircle, Radio } from 'lucide-react';
import ViabiliteWidget from '../../../components/ViabiliteWidget/ViabiliteWidget';
import './TempsReel.css';
 
const TempsReel = ({ roverConnected }) => {
    const [data, setData] = useState({
        temperature: '--',
        humidite: '--',
        co2: '--',
    });
    const [alertes, setAlertes] = useState([]);
    const [viabilite, setViabilite] = useState(null);
 
    useEffect(() => {
        if (!roverConnected) return;
 
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
 
        // ✅ Remplace /api/mesures/live par /api/mesures/latest
        const fetchLatest = async () => {
            try {
                const response = await fetch('/api/mesures/latest');
                if (response.ok) {
                    const result = await response.json();
                    if (result.donnees) {
                        setData({
                            temperature: Number(result.donnees.temperature).toFixed(1),
                            humidite: Number(result.donnees.humidite).toFixed(1),
                            co2: result.donnees.CO2,
                        });
                        setAlertes(result.messages || []);
                    }
                }
            } catch (error) {
                console.error("Erreur de récupération des données latest:", error);
            }
        };
 
        // Fetch initial au montage
        fetchViabilite();
        fetchLatest();
 
        // Connexion WebSocket pour le flux temps réel
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        const ws = new WebSocket(wsUrl);
 
        ws.onopen = () => {
            console.log("Connecté au WebSocket des mesures en temps réel");
        };
 
        ws.onmessage = (event) => {
            try {
                const result = JSON.parse(event.data);
                if (result.donnees) {
                    setData({
                        temperature: Number(result.donnees.temperature).toFixed(1),
                        humidite: Number(result.donnees.humidite).toFixed(1),
                        co2: result.donnees.CO2,
                    });
                    setAlertes(result.messages || []);
 
                    // Mise à jour de la viabilité à chaque nouvelle mesure
                    fetchViabilite();
                }
            } catch (error) {
                console.error("Erreur lors du traitement WS:", error);
            }
        };
 
        ws.onerror = (error) => {
            console.error("Erreur WebSocket:", error);
        };
 
        return () => {
            ws.close();
        };
    }, [roverConnected]);
 
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
 
                    <ViabiliteWidget viabilite={viabilite} />
                </div>
            )}
        </div>
    );
};
 
export default TempsReel;