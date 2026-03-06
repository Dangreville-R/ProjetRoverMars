// Fonctions utilitaires

// Vérifie l'email (Regex)
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Vérifie la longueur du mot de passe (min 6)
export const isValidPassword = (password) => {
    return password && password.length >= 6;
};

// Formate la date en français
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Mets la première lettre en majuscule
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};
