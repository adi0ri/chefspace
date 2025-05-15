// src/contexts/RecipeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
    createRecipeInFirestore,
    getRecipesFromFirestore,
    getRecipeByIdFromFirestore,
    updateRecipeInFirestore,
    deleteRecipeFromFirestore,
    toggleRecipeLike,
    addCommentToFirestoreRecipe,
    toggleRecipeSave, // We'll use the service function directly in components
    searchRecipesInFirestore
} from '../services/recipeService';

const RecipeContext = createContext();

export const useRecipes = () => useContext(RecipeContext);

export const RecipeProvider = ({ children }) => {
    const [recipes, setRecipes] = useState([]);
    const [loadingRecipes, setLoadingRecipes] = useState(true);
    const [lastFetched, setLastFetched] = useState(null); // For pagination
    const { currentUser, currentUserProfile } = useAuth();

    // Initial fetch of recipes
    useEffect(() => {
        fetchInitialRecipes();
    }, []);

    const fetchInitialRecipes = async () => {
        setLoadingRecipes(true);
        try {
            const { recipes: fetchedRecipes, lastVisible } = await getRecipesFromFirestore(null, 9);
            setRecipes(fetchedRecipes);
            setLastFetched(lastVisible);
        } catch (error) {
            console.error("Error fetching initial recipes:", error);
        }
        setLoadingRecipes(false);
    };

    const fetchMoreRecipes = async () => {
        if (!lastFetched) return; // No more recipes to fetch
        setLoadingRecipes(true); // Or a different loading state for "loading more"
        try {
            const { recipes: newRecipes, lastVisible } = await getRecipesFromFirestore(lastFetched, 6);
            setRecipes(prev => [...prev, ...newRecipes]);
            setLastFetched(lastVisible);
        } catch (error) {
            console.error("Error fetching more recipes:", error);
        }
        setLoadingRecipes(false);
    };


    const addRecipe = async (newRecipeData) => {
        if (!currentUser) throw new Error("User not authenticated");
        const recipeWithAuthor = {
            ...newRecipeData,
            authorId: currentUser.uid,
            authorUsername: currentUser.displayName || currentUserProfile?.username || currentUser.email.split('@')[0],
            likedBy: [], // Initialize likedBy array
            comments: [], // Initialize comments array
            likesCount: 0,
            savesCount: 0
        };
        const createdRecipe = await createRecipeInFirestore(recipeWithAuthor);
        setRecipes(prev => [createdRecipe, ...prev]); // Add to top
        return createdRecipe;
    };

    const getRecipeById = async (id) => {
        // Check local cache first
        const localRecipe = recipes.find(r => r.id === id);
        if (localRecipe) return localRecipe;
        // Fetch from Firestore if not found locally (e.g., direct link)
        return await getRecipeByIdFromFirestore(id);
    };

    const updateRecipe = async (id, updatedData) => {
        await updateRecipeInFirestore(id, updatedData);
        setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));
    };

    const deleteRecipe = async (id) => {
        await deleteRecipeFromFirestore(id);
        setRecipes(prev => prev.filter(r => r.id !== id));
    };

    const handleToggleLike = async (recipeId, currentLikesArray = []) => {
        if (!currentUser) throw new Error("User not authenticated");
        const isCurrentlyLiked = currentLikesArray.includes(currentUser.uid);
        await toggleRecipeLike(recipeId, currentUser.uid, isCurrentlyLiked);
        // Refresh specific recipe or all recipes for UI update
        // For simplicity, we'll rely on components to refetch or manage local state
        // A more robust solution would update the recipe in the local `recipes` state.
        const updatedRecipe = await getRecipeByIdFromFirestore(recipeId);
        if(updatedRecipe) {
            setRecipes(prev => prev.map(r => r.id === recipeId ? updatedRecipe : r));
        }
    };

    const addComment = async (recipeId, text) => {
        if (!currentUser) throw new Error("User not authenticated");
        const commentData = {
            userId: currentUser.uid,
            username: currentUser.displayName || currentUserProfile?.username || currentUser.email.split('@')[0],
            text,
        };
        await addCommentToFirestoreRecipe(recipeId, commentData);
        const updatedRecipe = await getRecipeByIdFromFirestore(recipeId);
         if(updatedRecipe) {
            setRecipes(prev => prev.map(r => r.id === recipeId ? updatedRecipe : r));
        }
    };
    
    // toggleRecipeSave is now a service function.
    // Components will call it directly and then update currentUserProfile.savedRecipeIds if needed.

    const searchRecipes = async (searchParams) => {
        setLoadingRecipes(true);
        try {
            const foundRecipes = await searchRecipesInFirestore(searchParams);
            setRecipes(foundRecipes); // Replace current recipes with search results
            setLastFetched(null); // Reset pagination for search results
        } catch (error) {
            console.error("Error in searchRecipes context:", error);
        }
        setLoadingRecipes(false);
    };


    const value = {
        recipes,
        loadingRecipes,
        fetchMoreRecipes,
        addRecipe,
        getRecipeById, // This is now async
        updateRecipe,
        deleteRecipe,
        handleToggleLike,
        addComment,
        searchRecipes,
        fetchInitialRecipes // Expose to allow re-fetching all
    };

    return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
};