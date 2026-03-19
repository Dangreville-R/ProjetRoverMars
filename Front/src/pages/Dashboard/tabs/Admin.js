import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import './Admin.css';

// Page Admin
const Admin = () => {
    const { user } = useAuth();

    // States pour les seuils et la fréquence
    const [config, setConfig] = useState({
        T_min: 5,
        T_max: 35,
        CO2_max: 1000,
        H_max: 70,
        frequence: 3
    });
    const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
    const [isSaving, setIsSaving] = useState(false);

    // Récupérer la config actuelle au chargement
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/api/admin/config');
                if (response.ok) {
                    const data = await response.json();
                    setConfig(data);
                }
            } catch (error) {
                console.error("Erreur de récupération de la config:", error);
            }
        };
        fetchConfig();
    }, []);

    // Mise à jour d'un champ
    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        setSaveStatus(null);
    };

    // Sauvegarde via l'API
    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const response = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (response.ok) {
                setSaveStatus('success');
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error("Erreur de sauvegarde:", error);
            setSaveStatus('error');
        }
        setIsSaving(false);
        // Masquer le message après 3 secondes
        setTimeout(() => setSaveStatus(null), 3000);
    };

    // Infos système (lecture seule)
    const systemInfo = [
        { label: 'Utilisateur connecté', value: user?.prenom ? `${user.prenom} ${user.nom}` : user?.username || 'Inconnu' },
        { label: 'Type de compte', value: user?.typeCompte || 'N/A' },
        { label: 'API Backend', value: 'http://localhost:3001' },
        { label: 'Version Front', value: '1.0.0' },
    ];

    // Définition des champs de seuils
    const seuilFields = [
        { key: 'T_min', label: 'Température min (°C)', description: 'Seuil minimum de température acceptable', unit: '°C' },
        { key: 'T_max', label: 'Température max (°C)', description: 'Seuil maximum de température acceptable', unit: '°C' },
        { key: 'CO2_max', label: 'CO2 max (ppm)', description: 'Concentration maximale de CO2 acceptable', unit: 'ppm' },
        { key: 'H_max', label: 'Humidité max (%)', description: 'Taux d\'humidité maximum acceptable', unit: '%' },
    ];

    return (
        <div className="admin">
            <div className="admin__header">
                <h2>Administration</h2>
                <p>Configuration du système et paramètres de viabilité</p>
            </div>

            {/* Infos système */}
            <div className="admin__section">
                <h3 className="admin__section-title">Informations système</h3>
                <div className="admin__info-grid">
                    {systemInfo.map((info) => (
                        <div key={info.label} className="admin__info-item">
                            <span className="admin__info-label">{info.label}</span>
                            <span className="admin__info-value">{info.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Seuils de viabilité */}
            <div className="admin__section">
                <h3 className="admin__section-title">Seuils de viabilité</h3>
                <div className="admin__form-grid">
                    {seuilFields.map((field) => (
                        <div key={field.key} className="admin__form-group">
                            <label className="admin__form-label">{field.label}</label>
                            <p className="admin__form-desc">{field.description}</p>
                            <div className="admin__input-wrapper">
                                <input
                                    type="number"
                                    className="admin__input"
                                    value={config[field.key]}
                                    onChange={(e) => handleChange(field.key, Number(e.target.value))}
                                />
                                <span className="admin__input-unit">{field.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fréquence d'échantillonnage */}
            <div className="admin__section">
                <h3 className="admin__section-title">Fréquence d'échantillonnage</h3>
                <div className="admin__form-group admin__form-group--single">
                    <label className="admin__form-label">Intervalle entre chaque mesure</label>
                    <p className="admin__form-desc">Définit la fréquence à laquelle le rover envoie ses relevés de capteurs</p>
                    <div className="admin__input-wrapper">
                        <input
                            type="number"
                            className="admin__input"
                            value={config.frequence}
                            onChange={(e) => handleChange('frequence', Number(e.target.value))}
                            min="1"
                            max="60"
                        />
                        <span className="admin__input-unit">sec</span>
                    </div>
                </div>
            </div>

            {/* Bouton sauvegarder + message statut */}
            <div className="admin__actions">
                <button 
                    className={`admin__save-btn ${isSaving ? 'saving' : ''}`}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <Save size={16} />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </button>

                {saveStatus === 'success' && (
                    <div className="admin__status admin__status--success">
                        <CheckCircle size={16} />
                        Configuration sauvegardée avec succès !
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="admin__status admin__status--error">
                        <AlertCircle size={16} />
                        Erreur lors de la sauvegarde.
                    </div>
                )}
            </div>

            {/* Note */}
            <p className="admin__note">
                Les paramètres sont sauvegardés en mémoire sur le serveur et seront réinitialisés au redémarrage.
            </p>
        </div>
    );
};

export default Admin;
