import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import './App.css';

/**
 * Classe App — Application principale avec les routes.
 */
class App extends React.Component {
    render() {
        return (
            <Router>
                <div className="App">
                    <Routes>
                        {/* Redirection vers login par défaut */}
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        {/* Page de connexion */}
                        <Route path="/login" element={<Login />} />

                        {/* Espace connecté (Dashboard) */}
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
}

export default App;