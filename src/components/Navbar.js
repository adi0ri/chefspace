// src/components/Navbar.js
import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // Navigate after successful logout
        } catch (error) {
            console.error("Failed to log out", error);
            // Handle logout error 
        }
    };

    return (
        <nav>
            <Link to="/" className="logo">Chefspace</Link>
            <div className="nav-links">
                <NavLink to="/" end>Home</NavLink>
                <NavLink to="/search">Search</NavLink>
                {currentUser && <NavLink to="/create-recipe">Create Recipe</NavLink>}
            </div>
            <div>
                {currentUser ? (
                    <>
                        <NavLink to="/settings"> {/* Changed from /profile/:userId to /settings for own profile */}
                            {currentUser.photoURL ?
                                <img src={currentUser.photoURL} alt="profile" style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle'}} />
                                : (currentUser.displayName && <span style={{
                                        display: 'inline-block',
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ccc',
                                        textAlign: 'center',
                                        lineHeight: '30px',
                                        marginRight: '8px',
                                        verticalAlign: 'middle',
                                        fontWeight: 'bold'
                                    }}>{currentUser.displayName.charAt(0).toUpperCase()}</span>)
                            }
                            {currentUser.displayName || currentUser.email}
                        </NavLink>
                        {/* <NavLink to="/settings">Settings</NavLink> */} {/* Settings link is now combined with profile */}
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        <NavLink to="/login">Login</NavLink>
                        <NavLink to="/signup">Sign Up</NavLink>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;