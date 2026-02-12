import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import { isValidEmail } from '../../utils/helpers';
import './Login.css';

// page de connexion
const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // les states pour le formulaire
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // cette fonction se lance quand on clique sur le bouton "Lancer la mission"
    const handleSubmit = async (e) => {
        e.preventDefault(); // empeche le rechargement de la page
        setError(''); // on reset l'erreur

        // on verifie que l'email est valide
        if (!isValidEmail(email)) {
            setError('Veuillez entrer un email valide.');
            return;
        }

        // on verifie que le mot de passe fait au moins 6 caracteres
        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        setLoading(true); // on met le bouton en mode chargement

        try {
            // on envoie les infos au serveur
            const data = await authAPI.login(email, password);
            // si ca marche on connecte l'utilisateur
            login(data.user, data.token);
            // et on redirige vers le dashboard
            navigate('/dashboard');
        } catch (err) {
            // si ca marche pas on affiche l'erreur
            setError(err.message || 'Email ou mot de passe incorrect.');
        } finally {
            setLoading(false); // on arrete le chargement dans tous les cas
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* en-tete avec le logo et le titre */}
                <div className="login-header">
                    <div className="login-logo">🚀</div>
                    <h1>Mission Rover</h1>
                    <p>Identifiez-vous pour accéder au contrôle</p>
                </div>

                {/* message d'erreur (s'affiche seulement si y'a une erreur) */}
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
                        Lancer la mission
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
