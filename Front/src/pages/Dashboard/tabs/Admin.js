import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import './Admin.css';

// page admin - pour configurer le rover et voir les infos systeme
const Admin = () => {
    const { user } = useAuth();

    // les infos systeme a afficher
    const systemInfo = [
        { label: 'Utilisateur connecté', value: user?.prenom ? `${user.prenom} ${user.nom}` : user?.username || 'Inconnu' },
        { label: 'Type de compte', value: user?.typeCompte || 'N/A' },
        { label: 'API Backend', value: 'http://localhost:3001' },
        { label: 'Version Front', value: '1.0.0' },
    ];

    // les parametres du rover
    const roverSettings = [
        { label: 'Fréquence de mesure', value: '3 secondes', description: 'Intervalle entre chaque relevé de capteur' },
        { label: 'Mode économie', value: 'Désactivé', description: 'Réduit la fréquence des mesures pour économiser la batterie' },
        { label: 'Alertes', value: 'Activées', description: 'Notifications quand une valeur dépasse un seuil' },
        { label: 'Protocole', value: 'MQTT', description: 'Protocole de communication avec le rover' },
    ];

    return (
        <div className="admin">
            <div className="admin__header">
                <h2>Administration</h2>
                <p>Configuration du système et informations</p>
            </div>

            {/* infos systeme */}
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

            {/* parametres rover */}
            <div className="admin__section">
                <h3 className="admin__section-title">Paramètres du Rover</h3>
                <div className="admin__settings">
                    {roverSettings.map((setting) => (
                        <div key={setting.label} className="admin__setting-row">
                            <div className="admin__setting-info">
                                <span className="admin__setting-label">{setting.label}</span>
                                <span className="admin__setting-desc">{setting.description}</span>
                            </div>
                            <span className="admin__setting-value">{setting.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* note */}
            <p className="admin__note">
                Les paramètres seront modifiables une fois le back-end connecté.
            </p>
        </div>
    );
};

export default Admin;
