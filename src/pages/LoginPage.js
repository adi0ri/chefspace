// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // For login process
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate('/'); // Redirect if already logged in
        }
    }, [currentUser, navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/'); // Firebase onAuthStateChanged will handle currentUser update
        } catch (err) {
            setError(err.message || 'Failed to log in. Please check your credentials.');
            console.error("Login error:", err);
        }
        setLoading(false);
    };

    // Don't render form if currentUser is already set (handles race condition with useEffect redirect)
    if (currentUser) return null;

    return (
        <div className="container" style={{maxWidth: '500px'}}>
            <h1>Login</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={{marginTop: '15px'}}>
                <Link to="/reset-password">Forgot Password?</Link>
            </p>
            <p style={{marginTop: '20px'}}>
                Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
        </div>
    );
};
export default LoginPage;