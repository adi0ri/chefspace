// src/pages/SearchPage.js
import React, { useState, useMemo } from 'react'; // Removed useEffect, as search is on demand
import { useRecipes } from '../contexts/RecipeContext';
import RecipeCard from '../components/RecipeCard';
// MOCK_RECIPES is no longer used directly for recipes list here

const SearchPage = () => {
    const { recipes, searchRecipes, loadingRecipes, fetchInitialRecipes } = useRecipes(); // Use searchRecipes from context
    const [searchTerm, setSearchTerm] = useState('');
    const [cuisineFilter, setCuisineFilter] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('');

    // To populate filter dropdowns, you might still want a way to get unique values.
    // This could be fetched from a separate 'metadata' doc in Firestore or derived client-side if feasible.
    // For simplicity, we'll keep the previous mock derivation for dropdowns if recipes are loaded.
    const allLoadedRecipes = useRecipes().recipes; // Get all recipes currently in context for filters
    const availableCuisines = useMemo(() => {
        const cuisines = new Set(allLoadedRecipes.map(r => r.cuisineType).filter(Boolean));
        return Array.from(cuisines);
    }, [allLoadedRecipes]);

    const handleSearch = (e) => {
        e.preventDefault();
        searchRecipes({ searchTerm, cuisineFilter, difficultyFilter });
    };

    const clearSearchAndFetchAll = () => {
        setSearchTerm('');
        setCuisineFilter('');
        setDifficultyFilter('');
        fetchInitialRecipes(); // Fetch all recent recipes again
    };

    return (
        <div className="container">
            <h1>Search Recipes</h1>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flexGrow: 1, minWidth: '200px' }}
                />
                <select value={cuisineFilter} onChange={(e) => setCuisineFilter(e.target.value)}>
                    <option value="">All Cuisines</option>
                    {availableCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                    <option value="">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                </select>
                <button type="submit" disabled={loadingRecipes}>Search</button>
                <button type="button" onClick={clearSearchAndFetchAll} disabled={loadingRecipes}>Clear & Show All</button>
            </form>

            {loadingRecipes && <p>Searching...</p>}
            {!loadingRecipes && recipes.length === 0 && <p>No recipes match your search criteria or no recipes found.</p>}
            {!loadingRecipes && recipes.length > 0 && (
                <div className="recipe-grid">
                    {recipes.map(recipe => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    );
};
export default SearchPage;