import React, { createContext } from 'react';

// Contexte d'authentification global
export const AuthContext = createContext(null);

/**
 * Classe AuthProvider — Wrappe l'application pour fournir les infos de connexion.
 * Gère le state utilisateur, le chargement et les fonctions login/logout.
 */
export class AuthProvider extends React.Component {
    constructor(props) {
        super(props);

        // Infos de l'utilisateur et état de chargement
        this.state = {
            user: null,
            loading: true,
        };

        // Lie les méthodes au contexte de la classe
        this.login = this.login.bind(this);
        this.logout = this.logout.bind(this);
    }

    // Vérifie le token au chargement
    componentDidMount() {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        // Charge l'utilisateur si token présent
        if (token && savedUser) {
            try {
                this.setState({ user: JSON.parse(savedUser) });
            } catch (error) {
                // Nettoie tout si erreur
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        // Fin du chargement
        this.setState({ loading: false });
    }

    /**
     * Connecte l'utilisateur et sauvegarde le token.
     * @param {Object} userData - Les données de l'utilisateur
     * @param {string} token - Le token d'authentification
     */
    login(userData, token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        this.setState({ user: userData });
    }

    /**
     * Déconnecte l'utilisateur et vide le localStorage.
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.setState({ user: null });
    }

    render() {
        // Valeurs partagées
        const value = {
            user: this.state.user,
            loading: this.state.loading,
            login: this.login,
            logout: this.logout,
            isAuthenticated: !!this.state.user, // Vrai si connecté
        };

        // Retourne le Provider
        return (
            <AuthContext.Provider value={value}>
                {this.props.children}
            </AuthContext.Provider>
        );
    }
}
