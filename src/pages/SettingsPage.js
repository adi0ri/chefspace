// src/pages/SettingsPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, deleteFileByUrl } from '../services/storageService';
import { updateUserFirestoreProfile } from '../services/userService'; 

const SettingsPage = () => {
    const { currentUser, currentUserProfile, updateUserFirebaseProfile, updateUserCustomProfile, resetPassword } = useAuth();

    // --- Form States ---
    const [username, setUsername] = useState('');
    const [dietary, setDietary] = useState('');
    const [cuisines, setCuisines] = useState('');

    // --- Photo States ---
    const [currentPhotoURL, setCurrentPhotoURL] = useState(''); // From Auth/Firestore
    const [newProfilePhotoFile, setNewProfilePhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);

    // --- Camera States ---
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // --- UI States ---
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setUsername(currentUser.displayName || '');
            
            setCurrentPhotoURL(currentUser.photoURL || '');
        }
        if (currentUserProfile) {
            setCurrentPhotoURL(currentUserProfile.profilePictureURL || currentUser?.photoURL || '');
            setDietary(currentUserProfile.dietaryRestrictions?.join(', ') || '');
            setCuisines(currentUserProfile.favoriteCuisines?.join(', ') || '');
        }
    }, [currentUser, currentUserProfile]);

    // Cleanup camera stream
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                console.log("SettingsPage: Cleaning up camera stream on unmount.");
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []);

    const handleFileChange = (event) => {
        if (showCamera) { stopCamera(); } // Stop camera if user chooses a file
        const file = event.target.files[0];
        if (file) {
            setNewProfilePhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setPhotoPreview(reader.result); };
            reader.readAsDataURL(file);
            setError('');
        } else {
            setNewProfilePhotoFile(null); setPhotoPreview(null);
        }
    };

    // --- CAMERA FUNCTIONS ---
    const requestCameraAccess = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            setNewProfilePhotoFile(null); setPhotoPreview(null); setError('');
            console.log("SettingsPage: Requesting camera access...");
            try {
                let stream;
                
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
                } catch (userFacingError) {
                    console.warn("User-facing camera failed, trying any available video:", userFacingError);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                
                console.log("SettingsPage: Camera stream obtained.");
                streamRef.current = stream;
                setShowCamera(true); // Trigger useEffect to attach stream
            } catch (err) {
                console.error("SettingsPage: Error requesting camera access: ", err);
                let userMessage = "Could not access camera. Ensure permissions are granted.";
                if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    userMessage = "No camera found on your device.";
                } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    userMessage = "Camera permission denied. Please enable camera access in browser/OS settings and try again.";
                } else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError") {
                    userMessage = "Camera is in use or cannot be read. Try closing other apps/tabs using the camera.";
                }
                setError(userMessage);
                setShowCamera(false);
                if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
            }
        } else { setError("Camera access is not supported by your browser."); }
    };

    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            console.log("SettingsPage: useEffect - Attaching stream to video element.");
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.onloadedmetadata = () => {
                console.log("SettingsPage: useEffect - Video metadata loaded.");
                videoRef.current.play().catch(playError => {
                    console.error("SettingsPage: useEffect - Error playing video:", playError);
                    setError("Could not start video playback: " + playError.message);
                });
            };
            videoRef.current.play().catch(e => console.warn("Direct play attempt in useEffect caught (might be benign):", e.message));
        }
    }, [showCamera]); 

    const stopCamera = useCallback(() => {
        console.log("SettingsPage: Stopping camera.");
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
        }
        setShowCamera(false);
    }, []);

    const takePicture = () => {
        if (videoRef.current && videoRef.current.srcObject && videoRef.current.videoWidth > 0 && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
            setError('');
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const capturedFile = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
                    setNewProfilePhotoFile(capturedFile);
                    setPhotoPreview(canvas.toDataURL('image/jpeg'));
                    stopCamera();
                } else { setError("Could not capture image data from camera."); }
            }, 'image/jpeg', 0.90);
        } else {
            console.warn("takePicture called but video feed not ready or available.");
            setError("Camera feed not ready. Ensure camera is active and showing preview.");
        }
    };
    // --- END OF CAMERA FUNCTIONS ---

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!currentUser) { setError("Not logged in."); return; }
        setMessage(''); setError(''); setLoading(true);
        let newUploadedPhotoURL = currentPhotoURL; // Assume no change initially

        try {
            if (newProfilePhotoFile) {
                setUploadingPhoto(true);
                const oldPhotoURLToDelete = currentUserProfile?.profilePictureURL || currentUser?.photoURL;
                console.log("SettingsPage: Uploading new profile photo...");
                newUploadedPhotoURL = await uploadFile(newProfilePhotoFile, `profilePictures/${currentUser.uid}`);
                console.log("SettingsPage: New profile photo URL:", newUploadedPhotoURL);

                if (oldPhotoURLToDelete && oldPhotoURLToDelete !== newUploadedPhotoURL && oldPhotoURLToDelete.includes("firebasestorage.googleapis.com")) {
                    console.log("SettingsPage: Attempting to delete old profile photo:", oldPhotoURLToDelete);
                    await deleteFileByUrl(oldPhotoURLToDelete);
                }
                setUploadingPhoto(false);
            }

            const authUpdates = {};
            if (username !== (currentUser.displayName || '')) authUpdates.displayName = username;
            if (newUploadedPhotoURL !== (currentUser.photoURL || '')) authUpdates.photoURL = newUploadedPhotoURL;

            if (Object.keys(authUpdates).length > 0) {
                console.log("SettingsPage: Updating Firebase Auth profile:", authUpdates);
                await updateUserFirebaseProfile(authUpdates);
            }

            const firestoreDataToUpdate = {};
            const newDietaryArray = dietary.split(',').map(s => s.trim()).filter(Boolean);
            const newCuisinesArray = cuisines.split(',').map(s => s.trim()).filter(Boolean);

            if (newUploadedPhotoURL !== (currentUserProfile?.profilePictureURL || currentPhotoURL || '')) firestoreDataToUpdate.profilePictureURL = newUploadedPhotoURL;
            if (username !== (currentUserProfile?.username || '')) firestoreDataToUpdate.username = username; // Sync username to Firestore profile

            if (JSON.stringify(newDietaryArray) !== JSON.stringify(currentUserProfile?.dietaryRestrictions || [])) {
                firestoreDataToUpdate.dietaryRestrictions = newDietaryArray;
            }
            if (JSON.stringify(newCuisinesArray) !== JSON.stringify(currentUserProfile?.favoriteCuisines || [])) {
                firestoreDataToUpdate.favoriteCuisines = newCuisinesArray;
            }
            
            if (Object.keys(firestoreDataToUpdate).length > 0) {
                console.log("SettingsPage: Updating Firestore profile:", firestoreDataToUpdate);
                await updateUserCustomProfile(firestoreDataToUpdate); 
            }
            
            setMessage('Profile updated successfully!');
            setNewProfilePhotoFile(null);
            setPhotoPreview(null);
            setCurrentPhotoURL(newUploadedPhotoURL); // Update local display immediately

        } catch (err) {
            setError(err.message || 'Failed to update profile.');
            console.error("Profile update error:", err);
            setUploadingPhoto(false);
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => {
        setMessage(''); setError('');
        if (currentUser && currentUser.email) {
            try { await resetPassword(currentUser.email); setMessage('Password reset email sent! Check your inbox.'); }
            catch (err) { setError(err.message || 'Failed to send reset email.'); }
        } else { setError("Could not find user's email."); }
    };

    if (!currentUser) return <div className="container"><p>Loading user data or please log in...</p></div>;

    return (
        <div className="container">
            <h1>Account Settings</h1>
            {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
            {error && <p style={{ color: 'red', textAlign: 'center', border: '1px solid red', padding: '10px', borderRadius: '4px', backgroundColor: '#ffebee' }}>{error}</p>}

            <form onSubmit={handleProfileUpdate}>
                <h2>Update Profile</h2>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img
                        src={photoPreview || currentPhotoURL || 'https://via.placeholder.com/150?text=No+Image'}
                        alt="Profile"
                        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd', marginBottom: '10px' }}
                    />
                    {/* Camera View Area - only shown when showCamera is true */}
                    {showCamera && (
                        <div style={{ marginBottom: '10px', position: 'relative', maxWidth: '320px', margin: '10px auto', backgroundColor: '#000' }}>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted
                                style={{ width: '100%', display: 'block', borderRadius: '4px' }} 
                                onError={(e) => { console.error('Video element error:', e); setError('Video feed error. Check camera permissions.');}}
                            />
                            <button type="button" onClick={takePicture} className="btn btn-primary" style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }} disabled={loading || uploadingPhoto}>Capture</button>
                        </div>
                    )}
                    {/* Action Buttons for Photo */}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-info" disabled={loading || uploadingPhoto || showCamera}>
                            {newProfilePhotoFile && !showCamera ? `Change File: ${newProfilePhotoFile.name.substring(0,15)}...` : "Upload File"}
                        </button>
                        {!showCamera ? (
                            <button type="button" onClick={requestCameraAccess} className="btn btn-secondary" disabled={loading || uploadingPhoto}>Use Camera</button>
                        ) : (
                            <button type="button" onClick={stopCamera} className="btn btn-warning" disabled={loading || uploadingPhoto}>Cancel Camera</button>
                        )}
                    </div>
                     <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
                    {uploadingPhoto && <p style={{marginTop: '10px', color: '#007bff'}}>Uploading photo, please wait...</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="username">Username (Display Name):</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email (Display Only):</label>
                    <input type="email" id="email" value={currentUser.email || ''} readOnly disabled />
                </div>
                 {/* Display current photo URL for info - can be removed if not needed */}
                {/* <div className="form-group">
                    <label htmlFor="photoURL_display">Profile Picture URL (Current):</label>
                    <input type="text" id="photoURL_display" value={currentPhotoURL} readOnly disabled style={{fontSize: '0.8em', color: '#777'}}/>
                </div> */}
                <div className="form-group">
                    <label htmlFor="dietary">Dietary Restrictions (comma-separated):</label>
                    <input type="text" id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="cuisines">Favorite Cuisines (comma-separated):</label>
                    <input type="text" id="cuisines" value={cuisines} onChange={(e) => setCuisines(e.target.value)} />
                </div>

                <button type="submit" disabled={loading || uploadingPhoto} className="btn btn-primary btn-block" style={{width: '100%', padding: '12px', marginTop: '10px'}}>
                    {loading ? "Saving..." : (uploadingPhoto ? "Processing Photo..." : "Save Profile Changes")}
                </button>
            </form>
            
            <div style={{marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                <h2>Password Management</h2>
                <button onClick={handlePasswordReset} className="btn btn-outline-secondary">Request Password Reset</button>
            </div>
        </div>
    );
};
export default SettingsPage;