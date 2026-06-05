import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components';
import { authAPI } from '../../services/api';
import { isValidEmail, isValidPassword } from '../../utils/helpers';
import { withRouter } from '../../utils/withRouter';
import './Register.css';

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
 * Classe Register — Page d'inscription.
 * Gère le formulaire d'inscription avec validation et indicateur de force du mot de passe.
 */
class Register extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            formData: {
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
            },
            error: '',
            loading: false,
        };

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    /**
     * Met à jour un champ du formulaire.
     * @param {string} field - Le nom du champ
     * @returns {Function} Le handler onChange
     */
    handleChange(field) {
        return (e) => {
            this.setState((prev) => ({
                formData: { ...prev.formData, [field]: e.target.value },
            }));
        };
    }

    /**
     * Calcule la force du mot de passe (remplace useMemo).
     * @returns {Object} { level, text }
     */
    _getPasswordStrength() {
        const pwd = this.state.formData.password;
        if (!pwd) return { level: 0, text: '' };

        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;

        const levels = [
            { level: 0, text: '' },
            { level: 1, text: 'Faible' },
            { level: 2, text: 'Moyen' },
            { level: 3, text: 'Fort' },
        ];

        return levels[score] || levels[0];
    }

    /**
     * Retourne la classe CSS pour la barre de force du mot de passe.
     * @param {Object} passwordStrength
     * @returns {string}
     */
    _getStrengthClass(passwordStrength) {
        if (passwordStrength.level >= 3) return 'register-password-strength--strong';
        if (passwordStrength.level >= 2) return 'register-password-strength--medium';
        return '';
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.setState({ error: '' });

        const { formData } = this.state;

        if (formData.username.trim().length < 3) {
            this.setState({ error: "Le nom d'utilisateur doit contenir au moins 3 caractères." });
            return;
        }

        if (!isValidEmail(formData.email)) {
            this.setState({ error: 'Veuillez entrer un email valide.' });
            return;
        }

        if (!isValidPassword(formData.password)) {
            this.setState({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            this.setState({ error: 'Les mots de passe ne correspondent pas.' });
            return;
        }

        this.setState({ loading: true });

        try {
            await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });
            this.props.navigate('/login');
        } catch (err) {
            this.setState({ error: err.message || "Erreur lors de l'inscription." });
        } finally {
            this.setState({ loading: false });
        }
    }

    render() {
        const { formData, error, loading } = this.state;
        const passwordStrength = this._getPasswordStrength();

        return (
            <div className="register-page">
                {/* Étoiles animées en fond */}
                <div className="register-stars">
                    {stars.map((star) => (
                        <div
                            key={star.id}
                            className={`register-star ${star.isLarge ? 'register-star--large' : ''}`}
                            style={{
                                left: `${star.left}%`,
                                top: `${star.top}%`,
                                '--star-duration': `${star.duration}s`,
                                '--star-delay': `${star.delay}s`,
                            }}
                        />
                    ))}
                </div>

                <div className="register-card">
                    {/* En-tête */}
                    <div className="register-header">
                        <h1>Inscription</h1>
                        <p>Créez votre compte pour piloter le rover</p>
                    </div>

                    {/* Message d'erreur */}
                    {error && <div className="register-error">{error}</div>}

                    {/* Formulaire d'inscription */}
                    <form onSubmit={this.handleSubmit} className="register-form">
                        <Input
                            label="Nom d'utilisateur"
                            type="text"
                            id="register-username"
                            placeholder="commandant_mars"
                            value={formData.username}
                            onChange={this.handleChange('username')}
                            required
                        />

                        <Input
                            label="Email"
                            type="email"
                            id="register-email"
                            placeholder="pilote@nasa.gov"
                            value={formData.email}
                            onChange={this.handleChange('email')}
                            required
                        />

                        <div>
                            <Input
                                label="Mot de passe"
                                type="password"
                                id="register-password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={this.handleChange('password')}
                                required
                            />
                            {/* Barre de force du mot de passe */}
                            {formData.password && (
                                <div className={`register-password-strength ${this._getStrengthClass(passwordStrength)}`}>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                        {[1, 2, 3].map((bar) => (
                                            <div
                                                key={bar}
                                                className={`register-password-strength__bar ${bar <= passwordStrength.level
                                                    ? 'register-password-strength__bar--active'
                                                    : ''
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="register-password-strength__text">
                                        {passwordStrength.text}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Input
                            label="Confirmer le mot de passe"
                            type="password"
                            id="register-confirm-password"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={this.handleChange('confirmPassword')}
                            required
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loading}
                        >
                            Créer mon compte
                        </Button>
                    </form>

                    {/* Lien de connexion */}
                    <p className="register-footer">
                        Déjà un compte ?{' '}
                        <Link to="/login">Se connecter</Link>
                    </p>
                </div>
            </div>
        );
    }
}

export default withRouter(Register);
