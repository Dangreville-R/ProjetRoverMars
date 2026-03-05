import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
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

// page de connexion via École Directe
const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // les states pour le formulaire
    const [identifiant, setIdentifiant] = useState('');
    const [motdepasse, setMotdepasse] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // cette fonction se lance quand on clique sur "Se connecter"
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // on verifie que les champs ne sont pas vides
        if (!identifiant.trim()) {
            setError('Veuillez entrer votre identifiant.');
            return;
        }

        if (!motdepasse) {
            setError('Veuillez entrer votre mot de passe.');
            return;
        }

        setLoading(true);

        try {
            // on envoie les identifiants au back-end qui contacte École Directe
            const data = await authAPI.login(identifiant, motdepasse);
            // si ca marche on connecte l'utilisateur
            login(data.user, data.token);
            // et on redirige vers le dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Identifiant ou mot de passe incorrect.');
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
                {/* en-tete */}
                <div className="login-header">
                    <h1>Connexion</h1>
                    <p>Connectez-vous avec votre compte École Directe</p>
                </div>

                {/* message d'erreur */}
                {error && <div className="login-error">{error}</div>}

                {/* formulaire de connexion */}
                <form onSubmit={handleSubmit} className="login-form">
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

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        Se connecter
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
