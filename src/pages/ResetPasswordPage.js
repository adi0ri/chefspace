// src/pages/ResetPasswordPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const ResetPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage('Check your email for a link to reset your password.');
        } catch (err) {
            setError(err.message || 'Failed to send password reset email.');
        }
        setLoading(false);
    };

    return (
        <div className="container" style={{maxWidth: '500px'}}>
            <h1>Reset Password</h1>
            {message && <p style={{color: 'green'}}>{message}</p>}
            {error && <p style={{color: 'red'}}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email Address:</label>
                    <input 
                        type="email" 
                        id="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Password Reset Email'}
                </button>
            </form>
            <p style={{marginTop: '20px'}}>
                <Link to="/login">Back to Login</Link>
            </p>
        </div>
    );
};

export default ResetPasswordPage;