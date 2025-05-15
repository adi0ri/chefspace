// src/pages/SignupPage.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const SignupPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate('/'); // Redirect if already logged in
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('Password should be at least 6 characters long.');
            return;
        }
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        setLoading(true);
        try {
            await signup(email, password, username);
            // onAuthStateChanged will update currentUser and redirect
            // You can add a success message or direct navigation if needed here
            // but usually letting onAuthStateChanged handle it is cleaner.
            navigate('/'); // Or to a profile setup page
        } catch (err) {
            setError(err.message || 'Failed to create an account. The email might already be in use.');
            console.error("Signup error:", err);
        }
        setLoading(false);
    };

    // Don't render form if currentUser is already set
    if (currentUser) return null;

    return (
        <div className="container" style={{maxWidth: '500px'}}>
            <h1>Sign Up</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
             <p style={{marginTop: '20px'}}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
};
export default SignupPage;