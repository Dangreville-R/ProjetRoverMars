import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Radio, BarChart2, Settings } from 'lucide-react';
import { Button } from '../../components';
import { AuthContext } from '../../context/AuthContext';
import { withRouter } from '../../utils/withRouter';
import TempsReel from './tabs/TempsReel';
import Historique from './tabs/Historique';
import Admin from './tabs/Admin';
import './Dashboard.css';

/**
 * Classe Dashboard — Page principale quand on est connecté.
 * Gère la navigation par onglets, le statut du rover et la déconnexion.
 */
class Dashboard extends React.Component {
    // Accès au contexte d'authentification
    static contextType = AuthContext;

    constructor(props) {
        super(props);

        // Statut de connexion du rover et état du menu mobile
        this.state = {
            roverConnected: false,
            menuOpen: false,
        };

        this.handleLogout = this.handleLogout.bind(this);
    }

    // Fonction de déconnexion
    handleLogout() {
        this.context.logout();
        this.props.navigate('/login');
    }

    render() {
        const { user } = this.context;
        const { roverConnected, menuOpen } = this.state;

        // Onglets du menu
        const tabs = [
            { path: 'temps-reel', label: 'Temps Réel', icon: <Radio size={20} /> },
            { path: 'historique', label: 'Historique', icon: <BarChart2 size={20} /> },
            { path: 'admin', label: 'Admin', icon: <Settings size={20} /> },
        ];

        // Nom à afficher
        const displayName = user?.prenom
            ? `${user.prenom} ${user.nom}`
            : user?.username || 'Pilote';

        return (
            <div className="dashboard">
                {/* Navigation en haut */}
                <nav className="dashboard-nav">
                    <div className="dashboard-nav__left">
                        <div className="dashboard-nav__brand">
                            <span className="dashboard-nav__title">Rover Mars</span>
                        </div>

                        {/* Bouton statut du rover */}
                        <button
                            className={`dashboard-rover-status ${roverConnected ? 'dashboard-rover-status--online' : ''}`}
                            onClick={() => this.setState({ roverConnected: !roverConnected })}
                            title="Cliquer pour simuler connexion/déconnexion"
                        >
                            <span className="dashboard-rover-status__dot" />
                            <span className="dashboard-rover-status__text">
                                Rover {roverConnected ? 'Connecté' : 'Déconnecté'}
                            </span>
                        </button>
                    </div>

                    {/* Menu burger */}
                    <button
                        className={`dashboard-nav__burger ${menuOpen ? 'dashboard-nav__burger--open' : ''}`}
                        onClick={() => this.setState({ menuOpen: !menuOpen })}
                        aria-label="Menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <div className={`dashboard-nav__right ${menuOpen ? 'dashboard-nav__right--open' : ''}`}>
                        {/* Onglets de navigation */}
                        <div className="dashboard-tabs">
                            {tabs.map((tab) => (
                                <NavLink
                                    key={tab.path}
                                    to={`/dashboard/${tab.path}`}
                                    className={({ isActive }) =>
                                        `dashboard-tab ${isActive ? 'dashboard-tab--active' : ''}`
                                    }
                                    onClick={() => this.setState({ menuOpen: false })}
                                >
                                    <span className="dashboard-tab__icon">{tab.icon}</span>
                                    <span className="dashboard-tab__label">{tab.label}</span>
                                </NavLink>
                            ))}
                        </div>

                        {/* Déconnexion */}
                        <div className="dashboard-nav__user-section">
                            <span className="dashboard-nav__user">
                                {displayName}
                            </span>
                            <Button variant="outline" size="sm" onClick={this.handleLogout}>
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </nav>

                {/* Contenu de la page */}
                <main className="dashboard-content">
                    <Routes>
                        {/* Redirection par défaut */}
                        <Route index element={<Navigate to="temps-reel" replace />} />
                        <Route path="temps-reel" element={<TempsReel roverConnected={roverConnected} />} />
                        <Route path="historique" element={<Historique roverConnected={roverConnected} />} />
                        <Route path="admin" element={<Admin />} />
                    </Routes>
                </main>
            </div>
        );
    }
}

export default withRouter(Dashboard);
