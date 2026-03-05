import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import { isValidEmail } from '../../utils/helpers';
import './Login.css';

// on genere des etoiles aleatoires pour le fond spatial
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

// on cree les etoiles une seule fois (pas a chaque render)
const stars = generateStars(50);

// page de connexion
const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // les states pour le formulaire
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // cette fonction se lance quand on clique sur le bouton "Se connecter"
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isValidEmail(email)) {
            setError('Veuillez entrer un email valide.');
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setLoading(true);

        try {
            const data = await authAPI.login(email, password);
            login(data.user, data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Email ou mot de passe incorrect.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* les etoiles animees en fond */}
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
                {/* en-tete simple avec juste le titre */}
                <div className="login-header">
                    <h1>Connexion</h1>
                    <p>Identifiez-vous pour accéder au contrôle</p>
                </div>

                {/* message d'erreur */}
                {error && <div className="login-error">{error}</div>}

                {/* formulaire de connexion */}
                <form onSubmit={handleSubmit} className="login-form">
                    <Input
                        label="Email"
                        type="email"
                        id="login-email"
                        placeholder="pilote@nasa.gov"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <Input
                        label="Mot de passe"
                        type="password"
                        id="login-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        Se connecter
                    </Button>
                </form>

                {/* lien vers la page d'inscription */}
                <p className="login-footer">
                    Pas encore de compte ?{' '}
                    <Link to="/register">S'inscrire</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
