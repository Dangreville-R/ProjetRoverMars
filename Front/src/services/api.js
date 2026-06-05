// Service API — Appels au serveur pour le front

/**
 * Classe ApiService — Encapsule toutes les requêtes vers le serveur backend.
 * Gère le token d'authentification, la déconnexion automatique et les erreurs.
 */
class ApiService {
    constructor() {
        // L'url du serveur
        this._apiUrl = process.env.REACT_APP_API_URL || '';

        // Connexion École Directe
        this.authAPI = {
            // Envoie les identifiants
            login: (identifiant, motdepasse) =>
                this.request('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ identifiant, motdepasse }),
                }),

            // Valide la 2FA
            verify2FA: (sessionId, answer) =>
                this.request('/api/auth/login/2fa/verify', {
                    method: 'POST',
                    body: JSON.stringify({ sessionId, answer }),
                }),
        };

        // Fonctions pour le rover
        this.roverAPI = {
            // Statut du rover
            getStatus: () => this.request('/api/rover/status'),

            // Envoie une commande
            sendCommand: (command) =>
                this.request('/api/rover/command', {
                    method: 'POST',
                    body: JSON.stringify({ command }),
                }),
        };
    }

    /**
     * Effectue une requête HTTP vers le serveur backend.
     * Ajoute automatiquement le token d'authentification si disponible.
     * Gère la déconnexion automatique en cas de 401.
     * @param {string} endpoint - Le chemin de l'API
     * @param {Object} options - Options fetch (method, body, headers...)
     * @returns {Promise<Object>} Les données JSON de la réponse
     */
    async request(endpoint, options = {}) {
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
            const response = await fetch(`${this._apiUrl}${endpoint}`, config);

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
    }

    /**
     * Récupère la dernière mesure depuis le serveur.
     * @returns {Promise<Object>} Les données de la dernière mesure
     */
    async fetchLastMesure() {
        const response = await fetch('http://172.29.17.249:3000/api/mesures/latest');

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        return await response.json();
    }
}

// Instance singleton
const apiService = new ApiService();

// Exports nommés pour compatibilité avec les imports existants
export const authAPI = apiService.authAPI;
export const roverAPI = apiService.roverAPI;
export const fetchLastMesure = () => apiService.fetchLastMesure();

export default apiService;