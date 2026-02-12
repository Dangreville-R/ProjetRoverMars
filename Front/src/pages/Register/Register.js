import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components';
import { authAPI } from '../../services/api';
import { isValidEmail, isValidPassword } from '../../utils/helpers';
import './Register.css';

// page d'inscription
const Register = () => {
    const navigate = useNavigate();

    // on stocke toutes les infos du formulaire dans un seul state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // cette fonction met a jour un champ du formulaire
    // par exemple handleChange('email') va modifier formData.email
    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    // cette fonction se lance quand on clique sur "Créer mon compte"
    const handleSubmit = async (e) => {
        e.preventDefault(); // empeche le rechargement de la page
        setError('');

        // on verifie que l'email est correct
        if (!isValidEmail(formData.email)) {
            setError('Veuillez entrer un email valide.');
            return;
        }

        // on verifie que le mot de passe est assez long
        if (!isValidPassword(formData.password)) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }

        // on verifie que les 2 mots de passe sont identiques
        if (formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);

        try {
            // on envoie les infos au serveur pour creer le compte
            await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });
            // si ca marche on redirige vers la page de connexion
            navigate('/login');
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'inscription.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                {/* en-tete */}
                <div className="register-header">
                    <div className="register-logo">🛰️</div>
                    <h1>Rejoindre la mission</h1>
                    <p>Créez votre compte pour piloter le rover</p>
                </div>

                {/* message d'erreur */}
                {error && <div className="register-error">{error}</div>}

                {/* formulaire d'inscription */}
                <form onSubmit={handleSubmit} className="register-form">
                    <Input
                        label="Nom d'utilisateur"
                        type="text"
                        id="register-username"
                        placeholder="commandant_mars"
                        value={formData.username}
                        onChange={handleChange('username')}
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        id="register-email"
                        placeholder="pilote@nasa.gov"
                        value={formData.email}
                        onChange={handleChange('email')}
                        required
                    />

                    <Input
                        label="Mot de passe"
                        type="password"
                        id="register-password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange('password')}
                        required
                    />

                    <Input
                        label="Confirmer le mot de passe"
                        type="password"
                        id="register-confirm-password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange('confirmPassword')}
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

                {/* lien vers la page de connexion */}
                <p className="register-footer">
                    Déjà un compte ?{' '}
                    <Link to="/login">Se connecter</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
