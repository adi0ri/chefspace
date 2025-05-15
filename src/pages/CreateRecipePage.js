// src/pages/CreateRecipePage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
// import { useAuth } from '../contexts/AuthContext'; // Not directly needed if author info is handled in addRecipe

const CreateRecipePage = () => {
    const navigate = useNavigate();
    const { addRecipe } = useRecipes();
    const [title, setTitle] = useState('');
    // ... (other state variables: ingredients, instructions, cuisineType, difficultyLevel)
    const [photoUrl, setPhotoUrl] = useState(''); // Single photo URL for simplicity
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Initialize ingredients state like before
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
    const [instructions, setInstructions] = useState('');
    const [cuisineType, setCuisineType] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('Easy');


    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };
    const addIngredientField = () => setIngredients([...ingredients, { name: '', quantity: '' }]);
    const removeIngredientField = (index) => setIngredients(ingredients.filter((_, i) => i !== index));


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const newRecipeData = {
                title,
                ingredients: ingredients.filter(ing => ing.name && ing.quantity),
                instructions,
                photoURLs: photoUrl ? [photoUrl] : [], // Use photoURLs to match Firestore
                cuisineType,
                difficultyLevel,
                // dietaryRestrictions: [], // Add if you have a form field for it
            };
            const createdRecipe = await addRecipe(newRecipeData);
            navigate(`/recipe/${createdRecipe.id}`);
        } catch (err) {
            setError(err.message || "Failed to create recipe.");
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="container">
            <h1>Create New Recipe</h1>
            {error && <p style={{color: 'red'}}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="title">Title:</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                {/* ... (Ingredients input fields - same as before) ... */}
                <div>
                    <label>Ingredients:</label>
                    {ingredients.map((ing, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input type="text" placeholder="Ingredient Name" value={ing.name} onChange={(e) => handleIngredientChange(index, 'name', e.target.value)} style={{flexGrow: 2}}/>
                            <input type="text" placeholder="Quantity" value={ing.quantity} onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)} style={{flexGrow: 1}}/>
                            {ingredients.length > 1 && <button type="button" onClick={() => removeIngredientField(index)} style={{padding: '5px 10px', background: '#aaa'}}>×</button>}
                        </div>
                    ))}
                    <button type="button" onClick={addIngredientField} style={{alignSelf: 'flex-start', background: '#5cb85c'}}>Add Ingredient</button>
                </div>
                <div>
                    <label htmlFor="instructions">Instructions:</label>
                    <textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="8" required />
                </div>
                <div>
                    <label htmlFor="photoUrl">Photo URL:</label>
                    <input type="text" id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://example.com/image.jpg"/>
                </div>
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
                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Recipe"}
                </button>
            </form>
        </div>
    );
};
export default CreateRecipePage;