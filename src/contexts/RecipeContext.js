// src/contexts/RecipeContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
    createRecipeInFirestore,
    getRecipesFromFirestore,
    getRecipeByIdFromFirestore,
    updateRecipeInFirestore, 
    deleteRecipeFromFirestore,
    toggleRecipeLike as serviceToggleRecipeLike,
    addCommentToFirestoreRecipe as serviceAddComment,
    searchRecipesInFirestore
} from '../services/recipeService';

const RecipeContext = createContext();

export const useRecipes = () => useContext(RecipeContext);

export const RecipeProvider = ({ children }) => {
    const [recipes, setRecipes] = useState([]);
    const [loadingRecipes, setLoadingRecipes] = useState(true);
    const [lastFetched, setLastFetched] = useState(null); // Firestore document snapshot for pagination
    const { currentUser, currentUserProfile } = useAuth();

    const fetchInitialRecipes = useCallback(async () => {
        console.log("RecipeContext: Fetching initial recipes...");
        setLoadingRecipes(true);
        try {
            const { recipes: fetchedRecipes, lastVisible } = await getRecipesFromFirestore(null, 9);
            console.log("RecipeContext: Initial recipes fetched count:", fetchedRecipes.length);
            setRecipes(fetchedRecipes);
            setLastFetched(lastVisible);
        } catch (error) {
            console.error("RecipeContext: Error fetching initial recipes:", error);
            setRecipes([]); // Clear on error
        }
        setLoadingRecipes(false);
    }, []);

    useEffect(() => {
        fetchInitialRecipes();
    }, [fetchInitialRecipes]);

    const fetchMoreRecipes = async () => {
        if (!lastFetched) {
            console.log("RecipeContext: No more recipes to fetch (lastFetched is null).");
            return; // No more recipes to fetch
        }
        if (loadingRecipes) return; // Prevent multiple concurrent fetches

        console.log("RecipeContext: Fetching more recipes...");
        setLoadingRecipes(true); // Or a specific "loadingMore" state
        try {
            const { recipes: newRecipes, lastVisible } = await getRecipesFromFirestore(lastFetched, 6);
            console.log("RecipeContext: More recipes fetched count:", newRecipes.length);
            setRecipes(prev => [...prev, ...newRecipes]);
            setLastFetched(lastVisible);
        } catch (error) {
            console.error("RecipeContext: Error fetching more recipes:", error);
        }
        setLoadingRecipes(false);
    };

    const addRecipe = async (newRecipeData) => {
        if (!currentUser) {
            console.error("RecipeContext - addRecipe: User not authenticated");
            throw new Error("User not authenticated to create recipe.");
        }
        console.log("RecipeContext: Adding new recipe by user:", currentUser.uid);
        const recipeWithAuthor = {
            ...newRecipeData,
            authorId: currentUser.uid,
            authorUsername: currentUserProfile?.username || currentUser.displayName || currentUser.email.split('@')[0],
            
        };
        try {
            const createdRecipe = await createRecipeInFirestore(recipeWithAuthor);
            console.log("RecipeContext: Recipe added, new local state:", [createdRecipe, ...recipes]);
            setRecipes(prev => [createdRecipe, ...prev]);
            return createdRecipe;
        } catch (error) {
            console.error("RecipeContext: Error adding recipe:", error);
            throw error;
        }
    };

    const getRecipeById = async (id) => {
        console.log(`RecipeContext: getRecipeById for ID: ${id}`);
        const localRecipe = recipes.find(r => r.id === id);
        if (localRecipe) {
            console.log("RecipeContext: Found recipe in local cache:", localRecipe.title);
            return localRecipe;
        }
        console.log("RecipeContext: Recipe not in cache, fetching from Firestore for ID:", id);
        try {
            const firestoreRecipe = await getRecipeByIdFromFirestore(id);
            
            return firestoreRecipe;
        } catch (error) {
            console.error(`RecipeContext: Error in getRecipeById for ${id}:`, error);
            throw error;
        }
    };

    const deleteRecipe = async (id) => {
        console.log(`RecipeContext: Deleting recipe ID: ${id}`);
        try {
            await deleteRecipeFromFirestore(id);
            setRecipes(prev => prev.filter(r => r.id !== id));
            console.log("RecipeContext: Recipe deleted from local state.");
        } catch (error) {
            console.error(`RecipeContext: Error deleting recipe ${id}:`, error);
            throw error;
        }
    };

    const handleToggleLike = async (recipeId, currentLikedByArray = []) => {
        if (!currentUser || !currentUser.uid) {
            console.error("RecipeContext - handleToggleLike: User not authenticated.");
            throw new Error("User not authenticated to like.");
        }
        console.log(`RecipeContext: Toggling like for recipe ${recipeId}`);
        const isCurrentlyLiked = currentLikedByArray.includes(currentUser.uid);
        try {
            await serviceToggleRecipeLike(recipeId, currentUser.uid, isCurrentlyLiked);
            const updatedRecipe = await getRecipeByIdFromFirestore(recipeId); // Get the latest state
            if (updatedRecipe) {
                setRecipes(prevRecipes =>
                    prevRecipes.map(r => (r.id === recipeId ? updatedRecipe : r))
                );
                console.log("RecipeContext: Like status updated in local recipes state.");
            } else {
                 console.warn("RecipeContext: Post-like, updated recipe not found, re-fetching all.");
                 await fetchInitialRecipes(); // Fallback if specific recipe fetch fails
            }
        } catch (error) {
            console.error(`RecipeContext: Error in handleToggleLike for recipe ${recipeId}:`, error);
            throw error;
        }
    };

    const addComment = async (recipeId, text) => {
        if (!currentUser || !currentUser.uid) {
            console.error("RecipeContext - addComment: User not authenticated.");
            throw new Error("User not authenticated to comment.");
        }
        console.log(`RecipeContext: Adding comment to recipe ${recipeId}`);
        const commentData = {
            userId: currentUser.uid,
            username: currentUserProfile?.username || currentUser.displayName || currentUser.email.split('@')[0],
            text,
        };
        try {
            await serviceAddComment(recipeId, commentData);
            const updatedRecipe = await getRecipeByIdFromFirestore(recipeId); // Get latest state with new comment
            if (updatedRecipe) {
                setRecipes(prevRecipes =>
                    prevRecipes.map(r => (r.id === recipeId ? updatedRecipe : r))
                );
                console.log("RecipeContext: Comment added, updated local recipes state.");
            } else {
                console.warn("RecipeContext: Post-comment, updated recipe not found, re-fetching all.");
                await fetchInitialRecipes(); // Fallback
            }
        } catch (error) {
            console.error(`RecipeContext: Error in addComment for recipe ${recipeId}:`, error);
            throw error;
        }
    };

    const searchRecipes = async (searchParams) => {
        console.log("RecipeContext: Searching recipes with params:", searchParams);
        setLoadingRecipes(true);
        try {
            const foundRecipes = await searchRecipesInFirestore(searchParams);
            console.log("RecipeContext: Search results count:", foundRecipes.length);
            setRecipes(foundRecipes);
            setLastFetched(null); // Reset pagination for search results
        } catch (error) {
            console.error("RecipeContext: Error in searchRecipes context:", error);
            setRecipes([]); // Clear recipes on search error
        }
        setLoadingRecipes(false);
    };

    

    const value = {
        recipes,
        loadingRecipes,
        lastFetched,
        fetchInitialRecipes,
        fetchMoreRecipes,
        addRecipe,
        getRecipeById, // is async
        
        deleteRecipe,
        handleToggleLike,
        addComment,
        searchRecipes,
    };

    return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>;
};