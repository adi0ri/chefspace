// src/pages/SettingsPage.js
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, deleteFileByUrl } from '../services/storageService'; // Import storage service
import { updateUserFirestoreProfile } from '../services/userService'; // To update profilePictureURL in Firestore

const SettingsPage = () => {
    const { currentUser, currentUserProfile, updateUserFirebaseProfile, updateUserCustomProfile, resetPassword } = useAuth();

    const [username, setUsername] = useState('');
    const [currentPhotoURL, setCurrentPhotoURL] = useState(''); // From Auth/Firestore
    const [newProfilePhotoFile, setNewProfilePhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null); // To trigger file input click

    const [dietary, setDietary] = useState('');
    const [cuisines, setCuisines] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);


    useEffect(() => {
        if (currentUser) {
            setUsername(currentUser.displayName || '');
            setCurrentPhotoURL(currentUser.photoURL || ''); // Auth photoURL
        }
        if (currentUserProfile) {
            // Prefer Firestore URL if available, as it might be more up-to-date
            setCurrentPhotoURL(currentUserProfile.profilePictureURL || currentUser?.photoURL || '');
            setDietary(currentUserProfile.dietaryRestrictions?.join(', ') || '');
            setCuisines(currentUserProfile.favoriteCuisines?.join(', ') || '');
        }
    }, [currentUser, currentUserProfile]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setNewProfilePhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setNewProfilePhotoFile(null);
            setPhotoPreview(null);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage(''); setError(''); setLoading(true);
        let uploadedPhotoURL = currentPhotoURL; // Start with existing or Auth URL

        try {
            // 1. Upload new photo if selected
            if (newProfilePhotoFile) {
                setUploadingPhoto(true);
                const oldPhotoURL = currentUserProfile?.profilePictureURL || currentUser?.photoURL;
                uploadedPhotoURL = await uploadFile(newProfilePhotoFile, `profilePictures/${currentUser.uid}`);
                
                // Optional: Delete old profile picture from Storage if it's different and exists
                if (oldPhotoURL && oldPhotoURL !== uploadedPhotoURL && oldPhotoURL.includes("firebasestorage.googleapis.com")) {
                    try {
                        await deleteFileByUrl(oldPhotoURL);
                    } catch (deleteError) {
                        console.warn("Could not delete old profile photo:", deleteError);
                    }
                }
                setUploadingPhoto(false);
            }

            // 2. Update Firebase Auth Profile (displayName, photoURL)
            const authUpdates = {};
            if (username !== (currentUser.displayName || '')) authUpdates.displayName = username;
            if (uploadedPhotoURL !== (currentUser.photoURL || '')) authUpdates.photoURL = uploadedPhotoURL;

            if (Object.keys(authUpdates).length > 0) {
                await updateUserFirebaseProfile(authUpdates);
            }

            // 3. Update Firestore Custom Profile
            const firestoreDataToUpdate = {};
            const newDietary = dietary.split(',').map(s => s.trim()).filter(Boolean);
            const newCuisines = cuisines.split(',').map(s => s.trim()).filter(Boolean);

            if (uploadedPhotoURL !== (currentUserProfile?.profilePictureURL || '')) firestoreDataToUpdate.profilePictureURL = uploadedPhotoURL;
            // Also update username in Firestore if your data model requires it (sync with Auth displayName)
            if (username !== (currentUserProfile?.username || '')) firestoreDataToUpdate.username = username;


            if (JSON.stringify(newDietary) !== JSON.stringify(currentUserProfile?.dietaryRestrictions || [])) {
                firestoreDataToUpdate.dietaryRestrictions = newDietary;
            }
            if (JSON.stringify(newCuisines) !== JSON.stringify(currentUserProfile?.favoriteCuisines || [])) {
                firestoreDataToUpdate.favoriteCuisines = newCuisines;
            }
            
            if (Object.keys(firestoreDataToUpdate).length > 0) {
                await updateUserCustomProfile(firestoreDataToUpdate); // This should refresh AuthContext.currentUserProfile
            }
            
            setMessage('Profile updated successfully!');
            setNewProfilePhotoFile(null); // Clear file input
            setPhotoPreview(null); // Clear preview
            setCurrentPhotoURL(uploadedPhotoURL); // Update displayed photo

        } catch (err) {
            setError(err.message || 'Failed to update profile.');
            console.error("Profile update error:", err);
            setUploadingPhoto(false);
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => { /* ... same ... */ };

    if (!currentUser) return <div className="container"><p>Loading user data...</p></div>;

    return (
        <div className="container">
            <h1>Account Settings</h1>
            {/* ... (message and error display) ... */}
            {message && <p style={{ color: 'green' }}>{message}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleProfileUpdate}>
                <h2>Update Profile</h2>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img
                        src={photoPreview || currentPhotoURL || 'https://via.placeholder.com/150'}
                        alt="Profile"
                        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                    />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current.click()} 
                        style={{ display: 'block', margin: '10px auto', padding: '8px 15px' }}
                        disabled={loading || uploadingPhoto}
                    >
                        Change Photo
                    </button>
                    {uploadingPhoto && <p>Uploading photo...</p>}
                </div>

                {/* ... (username, email, dietary, cuisines inputs - same as before) ... */}
                <div><label htmlFor="username">Username (Display Name):</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                <div><label htmlFor="email">Email (Display Only):</label><input type="email" id="email" value={currentUser.email || ''} readOnly disabled /></div>
                <div><label htmlFor="photoURL_display">Profile Picture URL (Current):</label><input type="text" id="photoURL_display" value={currentPhotoURL} readOnly disabled /></div>
                <div><label htmlFor="dietary">Dietary Restrictions (comma-separated):</label><input type="text" id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} /></div>
                <div><label htmlFor="cuisines">Favorite Cuisines (comma-separated):</label><input type="text" id="cuisines" value={cuisines} onChange={(e) => setCuisines(e.target.value)} /></div>

                <button type="submit" disabled={loading || uploadingPhoto}>
                    {loading ? "Saving..." : "Save Profile Changes"}
                </button>
            </form>
            
            {/* ... (Password Management - same as before) ... */}
             <div style={{marginTop: '30px'}}><h2>Password Management</h2><button onClick={handlePasswordReset} className="action-button">Request Password Reset</button></div>
        </div>
    );
};
export default SettingsPage;