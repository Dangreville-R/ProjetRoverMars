/**
 * Classe AdminConfig — Gère la configuration des seuils d'alerte et de fréquence.
 * Encapsule les paramètres modifiables par l'administrateur.
 */
class AdminConfig {
    constructor() {
        // configuration par défaut (seuils et fréquence)
        this._config = {
            T_min: 5,
            T_max: 35,
            CO2_max: 1000,
            H_max: 70,
            frequence: 3
        };
    }

    /**
     * Retourne la configuration actuelle.
     * @returns {Object} { T_min, T_max, CO2_max, H_max, frequence }
     */
    get() {
        return this._config;
    }

    /**
     * Met à jour la configuration avec les nouvelles valeurs fournies.
     * Seules les clés présentes dans newValues sont modifiées.
     * @param {Object} newValues - Les nouvelles valeurs à appliquer
     */
    update(newValues) {
        const { T_min, T_max, CO2_max, H_max, frequence } = newValues;
        if (T_min !== undefined) this._config.T_min = Number(T_min);
        if (T_max !== undefined) this._config.T_max = Number(T_max);
        if (CO2_max !== undefined) this._config.CO2_max = Number(CO2_max);
        if (H_max !== undefined) this._config.H_max = Number(H_max);
        if (frequence !== undefined) this._config.frequence = Number(frequence);
        console.log('Config admin mise à jour :', this._config);
    }
}

module.exports = AdminConfig;
