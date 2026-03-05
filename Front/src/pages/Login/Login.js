import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import './Login.css';

// Génère des étoiles pour le fond
const generateStars = (count) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            id: i,
            left: Math.random() * 100,
            top: Math.random() * 100,
            duration: 2 + Math.random() * 4,
            delay: Math.random() * 3,
            isLarge: Math.random() > 0.85,
        });
    }
    return stars;
};

// Crée les étoiles une fois
const stars = generateStars(50);

// Page de connexion École Directe
const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // States du formulaire
    const [identifiant, setIdentifiant] = useState('');
    const [motdepasse, setMotdepasse] = useState('');
    const [twoFactorData, setTwoFactorData] = useState(null); // { question, propositions, sessionId }
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Gère la soumission du formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (twoFactorData) {
                // Validation de la 2FA
                if (!selectedAnswer) {
                    setError('Veuillez sélectionner une réponse.');
                    setLoading(false);
                    return;
                }
                const data = await authAPI.verify2FA(twoFactorData.sessionId, selectedAnswer);
                login(data.user, data.token);
                navigate('/dashboard');
            } else {
                // Connexion initiale
                if (!identifiant.trim() || !motdepasse) {
                    setError('Veuillez remplir tous les champs.');
                    setLoading(false);
                    return;
                }

                const data = await authAPI.login(identifiant, motdepasse);

                if (data.twoFactorRequired) {
                    setTwoFactorData(data);
                } else {
                    login(data.user, data.token);
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError(err.message || 'Erreur lors de la connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Étoiles animées en fond */}
            <div className="login-stars">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className={`login-star ${star.isLarge ? 'login-star--large' : ''}`}
                        style={{
                            left: `${star.left}%`,
                            top: `${star.top}%`,
                            '--star-duration': `${star.duration}s`,
                            '--star-delay': `${star.delay}s`,
                        }}
                    />
                ))}
            </div>

            <div className="login-card">
                {/* En-tête */}
                <div className="login-header">
                    <h1>Connexion</h1>
                    <p>Connectez-vous avec votre compte École Directe</p>
                </div>

                {/* Message d'erreur */}
                {error && <div className="login-error">{error}</div>}

                {/* Formulaire de connexion */}
                <form onSubmit={handleSubmit} className="login-form">
                    {!twoFactorData ? (
                        <>
                            <Input
                                label="Identifiant"
                                type="text"
                                id="login-identifiant"
                                placeholder="prenom.nom"
                                value={identifiant}
                                onChange={(e) => setIdentifiant(e.target.value)}
                                required
                            />

                            <Input
                                label="Mot de passe"
                                type="password"
                                id="login-motdepasse"
                                placeholder="••••••••"
                                value={motdepasse}
                                onChange={(e) => setMotdepasse(e.target.value)}
                                required
                            />
                        </>
                    ) : (
                        <div className="login-2fa">
                            <label className="input-label" style={{ marginBottom: '1rem', display: 'block' }}>
                                🛡️ Double Authentification
                            </label>
                            <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                                {twoFactorData.question}
                            </p>
                            <div className="login-2fa-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '10px',
                                marginBottom: '20px'
                            }}>
                                {twoFactorData.propositions.map((prop, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedAnswer(prop)}
                                        className={`btn btn--outline ${selectedAnswer === prop ? 'btn--primary' : ''}`}
                                        style={{ fontSize: '0.8rem', padding: '10px' }}
                                    >
                                        {prop}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        {twoFactorData ? 'Valider' : 'Se connecter'}
                    </Button>

                    {twoFactorData && (
                        <button
                            type="button"
                            onClick={() => setTwoFactorData(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                marginTop: '1.5rem',
                                width: '100%',
                                fontSize: '0.85rem'
                            }}
                        >
                            Retour à la connexion
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;
