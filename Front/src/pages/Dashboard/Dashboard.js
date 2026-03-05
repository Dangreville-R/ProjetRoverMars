import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import TempsReel from './tabs/TempsReel';
import Historique from './tabs/Historique';
import Admin from './tabs/Admin';
import './Dashboard.css';

// page dashboard - c'est la page principale quand on est connecte
const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // state pour le statut de connexion du rover
    // en vrai ca serait mis a jour par une connexion MQTT ou un appel API
    const [roverConnected, setRoverConnected] = useState(false);

    // state pour ouvrir/fermer le menu mobile
    const [menuOpen, setMenuOpen] = useState(false);

    // fonction pour se deconnecter
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // les onglets de navigation
    const tabs = [
        { path: 'temps-reel', label: 'Temps Réel', icon: '📡' },
        { path: 'historique', label: 'Historique', icon: '📊' },
        { path: 'admin', label: 'Admin', icon: '⚙️' },
    ];

    // le nom a afficher (on gere les 2 formats : École Directe et custom)
    const displayName = user?.prenom
        ? `${user.prenom} ${user.nom}`
        : user?.username || 'Pilote';

    return (
        <div className="dashboard">
            {/* barre de navigation en haut */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav__left">
                    <div className="dashboard-nav__brand">
                        <span className="dashboard-nav__title">Rover Mars</span>
                    </div>

                    {/* statut de connexion du rover */}
                    <button
                        className={`dashboard-rover-status ${roverConnected ? 'dashboard-rover-status--online' : ''}`}
                        onClick={() => setRoverConnected(!roverConnected)}
                        title="Cliquer pour simuler connexion/déconnexion"
                    >
                        <span className="dashboard-rover-status__dot" />
                        <span className="dashboard-rover-status__text">
                            Rover {roverConnected ? 'Connecté' : 'Déconnecté'}
                        </span>
                    </button>
                </div>

                {/* bouton hamburger pour mobile */}
                <button
                    className={`dashboard-nav__burger ${menuOpen ? 'dashboard-nav__burger--open' : ''}`}
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                >
                    <span />
                    <span />
                    <span />
                </button>

                <div className={`dashboard-nav__right ${menuOpen ? 'dashboard-nav__right--open' : ''}`}>
                    {/* onglets de navigation */}
                    <div className="dashboard-tabs">
                        {tabs.map((tab) => (
                            <NavLink
                                key={tab.path}
                                to={`/dashboard/${tab.path}`}
                                className={({ isActive }) =>
                                    `dashboard-tab ${isActive ? 'dashboard-tab--active' : ''}`
                                }
                                onClick={() => setMenuOpen(false)}
                            >
                                <span className="dashboard-tab__icon">{tab.icon}</span>
                                <span className="dashboard-tab__label">{tab.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* infos utilisateur et deconnexion */}
                    <div className="dashboard-nav__user-section">
                        <span className="dashboard-nav__user">
                            {displayName}
                        </span>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </nav>

            {/* contenu principal avec les sous-routes */}
            <main className="dashboard-content">
                <Routes>
                    {/* par defaut on redirige vers temps-reel */}
                    <Route index element={<Navigate to="temps-reel" replace />} />
                    <Route path="temps-reel" element={<TempsReel roverConnected={roverConnected} />} />
                    <Route path="historique" element={<Historique />} />
                    <Route path="admin" element={<Admin />} />
                </Routes>
            </main>
        </div>
    );
};

export default Dashboard;
