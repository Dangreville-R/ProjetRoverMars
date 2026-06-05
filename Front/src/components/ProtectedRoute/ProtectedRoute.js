import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/**
 * Classe ProtectedRoute — Protège les pages nécessitant une connexion.
 * Redirige vers /login si l'utilisateur n'est pas authentifié.
 */
class ProtectedRoute extends React.Component {
    // Accès au contexte d'authentification via static contextType
    static contextType = AuthContext;

    render() {
        const { user, loading } = this.context;
        const { children } = this.props;

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
    }
}

export default ProtectedRoute;
