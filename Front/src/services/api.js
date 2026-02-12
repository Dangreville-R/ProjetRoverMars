// api.js - c'est ici qu'on fait les appels au serveur back-end
// on utilise fetch() pour envoyer des requetes HTTP

// l'url du serveur backend (si y'a pas de variable d'env on met localhost)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// cette fonction sert a faire des requetes au serveur
// elle ajoute automatiquement le token si l'utilisateur est connecté
const request = async (endpoint, options = {}) => {
    // on recupere le token dans le localStorage
    const token = localStorage.getItem('token');

    // on prepare la config de la requete
    const config = {
        headers: {
            'Content-Type': 'application/json',
            // si on a un token on l'ajoute dans le header
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    try {
        // on envoie la requete au serveur
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // si le serveur dit 401 ca veut dire que le token est plus valide
        // donc on deconnecte l'utilisateur
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        // on transforme la reponse en JSON
        const data = await response.json();

        // si la reponse est pas ok on lance une erreur
        if (!response.ok) {
            throw new Error(data.message || 'Une erreur est survenue');
        }

        return data;
    } catch (error) {
        // on affiche l'erreur dans la console pour debugger
        console.error(`Erreur API [${endpoint}]:`, error.message);
        throw error;
    }
};

// ici c'est les fonctions pour l'authentification (login et register)
export const authAPI = {
    // pour se connecter
    login: (email, password) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    // pour s'inscrire
    register: (userData) =>
        request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
};

// ici c'est les fonctions pour le rover (on les utilisera plus tard)
export const roverAPI = {
    // recuperer le statut du rover
    getStatus: () => request('/api/rover/status'),

    // envoyer une commande au rover
    sendCommand: (command) =>
        request('/api/rover/command', {
            method: 'POST',
            body: JSON.stringify({ command }),
        }),
};

export default request;
