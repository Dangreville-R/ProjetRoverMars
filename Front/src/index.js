import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// on recupere la div "root" du fichier public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// on affiche l'application dans la page
// AuthProvider permet de partager les infos de connexion partout
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
