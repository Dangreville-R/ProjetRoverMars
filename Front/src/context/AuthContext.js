import React, { createContext, useState, useEffect } from 'react';

// Contexte d'authentification global
export const AuthContext = createContext(null);

// Wrappe l'application pour fournir les infos de connexion
export const AuthProvider = ({ children }) => {
    // Infos de l'utilisateur
    const [user, setUser] = useState(null);
    // État de chargement
    const [loading, setLoading] = useState(true);

    // Vérifie le token au chargement
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        // Charge l'utilisateur si token présent
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                // Nettoie tout si erreur
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        // Fin du chargement
        setLoading(false);
    }, []);

    // Connecte l'utilisateur et sauvegarde le token
    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    // Déconnecte l'utilisateur et vide le localStorage
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // Valeurs partagées
    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user, // Vrai si connecté
    };

    // Retourne le Provider
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
