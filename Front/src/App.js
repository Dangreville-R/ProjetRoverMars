import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import './App.css';

// c'est le composant principal de l'application
// c'est ici qu'on definit toutes les pages et les routes
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* quand on va sur "/", on redirige vers la page login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* la page pour se connecter via École Directe */}
          <Route path="/login" element={<Login />} />

          {/* le dashboard avec les sous-onglets (temps-reel, historique, admin) */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;