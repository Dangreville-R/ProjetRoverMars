import React from 'react';
import './Button.css';

// composant bouton reutilisable
// on peut changer le style avec variant (primary, secondary, outline, danger)
// on peut changer la taille avec size (sm, md, lg)
// fullWidth = le bouton prend toute la largeur
// loading = affiche un spinner quand ca charge
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
    // on construit les classes CSS du bouton
    // par exemple si variant="primary" et size="md" ca donne "btn btn--primary btn--md"
    const classNames = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? 'btn--full' : '',
        loading ? 'btn--loading' : '',
        className,
    ]
        .filter(Boolean) // ca enleve les valeurs vides
        .join(' '); // ca met tout ensemble avec des espaces

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {/* si c'est en chargement on affiche un spinner sinon le texte du bouton */}
            {loading ? <span className="btn__spinner" /> : children}
        </button>
    );
};

export default Button;
