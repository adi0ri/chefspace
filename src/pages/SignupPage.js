// src/pages/SignupPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Re-use GoogleIcon or import from a shared components folder
const GoogleIcon = () => (  <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '10px' }}>
<path fill="#4285F4" d="M22.56,12.25C22.56,11.47 22.49,10.72 22.36,10H12V14.26H17.95C17.73,15.58 16.91,16.69 15.67,17.55V20.09H19.67C21.56,18.36 22.56,15.62 22.56,12.25Z"/>
<path fill="#34A853" d="M12,24C15.24,24 17.95,22.89 19.67,20.09L15.67,17.55C14.58,18.27 13.36,18.69 12,18.69C9.38,18.69 7.15,16.95 6.26,14.54H2.14V17.14C3.86,21.25 7.64,24 12,24Z"/>
<path fill="#FBBC05" d="M6.26,14.54C6.05,13.88 5.93,13.19 5.93,12.48C5.93,11.77 6.05,11.08 6.26,10.42V7.82H2.14C1.43,9.19 1,10.79 1,12.48C1,14.17 1.43,15.77 2.14,17.14L6.26,14.54Z"/>
<path fill="#EA4335" d="M12,5.31C13.56,5.31 14.92,5.89 15.99,6.91L19.74,3.16C17.95,1.46 15.24,0.5 12,0.5C7.64,0.5 3.86,3.25 2.14,7.82L6.26,10.42C7.15,8.01 9.38,5.31 12,5.31Z"/>
</svg> );

const SignupPage = () => {
    // ... (username, email, password, error, loading states same as before)
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { signup, loginWithGoogle, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { /* ... same ... */ if (currentUser) navigate('/'); }, [currentUser, navigate]);

    const handleSubmit = async (e) => { /* ... same as before for email/password signup ... */ 
        e.preventDefault(); setError('');
        if (password.length < 6) { setError('Password should be at least 6 characters.'); return; }
        if (!username.trim()) { setError('Username cannot be empty.'); return; }
        setLoading(true);
        try { await signup(email, password, username); navigate('/');}
        catch (err) { setError(err.message || 'Failed to create account.'); }
        setLoading(false);
    };

    const handleGoogleSignup = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            await loginWithGoogle(); // This function handles both login and signup via Google
            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to sign up with Google.');
        }
        setGoogleLoading(false);
    };
    
    if (currentUser) return null;

    return (
        <div className="container" style={{maxWidth: '500px'}}>
            <h1>Sign Up</h1>
            {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

            <button 
                onClick={handleGoogleSignup} 
                disabled={googleLoading || loading}
                style={{ /* ... same style as Google login button ... */ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '100%', padding: '12px', marginBottom: '20px',
                    backgroundColor: '#fff', color: '#757575', border: '1px solid #ddd',
                    borderRadius: '4px', cursor: 'pointer', fontSize: '1em'
                }}
            >
                <GoogleIcon />
                {googleLoading ? 'Signing up...' : 'Sign up with Google'}
            </button>

            <p style={{textAlign: 'center', margin: '15px 0', color: '#777'}}>OR</p>

            <form onSubmit={handleSubmit}>
                {/* ... (username, email, password fields same as before) ... */}
                <div><label htmlFor="username">Username:</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
                <div><label htmlFor="email">Email:</label><input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><label htmlFor="password">Password:</label><input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <button type="submit" disabled={loading || googleLoading}>{loading ? 'Signing up...' : 'Sign Up with Email'}</button>
            </form>
            <p style={{marginTop: '20px', textAlign: 'center'}}>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
};
export default SignupPage;