import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// ce composant protege les pages qui necessitent d'etre connecté
// si l'utilisateur est pas connecté, on le redirige vers /login
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    // pendant qu'on verifie si l'utilisateur est connecté on affiche "Chargement..."
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

    // si l'utilisateur est pas connecté on le redirige vers login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // sinon on affiche la page normalement
    return children;
};

export default ProtectedRoute;
