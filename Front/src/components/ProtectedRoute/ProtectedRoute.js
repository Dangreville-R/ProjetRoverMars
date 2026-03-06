import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Protège les pages nécessitant une connexion
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    // Affiche le chargement de vérification
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                color: '#94a3b8'
            }}>
                Chargement...
            </div>
        );
    }

    // Redirige vers login si non connecté
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Affiche la page si connecté
    return children;
};

export default ProtectedRoute;
