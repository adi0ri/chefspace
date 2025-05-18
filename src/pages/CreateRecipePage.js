// src/pages/CreateRecipePage.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile } from '../services/storageService';

const DIETARY_OPTIONS = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Keto", "Paleo", "Low-Carb"
];

const CreateRecipePage = () => {
    const navigate = useNavigate();
    const { addRecipe } = useRecipes();
    const { currentUser } = useAuth();

    // --- Standard Form States ---
    const [title, setTitle] = useState('');
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
    const [instructions, setInstructions] = useState('');
    const [cuisineType, setCuisineType] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('Easy');
    const [selectedDietary, setSelectedDietary] = useState([]);

    // --- Photo and Camera States ---
    const [coverPhotoFile, setCoverPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null); // Store the active stream

    // --- Loading and Error States ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);


    // Cleanup camera stream when component unmounts or camera is hidden/stopped
    useEffect(() => {
        // This function will be returned by useEffect and run on cleanup
        return () => {
            if (streamRef.current) {
                console.log("CreateRecipePage: Cleaning up camera stream on unmount.");
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null; // Clear the ref
            }
        };
    }, []); // Empty dependency array: runs only on mount and unmount

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const addIngredientField = () => {
        setIngredients([...ingredients, { name: '', quantity: '' }]);
    };

    const removeIngredientField = (indexToRemove) => {
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, index) => index !== indexToRemove));
        }
    };

    const handleFileChange = (event) => {
        if (showCamera) { // If camera was active, stop it first
            stopCamera();
        }
        const file = event.target.files[0];
        if (file) {
            setCoverPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setPhotoPreview(reader.result); };
            reader.readAsDataURL(file);
            setError(''); // Clear any previous errors like "camera access denied"
        } else {
            setCoverPhotoFile(null);
            setPhotoPreview(null);
        }
    };

    const handleDietaryChange = (e) => {
        const value = e.target.value;
        setSelectedDietary(prev =>
            prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
        );
    };

    const requestCameraAccess = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            setCoverPhotoFile(null); setPhotoPreview(null); setError('');
            console.log("CreateRecipePage: Requesting camera access...");
            try {
                // Try environment first (rear camera), then user (front camera) as a fallback
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
                } catch (envError) {
                    console.warn("Environment camera failed, trying user camera:", envError);
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
                }
                
                console.log("CreateRecipePage: Camera stream obtained by requestCameraAccess.");
                streamRef.current = stream;
                setShowCamera(true); // This will trigger the useEffect to attach the stream
            } catch (err) {
                console.error("CreateRecipePage: Error requesting camera access: ", err);
                let userMessage = "Could not access camera. Please ensure permissions are granted.";
                if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    userMessage = "No camera found on your device.";
                } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    userMessage = "Camera permission denied. Please enable camera access in your browser/OS settings for this site and try again.";
                } else if (err.name === "NotReadableError" || err.name === "TrackStartError" || err.name === "OverconstrainedError") {
                    userMessage = "Camera is already in use, cannot be read, or selected constraints are not supported. Try closing other apps/tabs using the camera.";
                }
                setError(userMessage);
                setShowCamera(false);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            }
        } else {
            setError("Camera access (getUserMedia) is not supported by your browser.");
        }
    };

    // useEffect to attach stream to video element when showCamera is true and refs are ready
    useEffect(() => {
        if (showCamera && videoRef.current && streamRef.current) {
            console.log("CreateRecipePage: useEffect - Attaching stream to video element.");
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.onloadedmetadata = () => {
                console.log("CreateRecipePage: useEffect - Video metadata loaded. Dimensions:", videoRef.current.videoWidth, videoRef.current.videoHeight);
                videoRef.current.play().catch(playError => {
                    console.error("CreateRecipePage: useEffect - Error playing video:", playError);
                    setError("Could not start video playback. " + playError.message);
                    // stopCamera(); // Optionally stop if play fails critically
                });
            };
            // Handle cases where onloadedmetadata might not fire quickly or if autoplay is blocked
            videoRef.current.play().catch(e => console.warn("Direct play attempt in useEffect also caught an error (might be benign if onloadedmetadata handles it):", e.message));
        }
    }, [showCamera]); // Rerun when showCamera changes (or videoRef/streamRef if they could change identity, though refs usually don't)

    const stopCamera = useCallback(() => {
        console.log("CreateRecipePage: Stopping camera.");
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        // Check if videoRef.current exists before trying to access srcObject
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
        }
        setShowCamera(false);
    }, []);


    const takePicture = () => {
        if (videoRef.current && videoRef.current.srcObject && videoRef.current.videoWidth > 0 && videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
            setError(''); // Clear previous errors
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const capturedFile = new File([blob], `chefspace_cover_${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
                    setCoverPhotoFile(capturedFile);
                    setPhotoPreview(canvas.toDataURL('image/jpeg')); // Use canvas data for immediate preview
                    stopCamera();
                } else { setError("Could not capture image data from camera."); }
            }, 'image/jpeg', 0.90); // image/jpeg and quality (0.0 to 1.0)
        } else {
            console.warn("takePicture called but video feed not ready or available.", {
                videoRefCurrent: !!videoRef.current,
                srcObject: !!videoRef.current?.srcObject,
                videoWidth: videoRef.current?.videoWidth,
                readyState: videoRef.current?.readyState
            });
            setError("Camera feed not ready. Please ensure the camera is active and showing a preview, then try again.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) { setError("You must be logged in to create a recipe."); return; }
        setLoading(true); setError('');
        let uploadedPhotoURL = '';

        try {
            if (coverPhotoFile) {
                setUploadingPhoto(true);
                console.log("Submitting with coverPhotoFile:", coverPhotoFile.name, coverPhotoFile.size);
                uploadedPhotoURL = await uploadFile(coverPhotoFile, `recipePictures/${currentUser.uid}/uploads`);
                console.log("Photo uploaded, URL:", uploadedPhotoURL);
                setUploadingPhoto(false);
            } else {
                console.log("Submitting without a new cover photo file.");
            }

            const newRecipeData = {
                title,
                ingredients: ingredients.filter(ing => ing.name && ing.quantity),
                instructions,
                photoURLs: uploadedPhotoURL ? [uploadedPhotoURL] : [],
                cuisineType,
                difficultyLevel,
                dietaryRestrictions: selectedDietary,
            };
            console.log("New Recipe Data for addRecipe:", newRecipeData);
            const createdRecipe = await addRecipe(newRecipeData);

            if (createdRecipe && createdRecipe.id) {
                navigate(`/recipe/${createdRecipe.id}`);
            } else {
                console.warn("Recipe might have been created, but navigation ID missing from addRecipe response.", createdRecipe);
                setError("Recipe created, but failed to navigate. Check console.");
                // navigate('/'); // Fallback navigation if needed
            }
        } catch (err) {
            setError(err.message || "Failed to create recipe. Please try again.");
            console.error("Create Recipe Error:", err, err.stack);
            setUploadingPhoto(false);
        }
        setLoading(false);
    };

    return (
        <div className="container">
            <h1>Create New Recipe</h1>
            {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px', border: '1px solid red', padding: '10px', borderRadius: '4px', backgroundColor: '#ffebee'}}>{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* --- TITLE --- */}
                <div className="form-group">
                    <label htmlFor="title">Title:</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                {/* --- INGREDIENTS --- */}
                <div className="form-group" style={{ margin: '20px 0' }}>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Ingredients:</label>
                    {ingredients.map((ing, index) => (
                        <div key={index} className="ingredient-item" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input type="text" placeholder="Ingredient Name (e.g., Flour)" value={ing.name} onChange={(e) => handleIngredientChange(index, 'name', e.target.value)} style={{flexGrow: 2}} required />
                            <input type="text" placeholder="Quantity (e.g., 1 cup)" value={ing.quantity} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)} style={{flexGrow: 1}} required />
                            {ingredients.length > 1 && (
                                <button type="button" onClick={() => removeIngredientField(index)} className="btn btn-danger btn-sm" style={{padding: '8px 12px'}}>×</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addIngredientField} className="btn btn-success btn-sm" style={{padding: '10px 15px', marginTop: '5px'}}>Add Ingredient</button>
                </div>

                {/* --- INSTRUCTIONS --- */}
                <div className="form-group">
                    <label htmlFor="instructions">Instructions:</label>
                    <textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="8" required />
                </div>
                
                {/* --- COVER PHOTO (File Upload + Camera) --- */}
                <div className="form-group" style={{ margin: '20px 0', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Cover Photo:</label>
                    {(photoPreview && !showCamera) && (
                        <img src={photoPreview} alt="Cover preview" style={{ maxWidth: '100%', maxHeight: '250px', display: 'block', marginBottom: '10px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                    )}
                    {showCamera && (
                        <div style={{ marginBottom: '10px', position: 'relative', maxWidth: '400px', margin: '0 auto', backgroundColor: '#000' }}>
                            <video 
                                ref={videoRef}
                                autoPlay 
                                playsInline 
                                muted
                                style={{ width: '100%', display: 'block', borderRadius: '4px' }} 
                                onError={(e) => { console.error('Video element error:', e); setError('Video feed error. Check camera permissions.');}}
                            />
                            <button type="button" onClick={takePicture} className="btn btn-primary" style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', zIndex: 10 }} disabled={loading || uploadingPhoto}>Capture Photo</button>
                        </div>
                    )}
                    <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => fileInputRef.current.click()} className="btn btn-info" disabled={loading || uploadingPhoto || showCamera}>
                            {coverPhotoFile && !showCamera ? `Change File: ${coverPhotoFile.name.substring(0,15)}...` : "Upload File"}
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

                {/* --- CUISINE TYPE --- */}
                <div className="form-group">
                    <label htmlFor="cuisineType">Cuisine Type:</label>
                    <input type="text" id="cuisineType" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} />
                </div>

                {/* --- DIFFICULTY LEVEL --- */}
                <div className="form-group">
                    <label htmlFor="difficultyLevel">Difficulty Level:</label>
                    <select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>

                {/* --- DIETARY RESTRICTIONS --- */}
                <div className="form-group" style={{ margin: '20px 0' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Dietary Restrictions:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }}>
                        {DIETARY_OPTIONS.map(option => (
                            <label key={option} className="dietary-option" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '15px', backgroundColor: selectedDietary.includes(option) ? '#007bff30' : 'transparent' }}>
                                <input type="checkbox" value={option} checked={selectedDietary.includes(option)} onChange={handleDietaryChange} style={{ marginRight: '8px', accentColor: '#007bff' }} />
                                {option}
                            </label>
                        ))}
                    </div>
                </div>
                
                {/* --- SUBMIT BUTTON --- */}
                <button type="submit" disabled={loading || uploadingPhoto} className="btn btn-primary btn-lg" style={{marginTop: '20px', width: '100%', padding: '12px'}}>
                    {loading ? "Creating Recipe..." : (uploadingPhoto ? "Processing Photo..." : "Create Recipe")}
                </button>
            </form>
        </div>
    );
};
export default CreateRecipePage;