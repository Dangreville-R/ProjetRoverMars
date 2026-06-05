import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Raccourci pour useContext(AuthContext)
// Conservé pour compatibilité — les composants de classe utilisent static contextType
export const useAuth = () => {
    const context = useContext(AuthContext);

    // Erreur si utilisé hors du Provider
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }

    return context;
};
