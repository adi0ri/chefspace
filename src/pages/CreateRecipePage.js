// src/pages/CreateRecipePage.js
import React, { useState, useRef } from 'react'; // Added useRef
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext'; // To get currentUser for upload path
import { uploadFile } from '../services/storageService';

// Define available dietary restrictions
const DIETARY_OPTIONS = [
    "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Keto", "Paleo", "Low-Carb"
];


const CreateRecipePage = () => {
    const navigate = useNavigate();
    const { addRecipe } = useRecipes();
    const { currentUser } = useAuth(); // Get current user

    const [title, setTitle] = useState('');
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
    const [instructions, setInstructions] = useState('');
    
    const [coverPhotoFile, setCoverPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);

    const [cuisineType, setCuisineType] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('Easy');
    const [selectedDietary, setSelectedDietary] = useState([]); // For selected dietary restrictions

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);


    const handleIngredientChange = (index, field, value) => { /* ... same ... */ };
    const addIngredientField = () => { /* ... same ... */ };
    const removeIngredientField = (index) => { /* ... same ... */ };
    // Previous ingredient handlers:
    // const handleIngredientChange = (index, field, value) => { const newIngredients = [...ingredients]; newIngredients[index][field] = value; setIngredients(newIngredients); };
    // const addIngredientField = () => setIngredients([...ingredients, { name: '', quantity: '' }]);
    // const removeIngredientField = (index) => setIngredients(ingredients.filter((_, i) => i !== index));

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setCoverPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
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
        setLoading(true); setLoading(true); setError('');
        let uploadedPhotoURL = '';

        try {
            if (coverPhotoFile) {
                setUploadingPhoto(true);
                // We need a recipe ID for the path, but we don't have one yet.
                // Option 1: Generate a temporary ID or use a placeholder, then update after recipe creation.
                // Option 2: Create recipe doc first (minimal data), get ID, upload photo, then update recipe doc.
                // Option 3 (Simpler for now): Upload to a path with just userId and a unique file name.
                uploadedPhotoURL = await uploadFile(coverPhotoFile, `recipePictures/${currentUser.uid}/general`);
                setUploadingPhoto(false);
            }

            const newRecipeData = {
                title,
                ingredients: ingredients.filter(ing => ing.name && ing.quantity),
                instructions,
                photoURLs: uploadedPhotoURL ? [uploadedPhotoURL] : [],
                cuisineType,
                difficultyLevel,
                dietaryRestrictions: selectedDietary, // Add selected dietary restrictions
                // authorId and authorUsername will be added by addRecipe in RecipeContext
            };
            const createdRecipe = await addRecipe(newRecipeData);
            
            // If using Option 2 for photo upload (upload after getting recipe ID):
            // if (coverPhotoFile && createdRecipe.id) {
            //   uploadedPhotoURL = await uploadFile(coverPhotoFile, `recipePictures/${currentUser.uid}/${createdRecipe.id}`);
            //   await updateRecipeInFirestore(createdRecipe.id, { photoURLs: [uploadedPhotoURL] }); // Need updateRecipeInFirestore in recipeService
            // }

            navigate(`/recipe/${createdRecipe.id}`);
        } catch (err) {
            setError(err.message || "Failed to create recipe.");
            console.error(err);
            setUploadingPhoto(false);
        }
        setLoading(false);
    };

    return (
        <div className="container">
            <h1>Create New Recipe</h1>
            {/* ... (error display) ... */}
            {error && <p style={{color: 'red'}}>{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* ... (title, ingredients, instructions, cuisine, difficulty - same structure) ... */}
                <div><label htmlFor="title">Title:</label><input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
                {/* Ingredients fields... */}
                <div><label htmlFor="instructions">Instructions:</label><textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="8" required /></div>


                <div style={{ margin: '20px 0' }}>
                    <label>Cover Photo:</label>
                    {photoPreview && (
                        <img src={photoPreview} alt="Recipe preview" style={{ maxWidth: '300px', maxHeight: '200px', display: 'block', marginBottom: '10px', objectFit: 'cover' }} />
                    )}
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
                        disabled={loading || uploadingPhoto}
                    >
                        {coverPhotoFile ? "Change Photo" : "Upload Cover Photo"}
                    </button>
                    {uploadingPhoto && <p>Uploading photo...</p>}
                </div>

                <div><label htmlFor="cuisineType">Cuisine Type:</label><input type="text" id="cuisineType" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} /></div>
                <div><label htmlFor="difficultyLevel">Difficulty Level:</label><select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select></div>

                <div style={{ margin: '20px 0' }}>
                    <label>Dietary Restrictions (select all that apply):</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {DIETARY_OPTIONS.map(option => (
                            <label key={option} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    value={option}
                                    checked={selectedDietary.includes(option)}
                                    onChange={handleDietaryChange}
                                    style={{ marginRight: '5px' }}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                </div>
                
                <button type="submit" disabled={loading || uploadingPhoto}>
                    {loading ? "Creating..." : "Create Recipe"}
                </button>
            </form>
        </div>
    );
};
export default CreateRecipePage;