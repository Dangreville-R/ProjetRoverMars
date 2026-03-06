import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import TempsReel from './tabs/TempsReel';
import Historique from './tabs/Historique';
import Admin from './tabs/Admin';
import './Dashboard.css';

// Page principale quand on est co
const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Statut de connexion du rover
    const [roverConnected, setRoverConnected] = useState(false);

    // État du menu mobile
    const [menuOpen, setMenuOpen] = useState(false);

    // Fonction de déconnexion
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Onglets du menu
    const tabs = [
        { path: 'temps-reel', label: 'Temps Réel', icon: '📡' },
        { path: 'historique', label: 'Historique', icon: '📊' },
        { path: 'admin', label: 'Admin', icon: '⚙️' },
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
                        onClick={() => setRoverConnected(!roverConnected)}
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
                    onClick={() => setMenuOpen(!menuOpen)}
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
                                onClick={() => setMenuOpen(false)}
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
                        <Button variant="outline" size="sm" onClick={handleLogout}>
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
                    <Route path="historique" element={<Historique />} />
                    <Route path="admin" element={<Admin />} />
                </Routes>
            </main>
        </div>
    );
};

export default Dashboard;
