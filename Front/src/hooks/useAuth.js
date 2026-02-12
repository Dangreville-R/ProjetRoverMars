import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// hook personnalisé pour recuperer les infos d'authentification
// au lieu d'ecrire useContext(AuthContext) partout, on fait juste useAuth()
export const useAuth = () => {
    const context = useContext(AuthContext);

    // si on utilise useAuth en dehors du AuthProvider ca marchera pas
    // donc on affiche une erreur pour que le developpeur comprenne
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }

    return context;
};
