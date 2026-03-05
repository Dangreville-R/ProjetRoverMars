import React from 'react';
import './Input.css';

// Champ de texte réutilisable
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
            {/* Affiche le label s'il existe */}
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
            {/* Affiche l'erreur si elle existe */}
            {error && <span className="input-group__error">{error}</span>}
        </div>
    );
};

export default Input;
