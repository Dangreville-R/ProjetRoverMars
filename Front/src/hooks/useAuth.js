import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Raccourci pour useContext(AuthContext)
export const useAuth = () => {
    const context = useContext(AuthContext);

    // Erreur si utilisé hors du Provider
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }

    return context;
};
