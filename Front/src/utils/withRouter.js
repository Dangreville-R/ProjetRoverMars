import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

/**
 * HOC withRouter — Injecte navigate, params et location dans les composants de classe.
 * Nécessaire car React Router v6+ ne fournit ces fonctions que via des hooks.
 * @param {React.Component} Component - Le composant de classe à wrapper
 * @returns {Function} Le composant wrappé avec les props de navigation
 */
export function withRouter(Component) {
    function WrappedComponent(props) {
        const navigate = useNavigate();
        const params = useParams();
        const location = useLocation();
        return <Component {...props} navigate={navigate} params={params} location={location} />;
    }

    // Préserve le nom du composant pour le débogage React DevTools
    WrappedComponent.displayName = `withRouter(${Component.displayName || Component.name || 'Component'})`;

    return WrappedComponent;
}
