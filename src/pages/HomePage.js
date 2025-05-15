// src/pages/HomePage.js
import React, { useEffect } from 'react'; // Keep useEffect for logging if needed
import RecipeCard from '../components/RecipeCard';
import { useRecipes } from '../contexts/RecipeContext';

const HomePage = () => {
    const { recipes, loadingRecipes, fetchMoreRecipes, lastFetched } = useRecipes(); // Added lastFetched for Load More logic

    // For Debugging: Log the raw recipes array from context
    useEffect(() => {
        console.log("HomePage - Raw recipes from context (length " + recipes.length + "):", recipes);
        // Check for any non-object items or items without an ID
        recipes.forEach((recipe, index) => {
            if (!recipe || typeof recipe !== 'object' || !recipe.id) {
                console.error(`HomePage - Invalid recipe item at index ${index}:`, recipe);
            }
        });
    }, [recipes]);

    // Filter out any potentially null, undefined, or objects without an ID or title
    // This is a critical step.
    const validRecipes = recipes.filter(recipe => {
        const isValid = recipe && typeof recipe === 'object' && recipe.id && recipe.title;
        // if (!isValid && recipe) { // Log if an object exists but is invalid
        //     console.warn("HomePage - Filtering out invalid recipe object:", recipe);
        // }
        return isValid;
    });

    // For Debugging: Log the filtered recipes
    useEffect(() => {
        console.log("HomePage - Valid recipes after filtering (length " + validRecipes.length + "):", validRecipes);
    }, [validRecipes]);


    if (loadingRecipes && validRecipes.length === 0) {
        return <div className="container"><p>Loading recipes...</p></div>;
    }

    return (
        <div className="container">
            <h1>Recent Recipes</h1>
            {validRecipes.length === 0 && !loadingRecipes && (
                <p>No recipes found yet. Be the first to share!</p>
            )}

            {/* Ensure the grid itself doesn't render if there are no valid recipes,
                though the message above should cover this. */}
            {validRecipes.length > 0 && (
                <div className="recipe-grid">
                    {validRecipes.map(recipe => (
                        // The `RecipeCard` should ideally also handle missing props gracefully,
                        // but the filtering here should prevent invalid objects from reaching it.
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}

            {/* "Load More" button logic:
                - Show if not currently loading.
                - Show if there are already some recipes displayed.
                - Show if `lastFetched` is not null (meaning Firestore indicated there might be more).
                  (The `lastFetched` check is crucial for accurate pagination)
            */}
            {!loadingRecipes && validRecipes.length > 0 && lastFetched && (
                <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '20px' }}>
                    <button 
                        onClick={fetchMoreRecipes} 
                        disabled={loadingRecipes} // Technically redundant if !loadingRecipes is checked above, but good practice
                        className="btn btn-primary" // Assuming you have a global button style
                        style={{padding: '10px 20px', fontSize: '1em'}}
                    >
                        {loadingRecipes ? 'Loading...' : 'Load More Recipes'}
                    </button>
                </div>
            )}
            {!loadingRecipes && validRecipes.length > 0 && !lastFetched && (
                 <p style={{textAlign: 'center', marginTop: '30px', color: '#777'}}>No more recipes to load.</p>
            )}
        </div>
    );
};
export default HomePage;