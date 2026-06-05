// Fonctions utilitaires regroupées dans une classe

/**
 * Classe Helpers — Regroupe les fonctions utilitaires sous forme de méthodes statiques.
 */
class Helpers {
    /**
     * Vérifie la validité d'une adresse email (Regex).
     * @param {string} email
     * @returns {boolean}
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Vérifie la longueur du mot de passe (min 6 caractères).
     * @param {string} password
     * @returns {boolean}
     */
    static isValidPassword(password) {
        return password && password.length >= 6;
    }

    /**
     * Formate une date en français.
     * @param {string|Date} date
     * @returns {string}
     */
    static formatDate(date) {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    /**
     * Met la première lettre d'une chaîne en majuscule.
     * @param {string} str
     * @returns {string}
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Exports nommés pour compatibilité avec les imports existants
export const isValidEmail = Helpers.isValidEmail;
export const isValidPassword = Helpers.isValidPassword;
export const formatDate = Helpers.formatDate;
export const capitalize = Helpers.capitalize;

export default Helpers;
