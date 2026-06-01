import React from 'react';
import { Button, Input } from '../../components';
import { AuthContext } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { withRouter } from '../../utils/withRouter';
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

/**
 * Classe Login — Page de connexion École Directe.
 * Gère le formulaire de login, la double authentification et la navigation.
 */
class Login extends React.Component {
    // Accès au contexte d'authentification
    static contextType = AuthContext;

    constructor(props) {
        super(props);

        // States du formulaire
        this.state = {
            identifiant: '',
            motdepasse: '',
            twoFactorData: null, // { question, propositions, sessionId }
            selectedAnswer: '',
            error: '',
            loading: false,
        };

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    // Gère la soumission du formulaire
    async handleSubmit(e) {
        e.preventDefault();
        this.setState({ error: '', loading: true });

        try {
            if (this.state.twoFactorData) {
                // Validation de la 2FA
                if (!this.state.selectedAnswer) {
                    this.setState({ error: 'Veuillez sélectionner une réponse.', loading: false });
                    return;
                }
                const data = await authAPI.verify2FA(this.state.twoFactorData.sessionId, this.state.selectedAnswer);
                this.context.login(data.user, data.token);
                this.props.navigate('/dashboard');
            } else {
                // Connexion initiale
                if (!this.state.identifiant.trim() || !this.state.motdepasse) {
                    this.setState({ error: 'Veuillez remplir tous les champs.', loading: false });
                    return;
                }

                const data = await authAPI.login(this.state.identifiant, this.state.motdepasse);

                if (data.twoFactorRequired) {
                    this.setState({ twoFactorData: data });
                } else {
                    this.context.login(data.user, data.token);
                    this.props.navigate('/dashboard');
                }
            }
        } catch (err) {
            this.setState({ error: err.message || 'Erreur lors de la connexion.' });
        } finally {
            this.setState({ loading: false });
        }
    }

    render() {
        const { identifiant, motdepasse, twoFactorData, selectedAnswer, error, loading } = this.state;

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
                    <form onSubmit={this.handleSubmit} className="login-form">
                        {!twoFactorData ? (
                            <>
                                <Input
                                    label="Identifiant"
                                    type="text"
                                    id="login-identifiant"
                                    placeholder="prenom.nom"
                                    value={identifiant}
                                    onChange={(e) => this.setState({ identifiant: e.target.value })}
                                    required
                                />

                                <Input
                                    label="Mot de passe"
                                    type="password"
                                    id="login-motdepasse"
                                    placeholder="••••••••"
                                    value={motdepasse}
                                    onChange={(e) => this.setState({ motdepasse: e.target.value })}
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
                                            onClick={() => this.setState({ selectedAnswer: prop })}
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
                                onClick={() => this.setState({ twoFactorData: null })}
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
    }
}

export default withRouter(Login);
