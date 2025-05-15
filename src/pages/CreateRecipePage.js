// src/pages/CreateRecipePage.js
import React, { useState, useRef } from 'react'; // Added useRef
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext'; // To get currentUser for upload path
import { uploadFile } from '../services/storageService'; // Import your upload service

// Define available dietary restrictions (you can move this to a constants file)
const DIETARY_OPTIONS = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Keto", "Paleo", "Low-Carb"
];

const CreateRecipePage = () => {
    const navigate = useNavigate();
    const { addRecipe } = useRecipes();
    const { currentUser } = useAuth(); // Get current user for upload path

    const [title, setTitle] = useState('');
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
    const [instructions, setInstructions] = useState('');
    
    const [coverPhotoFile, setCoverPhotoFile] = useState(null); // State for the actual file object
    const [photoPreview, setPhotoPreview] = useState(null);     // State for image preview URL
    const fileInputRef = useRef(null);                          // Ref to trigger file input

    const [cuisineType, setCuisineType] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('Easy');
    const [selectedDietary, setSelectedDietary] = useState([]); // State for selected dietary restrictions

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);


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
        const file = event.target.files[0];
        if (file) {
            setCoverPhotoFile(file); // Store the file object
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result); // Set preview for the selected file
            };
            reader.readAsDataURL(file);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            setError("You must be logged in to create a recipe.");
            return;
        }
        setLoading(true); setError('');
        let uploadedPhotoURL = ''; // Will store the URL from Firebase Storage

        try {
            if (coverPhotoFile) {
                setUploadingPhoto(true);
                // Path in Firebase Storage: recipePictures/{userId}/{uniqueFileName}
                // The unique file name is handled by uploadFile service
                uploadedPhotoURL = await uploadFile(coverPhotoFile, `recipePictures/${currentUser.uid}/uploads`);
                setUploadingPhoto(false);
            }

            const newRecipeData = {
                title,
                ingredients: ingredients.filter(ing => ing.name && ing.quantity),
                instructions,
                photoURLs: uploadedPhotoURL ? [uploadedPhotoURL] : [], // Store as an array
                cuisineType,
                difficultyLevel,
                dietaryRestrictions: selectedDietary, // Add selected dietary restrictions
                // authorId and authorUsername will be added by addRecipe in RecipeContext
            };

            const createdRecipe = await addRecipe(newRecipeData); // Call the context function

            if (createdRecipe && createdRecipe.id) {
                navigate(`/recipe/${createdRecipe.id}`);
            } else {
                // This case might occur if addRecipe in context doesn't return the full recipe object with ID
                // or if there was an issue not caught by a throw.
                console.warn("Recipe created, but navigation ID might be missing from context response.", createdRecipe);
                navigate('/'); // Fallback navigation
            }
        } catch (err) {
            setError(err.message || "Failed to create recipe. Please try again.");
            console.error("Create Recipe Error:", err);
            setUploadingPhoto(false); // Ensure uploadingPhoto is reset on error
        }
        setLoading(false);
    };

    return (
        <div className="container">
            <h1>Create New Recipe</h1>
            {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '15px'}}>{error}</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="title">Title:</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div style={{ margin: '20px 0' }}>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Ingredients:</label>
                    {ingredients.map((ing, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Ingredient Name (e.g., Flour)"
                                value={ing.name}
                                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                style={{flexGrow: 2, padding: '10px', border: '1px solid #ccc', borderRadius: '4px'}}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Quantity (e.g., 1 cup)"
                                value={ing.quantity}
                                onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                style={{flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px'}}
                                required
                            />
                            {ingredients.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeIngredientField(index)}
                                    className="btn" // Use a general button class if you have one
                                    style={{padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px'}}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addIngredientField}
                        className="btn"
                        style={{padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginTop: '5px'}}
                    >
                        Add Ingredient
                    </button>
                </div>

                <div>
                    <label htmlFor="instructions">Instructions:</label>
                    <textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="8" required />
                </div>

                {/* --- ACTUAL PHOTO UPLOAD SECTION --- */}
                <div style={{ margin: '20px 0' }}>
                    <label style={{display: 'block', marginBottom: '10px', fontWeight: 'bold'}}>Cover Photo:</label>
                    {photoPreview && (
                        <img
                            src={photoPreview}
                            alt="Recipe cover preview"
                            style={{ maxWidth: '100%', maxHeight: '250px', display: 'block', marginBottom: '10px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee' }}
                        />
                    )}
                    <input
                        type="file"
                        accept="image/*" // Accept all image types
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        style={{ display: 'none' }} // Hide the default input
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()} // Trigger click on hidden input
                        className="btn"
                        style={{padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px'}}
                        disabled={loading || uploadingPhoto}
                    >
                        {coverPhotoFile ? `Change Photo: ${coverPhotoFile.name.substring(0,20)}...` : "Choose Cover Photo"}
                    </button>
                    {uploadingPhoto && <p style={{marginTop: '5px', color: '#007bff'}}>Uploading photo...</p>}
                </div>
                {/* --- END OF PHOTO UPLOAD SECTION --- */}


                <div>
                    <label htmlFor="cuisineType">Cuisine Type:</label>
                    <input type="text" id="cuisineType" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} />
                </div>

                <div>
                    <label htmlFor="difficultyLevel">Difficulty Level:</label>
                    <select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>

                {/* --- DIETARY RESTRICTIONS CHECKLIST --- */}
                <div style={{ margin: '20px 0' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                        Dietary Restrictions (select all that apply):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px' }}>
                        {DIETARY_OPTIONS.map(option => (
                            <label key={option} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: '6px 10px', border: '1px solid #eee', borderRadius: '15px', transition: 'background-color 0.2s', backgroundColor: selectedDietary.includes(option) ? '#e0f7fa' : 'transparent' }}
                            >
                                <input
                                    type="checkbox"
                                    value={option}
                                    checked={selectedDietary.includes(option)}
                                    onChange={handleDietaryChange}
                                    style={{ marginRight: '8px', accentColor: '#007bff' }} // Modern way to style checkbox color
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                </div>
                {/* --- END OF DIETARY RESTRICTIONS CHECKLIST --- */}

                <button type="submit" disabled={loading || uploadingPhoto} className="btn btn-primary" style={{marginTop: '20px', width: '100%', padding: '12px'}}>
                    {loading ? "Creating Recipe..." : (uploadingPhoto ? "Processing Photo..." : "Create Recipe")}
                </button>
            </form>
        </div>
    );
};
export default CreateRecipePage;