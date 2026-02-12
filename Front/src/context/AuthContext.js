import React, { createContext, useState, useEffect } from 'react';

// on cree un contexte pour gerer l'authentification dans toute l'appli
// comme ca on peut savoir si l'utilisateur est connecté partout
export const AuthContext = createContext(null);

// ce composant va entourer toute l'application (dans index.js)
// il fournit les infos de connexion a tous les autres composants
export const AuthProvider = ({ children }) => {
    // state pour stocker les infos de l'utilisateur
    const [user, setUser] = useState(null);
    // state pour savoir si on est en train de charger
    const [loading, setLoading] = useState(true);

    // useEffect se lance au chargement de la page
    // on verifie si l'utilisateur etait deja connecté avant (token dans localStorage)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        // si on a un token et un user sauvegardé, on les charge
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                // si y'a une erreur (json cassé par exemple) on nettoie tout
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        // on a fini de charger
        setLoading(false);
    }, []);

    // fonction pour connecter l'utilisateur
    // on sauvegarde le token et les infos dans le localStorage
    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    // fonction pour deconnecter l'utilisateur
    // on supprime tout du localStorage
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // on met toutes les valeurs qu'on veut partager dans l'appli
    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user, // true si user existe, false sinon
    };

    // on retourne le Provider avec toutes les valeurs
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
