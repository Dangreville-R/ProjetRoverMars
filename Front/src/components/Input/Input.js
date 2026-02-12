import React from 'react';
import './Input.css';

// composant input reutilisable pour les formulaires
// on peut mettre un label, un placeholder, et afficher un message d'erreur
const Input = ({
    label,
    type = 'text',
    id,
    value,
    onChange,
    placeholder,
    error,
    required = false,
    className = '',
    ...props
}) => {
    return (
        <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
            {/* on affiche le label seulement si il y en a un */}
            {label && (
                <label htmlFor={id} className="input-group__label">
                    {label}
                </label>
            )}
            <input
                type={type}
                id={id}
                className="input-group__field"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                {...props}
            />
            {/* on affiche l'erreur seulement si il y en a une */}
            {error && <span className="input-group__error">{error}</span>}
        </div>
    );
};

export default Input;
