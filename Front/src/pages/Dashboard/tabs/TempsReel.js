import React from 'react';
import { Thermometer, Droplets, Wind, AlertCircle, Radio } from 'lucide-react';
import ViabiliteWidget from '../../../components/ViabiliteWidget/ViabiliteWidget';
import './TempsReel.css';

/**
 * Classe TempsReel — Affiche les données capteurs en temps réel.
 * Gère la connexion WebSocket, les fetch API et la mise à jour automatique.
 */
class TempsReel extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: {
                temperature: '--',
                humidite: '--',
                co2: '--',
            },
            alertes: [],
            viabilite: null,
        };

        // Référence WebSocket pour le nettoyage
        this._ws = null;
    }

    componentDidMount() {
        if (this.props.roverConnected) {
            this._connectAndFetch();
        }
    }

    componentDidUpdate(prevProps) {
        // Si le statut de connexion du rover change
        if (prevProps.roverConnected !== this.props.roverConnected) {
            this._disconnect();
            if (this.props.roverConnected) {
                this._connectAndFetch();
            }
        }
    }

    componentWillUnmount() {
        this._disconnect();
    }

    /**
     * Ferme la connexion WebSocket si elle existe.
     */
    _disconnect() {
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    }

    /**
     * Récupère le score de viabilité depuis l'API.
     */
    async _fetchViabilite() {
        try {
            const response = await fetch('/api/mesures/viabilite');
            if (response.ok) {
                const result = await response.json();
                this.setState({ viabilite: result });
            }
        } catch (error) {
            console.error("Erreur de récupération de la viabilité:", error);
        }
    }

    /**
     * Récupère les dernières mesures depuis l'API.
     */
    async _fetchLatest() {
        try {
            const response = await fetch('/api/mesures/latest');
            if (response.ok) {
                const result = await response.json();
                if (Array.isArray(result) && result.length > 0) {
                    const last = result[result.length - 1];
                    this.setState({
                        data: {
                            temperature: Number(last.temperature).toFixed(1),
                            humidite: Number(last.humidite).toFixed(1),
                            co2: last.CO2 ?? last.co2,
                        },
                    });
                } else if (result.donnees) {
                    this.setState({
                        data: {
                            temperature: Number(result.donnees.temperature).toFixed(1),
                            humidite: Number(result.donnees.humidite).toFixed(1),
                            co2: result.donnees.CO2 ?? result.donnees.co2,
                        },
                        alertes: result.messages || [],
                    });
                }
            }
        } catch (error) {
            console.error("Erreur de récupération des données latest:", error);
        }
    }

    /**
     * Lance le fetch initial et ouvre la connexion WebSocket temps réel.
     */
    _connectAndFetch() {
        // Fetch initial au montage
        this._fetchViabilite();
        this._fetchLatest();

        // Connexion WebSocket pour le flux temps réel
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        this._ws = new WebSocket(wsUrl);

        this._ws.onopen = () => {
            console.log("Connecté au WebSocket des mesures en temps réel");
        };

        this._ws.onmessage = (event) => {
            try {
                const result = JSON.parse(event.data);
                if (result.donnees) {
                    this.setState({
                        data: {
                            temperature: Number(result.donnees.temperature).toFixed(1),
                            humidite: Number(result.donnees.humidite).toFixed(1),
                            co2: result.donnees.co2 ?? result.donnees.CO2,
                        },
                        alertes: result.messages || [],
                    });

                    // Mise à jour de la viabilité à chaque nouvelle mesure
                    this._fetchViabilite();
                }
            } catch (error) {
                console.error("Erreur lors du traitement WS:", error);
            }
        };

        this._ws.onerror = (error) => {
            console.error("Erreur WebSocket:", error);
        };
    }

    render() {
        const { roverConnected } = this.props;
        const { data, alertes, viabilite } = this.state;

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
    }
}

export default TempsReel;