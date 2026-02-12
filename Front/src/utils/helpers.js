// helpers.js - fonctions utilitaires qu'on reutilise dans le projet

// verifie si un email est valide (avec un regex)
// par exemple "test@gmail.com" retourne true, "test" retourne false
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// verifie si le mot de passe est assez long (minimum 6 caracteres)
export const isValidPassword = (password) => {
    return password && password.length >= 6;
};

// formate une date en français
// par exemple "2024-01-15" devient "15 janvier 2024 à 00:00"
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// met la premiere lettre en majuscule
// par exemple "bonjour" devient "Bonjour"
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};
