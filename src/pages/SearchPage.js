// src/pages/SearchPage.js
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect for logging
import { useRecipes } from '../contexts/RecipeContext';
import RecipeCard from '../components/RecipeCard';

const SearchPage = () => {
    // `recipes` from context here will be the current list (either all or search results)
    const { recipes: contextRecipes, searchRecipes, loadingRecipes, fetchInitialRecipes } = useRecipes();
    const [searchTerm, setSearchTerm] = useState('');
    const [cuisineFilter, setCuisineFilter] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('');

    // For Debugging: Log the raw contextRecipes
    useEffect(() => {
        console.log("SearchPage - Raw contextRecipes (length " + contextRecipes.length + "):", contextRecipes);
        contextRecipes.forEach((recipe, index) => {
            if (!recipe || typeof recipe !== 'object' || !recipe.id) {
                console.error(`SearchPage - Invalid recipe item at index ${index}:`, recipe);
            }
        });
    }, [contextRecipes]);

    // Filter out any potentially null, undefined, or objects without an ID or title
    const validDisplayedRecipes = contextRecipes.filter(recipe => {
        const isValid = recipe && typeof recipe === 'object' && recipe.id && recipe.title;
        // if (!isValid && recipe) { // Log if an object exists but is invalid
        //     console.warn("SearchPage - Filtering out invalid recipe object:", recipe);
        // }
        return isValid;
    });

    // For Debugging: Log the filtered displayedRecipes
    useEffect(() => {
        console.log("SearchPage - Valid displayed recipes after filtering (length " + validDisplayedRecipes.length + "):", validDisplayedRecipes);
    }, [validDisplayedRecipes]);


    // To populate filter dropdowns, use all recipes that *could* be loaded initially or after a clear.
    // If contextRecipes changes due to search, this dropdown list shouldn't necessarily change based on *search results*.
    // It might be better to fetch distinct cuisines/difficulties once or use a broader set.
    // For now, using the current contextRecipes for filter options might be okay if "Clear & Show All" repopulates fully.
    const allPossibleRecipesForFilters = useRecipes().recipes.filter(Boolean); // A bit redundant, but gets the full list from context if needed.
                                                                              // A better approach for filters would be a separate fetch for distinct values.
    const availableCuisines = useMemo(() => {
        const cuisines = new Set(allPossibleRecipesForFilters.map(r => r.cuisineType).filter(Boolean));
        return Array.from(cuisines).sort();
    }, [allPossibleRecipesForFilters]);

    const handleSearch = (e) => {
        e.preventDefault();
        searchRecipes({ searchTerm, cuisineFilter, difficultyFilter });
    };

    const clearSearchAndFetchAll = () => {
        setSearchTerm('');
        setCuisineFilter('');
        setDifficultyFilter('');
        fetchInitialRecipes(); // This should repopulate `contextRecipes` with all recent items
    };

    return (
        <div className="container">
            <h1>Search Recipes</h1>
            <form onSubmit={handleSearch} style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                <input
                    type="text"
                    placeholder="Search by title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flexGrow: 1, minWidth: '200px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <select
                    value={cuisineFilter}
                    onChange={(e) => setCuisineFilter(e.target.value)}
                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                    <option value="">All Cuisines</option>
                    {availableCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                    <option value="">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                </select>
                <button type="submit" disabled={loadingRecipes} className="btn btn-primary" style={{padding: '10px 15px'}}>
                    Search
                </button>
                <button type="button" onClick={clearSearchAndFetchAll} disabled={loadingRecipes} className="btn" style={{padding: '10px 15px', backgroundColor: '#6c757d', color: 'white'}}>
                    Clear & Show All
                </button>
            </form>

            {loadingRecipes && <p>Loading results...</p>}
            {!loadingRecipes && validDisplayedRecipes.length === 0 && (
                <p>No recipes match your search criteria. Try broadening your search or <button onClick={clearSearchAndFetchAll} style={{background:'none', border:'none', color:'#007bff', cursor:'pointer', padding:'0', textDecoration:'underline'}}>show all recipes</button>.</p>
            )}

            {/* Render the grid only if there are valid recipes to display */}
            {!loadingRecipes && validDisplayedRecipes.length > 0 && (
                <div className="recipe-grid">
                    {validDisplayedRecipes.map(recipe => (
                        // The filtering above should ensure recipe is valid
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    );
};
export default SearchPage;