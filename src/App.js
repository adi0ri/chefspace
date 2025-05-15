// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RecipeProvider } from './contexts/RecipeContext';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CreateRecipePage from './pages/CreateRecipePage';
import UserProfilePage from './pages/UserProfilePage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import './App.css';

function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth(); // Get loading state

    if (loading) {
        // You can return a loading spinner or a blank page while auth state is being determined
        return <div className="container"><p>Loading...</p></div>;
    }

    return currentUser ? children : <Navigate to="/login" />;
}

function AppContent() {
    return (
        <Router> {/* Using HashRouter for GitHub Pages compatibility */}
            <Navbar />
            <main>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/recipe/:id" element={<RecipeDetailPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/create-recipe" element={
                        <ProtectedRoute><CreateRecipePage /></ProtectedRoute>
                    } />
                    <Route path="/profile/:userId" element={<UserProfilePage />} /> {/* Public view */}
                    <Route path="/settings" element={
                        <ProtectedRoute><SettingsPage /></ProtectedRoute>
                    } />
                    {/* Fallback: Redirect to home if no match. For GitHub Pages, 404.html is better. */}
                    <Route path="*" element={<Navigate to="/" />} /> 
                </Routes>
            </main>
            {/* <footer style={{textAlign: 'center', padding: '20px', background: '#333', color: 'white', marginTop: '30px'}}>
                Chefspace © {new Date().getFullYear()}
            </footer> */}
        </Router>
    );
}

function App() {
    return (
        <AuthProvider>
            <RecipeProvider> {/* RecipeProvider needs AuthContext if currentUser is used within it */}
                <AppContent />
            </RecipeProvider>
        </AuthProvider>
    );
}

export default App;