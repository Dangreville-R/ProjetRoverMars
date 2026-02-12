import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import './Dashboard.css';

// page dashboard - c'est la page principale quand on est connecté
const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // fonction pour se deconnecter
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            {/* barre de navigation en haut */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav__brand">
                    <span className="dashboard-nav__logo">🚀</span>
                    <span className="dashboard-nav__title">Rover Mars</span>
                </div>
                <div className="dashboard-nav__actions">
                    {/* on affiche le nom de l'utilisateur */}
                    <span className="dashboard-nav__user">
                        👤 {user?.username || user?.email || 'Pilote'}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        Déconnexion
                    </Button>
                </div>
            </nav>

            {/* contenu principal */}
            <main className="dashboard-content">
                <div className="dashboard-welcome">
                    <h1>Bienvenue, {user?.username || 'Pilote'} 👋</h1>
                    <p>Tableau de bord du Rover Mars — prêt à explorer.</p>
                </div>

                {/* les cartes avec les infos du rover */}
                <div className="dashboard-grid">
                    {/* carte statut */}
                    <div className="dashboard-card">
                        <div className="dashboard-card__icon">📡</div>
                        <h3>Statut Rover</h3>
                        <p className="dashboard-card__value dashboard-card__value--success">
                            En ligne
                        </p>
                    </div>

                    {/* carte temperature */}
                    <div className="dashboard-card">
                        <div className="dashboard-card__icon">🌡️</div>
                        <h3>Température</h3>
                        <p className="dashboard-card__value">-63°C</p>
                    </div>

                    {/* carte batterie */}
                    <div className="dashboard-card">
                        <div className="dashboard-card__icon">🔋</div>
                        <h3>Batterie</h3>
                        <p className="dashboard-card__value">87%</p>
                    </div>

                    {/* carte position */}
                    <div className="dashboard-card">
                        <div className="dashboard-card__icon">📍</div>
                        <h3>Position</h3>
                        <p className="dashboard-card__value">Cratère Jezero</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
