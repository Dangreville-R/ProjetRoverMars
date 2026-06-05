import React from 'react';
import './Button.css';

/**
 * Classe Button — Composant Bouton réutilisable.
 * Supporte plusieurs variantes, tailles, états de chargement et pleine largeur.
 */
class Button extends React.Component {
    render() {
        const {
            children,
            variant = 'primary',
            size = 'md',
            fullWidth = false,
            loading = false,
            disabled = false,
            type = 'button',
            onClick,
            className = '',
            ...rest
        } = this.props;

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
                {...rest}
            >
                {/* Affiche le spinner ou le texte */}
                {loading ? <span className="btn__spinner" /> : children}
            </button>
        );
    }
}

export default Button;
