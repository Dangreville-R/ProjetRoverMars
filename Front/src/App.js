import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
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

          {/* la page pour se connecter */}
          <Route path="/login" element={<Login />} />

          {/* la page pour s'inscrire */}
          <Route path="/register" element={<Register />} />

          {/* le dashboard, il faut etre connecté pour y acceder */}
          <Route
            path="/dashboard"
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