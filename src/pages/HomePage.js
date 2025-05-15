// src/pages/HomePage.js
import React, { useEffect } from 'react';
import RecipeCard from '../components/RecipeCard';
import { useRecipes } from '../contexts/RecipeContext';

const HomePage = () => {
    const { recipes, loadingRecipes, fetchMoreRecipes, fetchInitialRecipes } = useRecipes();

    // useEffect(() => {
    //     // fetchInitialRecipes is called by RecipeProvider now
    // }, [fetchInitialRecipes]);


    if (loadingRecipes && recipes.length === 0) {
        return <div className="container"><p>Loading recipes...</p></div>;
    }

    return (
        <div className="container">
            <h1>Recent Recipes</h1>
            {recipes.length === 0 && !loadingRecipes && <p>No recipes found yet.</p>}
            <div className="recipe-grid">
                {recipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
            </div>
            {recipes.length > 0 && !loadingRecipes && ( /* Basic check if more can be loaded */
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button onClick={fetchMoreRecipes} disabled={loadingRecipes}>
                        {loadingRecipes ? 'Loading...' : 'Load More Recipes'}
                    </button>
                </div>
            )}
        </div>
    );
};
export default HomePage;