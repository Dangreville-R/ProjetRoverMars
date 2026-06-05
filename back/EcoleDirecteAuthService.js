const axios = require('axios');
const crypto = require('crypto');

/**
 * Classe EcoleDirecteAuthService — Gère l'authentification via l'API École Directe.
 * Encapsule le login, la double authentification (2FA) et la gestion des sessions.
 */
class EcoleDirecteAuthService {
    constructor() {
        // stockage des sessions de double authentification en mémoire
        this._sessions2FA = {};
    }

    /**
     * Récupère le token GTK depuis l'API École Directe.
     * @returns {Promise<{gtkHeader: string, gtkCookie: string}>}
     */
    async fetchGTKToken() {
        const response = await axios.get('https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        const setCookie = response.headers['set-cookie'];
        if (!setCookie) throw new Error('Impossible de récupérer le token GTK.');

        const allCookies = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
        const match = allCookies.match(/GTK=([^;]+)/);
        if (!match) throw new Error('Token GTK introuvable dans les cookies.');

        const gtkValue = match[1];
        const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
        return { gtkHeader: gtkValue, gtkCookie: cookieHeader };
    }

    /**
     * Effectue une requête POST vers l'API École Directe.
     * @param {string} path - Le chemin de l'API (ex: '/login.awp?v=4.96.3')
     * @param {Object} payload - Le corps de la requête
     * @param {Object} extraHeaders - Headers supplémentaires
     * @returns {Promise<Object>} La réponse Axios
     */
    async ecoleDirecteRequest(path, payload = {}, extraHeaders = {}) {
        const body = new URLSearchParams({ data: JSON.stringify(payload) }).toString();
        const response = await axios.post(`https://api.ecoledirecte.com/v3${path}`, body, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                ...extraHeaders
            }
        });
        return response;
    }

    /**
     * Tente une connexion via École Directe.
     * Gère le cas simple (code 200) et le cas 2FA (code 250).
     * @param {string} identifiant
     * @param {string} motdepasse
     * @returns {Promise<Object>} Résultat de l'authentification
     */
    async login(identifiant, motdepasse) {
        const gtk = await this.fetchGTKToken();
        const response = await this.ecoleDirecteRequest('/login.awp?v=4.96.3', {
            identifiant,
            motdepasse,
            acceptationCharte: true
        }, {
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        const data = response.data;
        const token1 = data.token;
        const twofa1 = response.headers['2fa-token'] || token1;

        // cas 1 : connexion directe réussie
        if (data.code === 200 && token1) {
            const compte = data.data.accounts[0];
            return {
                success: true,
                token: token1,
                user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte, email: compte.email || '' }
            };
        }

        // cas 2 : double authentification requise
        if (data.code === 250) {
            const questionRes = await this.ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=get&v=4.96.3', {}, {
                'X-Token': token1,
                '2fa-Token': twofa1,
                'X-Gtk': gtk.gtkHeader,
                'Cookie': gtk.gtkCookie
            });
            const qData = questionRes.data.data || {};
            const rawQuestion = qData.question || '';
            const rawPropositions = qData.propositions || [];
            const question = rawQuestion ? Buffer.from(rawQuestion, 'base64').toString('utf8') : 'Vérification de sécurité';
            const propositions = rawPropositions.map(p => Buffer.from(p, 'base64').toString('utf8'));
            const sessionId = crypto.randomUUID();
            const token2 = questionRes.data.token || token1;
            const twofa2 = questionRes.headers['2fa-token'] || twofa1;

            // stockage de la session 2FA (expiration automatique après 5 minutes)
            this._sessions2FA[sessionId] = {
                identifiant, motdepasse, gtk,
                token: token2, twoFAToken: twofa2,
                rawPropositions, createdAt: Date.now()
            };
            setTimeout(() => { delete this._sessions2FA[sessionId]; }, 5 * 60 * 1000);

            return { success: false, twoFactorRequired: true, question, propositions, sessionId };
        }

        // cas 3 : erreur d'authentification
        return { success: false, error: true, message: data.message || 'Identifiant ou mot de passe incorrect.' };
    }

    /**
     * Vérifie la réponse 2FA et finalise la connexion.
     * @param {string} sessionId - L'identifiant de la session 2FA
     * @param {string} answer - La réponse choisie par l'utilisateur
     * @returns {Promise<Object>} Résultat de la vérification
     */
    async verify2FA(sessionId, answer) {
        const session = this._sessions2FA[sessionId];
        if (!session) return { error: true, status: 401, message: 'Session expirée ou invalide.' };

        const { identifiant, motdepasse, gtk, token, twoFAToken, rawPropositions } = session;
        const rawAnswer = rawPropositions.find(p => Buffer.from(p, 'base64').toString('utf8') === answer);
        if (!rawAnswer) return { error: true, status: 400, message: 'Réponse invalide.' };

        const ansRes = await this.ecoleDirecteRequest('/connexion/doubleauth.awp?verbe=post&v=4.96.3', { choix: rawAnswer }, {
            'X-Token': token, '2fa-Token': twoFAToken, 'X-Gtk': gtk.gtkHeader, 'Cookie': gtk.gtkCookie
        });

        if (ansRes.data.code !== 200) return { error: true, status: 401, message: 'Réponse 2FA incorrecte.' };

        const cn = ansRes.data.data?.cn || '';
        const cv = ansRes.data.data?.cv || '';
        const loginRes = await this.ecoleDirecteRequest('/login.awp?v=4.96.3', {
            identifiant, motdepasse, acceptationCharte: true, cn, cv
        }, {
            'X-Token': ansRes.data.token || token,
            '2fa-Token': ansRes.headers['2fa-token'] || twoFAToken,
            'X-Gtk': gtk.gtkHeader,
            'Cookie': gtk.gtkCookie
        });

        if (loginRes.data.code === 200 && loginRes.data.token) {
            delete this._sessions2FA[sessionId];
            const compte = loginRes.data.data.accounts[0];
            return {
                success: true,
                token: loginRes.data.token,
                user: { id: compte.id, prenom: compte.prenom, nom: compte.nom, typeCompte: compte.typeCompte }
            };
        }

        return { error: true, status: 401, message: 'Échec final 2FA.' };
    }
}

module.exports = EcoleDirecteAuthService;
