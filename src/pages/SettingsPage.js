// src/pages/SettingsPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
// No need for navigate here if ProtectedRoute handles it

const SettingsPage = () => {
    // updateUserFirebaseProfile for Auth name/photo, updateUserCustomProfile for Firestore data
    const { currentUser, currentUserProfile, updateUserFirebaseProfile, updateUserCustomProfile, resetPassword } = useAuth();

    const [username, setUsername] = useState(''); // For Firebase Auth displayName
    const [photoURL, setPhotoURL] = useState(''); // For Firebase Auth photoURL
    const [dietary, setDietary] = useState(''); // For Firestore
    const [cuisines, setCuisines] = useState(''); // For Firestore
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setUsername(currentUser.displayName || '');
            setPhotoURL(currentUser.photoURL || '');
        }
        if (currentUserProfile) {
            setDietary(currentUserProfile.dietaryRestrictions?.join(', ') || '');
            setCuisines(currentUserProfile.favoriteCuisines?.join(', ') || '');
        }
    }, [currentUser, currentUserProfile]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage(''); setError(''); setLoading(true);
        let authUpdatesMade = false;
        let firestoreUpdatesMade = false;

        try {
            // Update Firebase Auth Profile (displayName, photoURL)
            const authUpdates = {};
            if (username !== (currentUser.displayName || '')) authUpdates.displayName = username;
            if (photoURL !== (currentUser.photoURL || '')) authUpdates.photoURL = photoURL;

            if (Object.keys(authUpdates).length > 0) {
                await updateUserFirebaseProfile(authUpdates);
                authUpdatesMade = true;
            }

            // Update Firestore Custom Profile
            const firestoreDataToUpdate = {};
            const newDietary = dietary.split(',').map(s => s.trim()).filter(Boolean);
            const newCuisines = cuisines.split(',').map(s => s.trim()).filter(Boolean);

            // Compare arrays carefully
            if (JSON.stringify(newDietary) !== JSON.stringify(currentUserProfile?.dietaryRestrictions || [])) {
                firestoreDataToUpdate.dietaryRestrictions = newDietary;
            }
            if (JSON.stringify(newCuisines) !== JSON.stringify(currentUserProfile?.favoriteCuisines || [])) {
                firestoreDataToUpdate.favoriteCuisines = newCuisines;
            }
             // If username is primarily managed in Firestore, update it here too.
             // For this example, we assume Auth display name is primary, but you might want to sync.
            // if (username !== (currentUserProfile?.username || '')) firestoreDataToUpdate.username = username;
            // if (photoURL !== (currentUserProfile?.profilePictureURL || '')) firestoreDataToUpdate.profilePictureURL = photoURL;


            if (Object.keys(firestoreDataToUpdate).length > 0) {
                await updateUserCustomProfile(firestoreDataToUpdate);
                firestoreUpdatesMade = true;
            }

            if (authUpdatesMade || firestoreUpdatesMade) {
                setMessage('Profile updated successfully!');
            } else {
                setMessage("No changes to save.");
            }

        } catch (err) {
            setError(err.message || 'Failed to update profile.');
            console.error("Profile update error:", err);
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => { /* ... same as before ... */ 
        setMessage(''); setError('');
        if (currentUser && currentUser.email) {
            try { await resetPassword(currentUser.email); setMessage('Password reset email sent!'); }
            catch (err) { setError(err.message || 'Failed to send reset email.'); }
        } else { setError("Could not find user's email."); }
    };

    if (!currentUser || !currentUserProfile) return <div className="container"><p>Loading user data...</p></div>;

    return (
        <div className="container">
            <h1>Account Settings</h1>
            {message && <p style={{ color: 'green' }}>{message}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleProfileUpdate}>
                <h2>Update Profile</h2>
                <div>
                    <label htmlFor="username">Username (Display Name):</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="email">Email (Display Only):</label>
                    <input type="email" id="email" value={currentUser.email || ''} readOnly disabled />
                </div>
                <div>
                    <label htmlFor="photoURL">Profile Picture URL:</label>
                    <input type="text" id="photoURL" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/avatar.jpg"/>
                </div>
                 <div>
                    <label htmlFor="dietary">Dietary Restrictions (comma-separated):</label>
                    <input type="text" id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} />
                </div>
                 <div>
                    <label htmlFor="cuisines">Favorite Cuisines (comma-separated):</label>
                    <input type="text" id="cuisines" value={cuisines} onChange={(e) => setCuisines(e.target.value)} />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Profile Changes"}
                </button>
            </form>
            
            <div style={{marginTop: '30px'}}>
                <h2>Password Management</h2>
                <button onClick={handlePasswordReset} className="action-button">Request Password Reset</button>
            </div>
        </div>
    );
};
export default SettingsPage;