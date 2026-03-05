import React from 'react';
import './Button.css';

// Composant Bouton réutilisable
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    type = 'button',
    onClick,
    className = '',
    ...props
}) => {
    // Construit les classes CSS du bouton
    const classNames = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? 'btn--full' : '',
        loading ? 'btn--loading' : '',
        className,
    ]
        .filter(Boolean) // Enlève les classes vides
        .join(' '); // Assemble le tout

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {/* Affiche le spinner ou le texte */}
            {loading ? <span className="btn__spinner" /> : children}
        </button>
    );
};

export default Button;
