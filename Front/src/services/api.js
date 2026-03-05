// Appels au serveur pour le front

// L'url du serveur
const API_URL = process.env.REACT_APP_API_URL || '';

// Fonction pour faire une requête au serveur
const request = async (endpoint, options = {}) => {
    // Récupère le token
    const token = localStorage.getItem('token');

    // Prépare la requête
    const config = {
        headers: {
            'Content-Type': 'application/json',
            // Ajout du token si on est connecté
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    try {
        // Envoi de la requête
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Déconnexion si le token est invalide
        if (response.status === 401 && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/login/2fa/verify') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }

        // Convertit en JSON
        const data = await response.json();

        // Erreur si réponse pas ok
        if (!response.ok) {
            throw new Error(data.message || 'Une erreur est survenue');
        }

        return data;
    } catch (error) {
        // Affiche l'erreur en console
        console.error(`Erreur API [${endpoint}]:`, error.message);
        throw error;
    }
};

// Connexion École Directe
export const authAPI = {
    // Envoie les identifiants
    login: (identifiant, motdepasse) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifiant, motdepasse }),
        }),

    // Valide la 2FA
    verify2FA: (sessionId, answer) =>
        request('/api/auth/login/2fa/verify', {
            method: 'POST',
            body: JSON.stringify({ sessionId, answer }),
        }),
};

// Fonctions pour le rover
export const roverAPI = {
    // Statut du rover
    getStatus: () => request('/api/rover/status'),

    // Envoie une commande
    sendCommand: (command) =>
        request('/api/rover/command', {
            method: 'POST',
            body: JSON.stringify({ command }),
        }),
};

export default request;
