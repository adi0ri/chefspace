// src/components/RecipeCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRecipes } from '../contexts/RecipeContext'; // To call handleToggleLike
import { toggleRecipeSave } from '../services/recipeService'; // For save/unsave
import { getUserProfile } from '../services/userService'; // For updating savedRecipeIds in context

const RecipeCard = ({ recipe }) => {
    const { currentUser, currentUserProfile } = useAuth(); // currentUserProfile has savedRecipeIds
    const { handleToggleLike } = useRecipes(); // For likes
    // const { refreshUserProfile } = useAuth(); // Conceptual: a function to refresh currentUserProfile

    const isLikedByCurrentUser = currentUser && recipe.likedBy?.includes(currentUser.uid);
    const isSavedByCurrentUser = currentUserProfile && currentUserProfile.savedRecipeIds?.includes(recipe.id);

    const onLikeClick = async () => {
        if (!currentUser) return alert("Please login to like recipes.");
        try {
            await handleToggleLike(recipe.id, recipe.likedBy);
            // UI will update when recipe context refreshes the recipe, or if RecipeDetailPage re-fetches
        } catch (error) {
            console.error("Error liking/unliking recipe:", error);
            alert("Failed to update like.");
        }
    };

    const onSaveClick = async () => {
        if (!currentUser) return alert("Please login to save recipes.");
        try {
            await toggleRecipeSave(recipe.id, currentUser.uid, isSavedByCurrentUser);
            // Manually refresh the currentUserProfile in AuthContext to reflect the change
            // This is a tricky part without a direct context update function.
            // A full solution might involve the AuthContext re-fetching the profile.
            // For now, the local state in RecipeDetailPage handles its own isSaved,
            // and UserProfilePage will fetch the latest on load.
            // To make the card itself reactive to saved status changes immediately across the app,
            // AuthContext would need a way to broadcast or allow updates to currentUserProfile.
            // Or, RecipeContext could manage the "isSaved" status per recipe if it fetched that info.
            alert(`Recipe ${isSavedByCurrentUser ? 'unsaved' : 'saved'}. Refresh profile to see updated list.`);
            // Conceptual: if (refreshUserProfile) refreshUserProfile();
        } catch (error) {
            console.error("Error saving/unsaving recipe:", error);
            alert("Failed to update save status.");
        }
    };

    return (
        <div className="recipe-card">
            <Link to={`/recipe/${recipe.id}`}>
                {recipe.photoURLs && recipe.photoURLs.length > 0 ? (
                    <img src={recipe.photoURLs[0]} alt={recipe.title} />
                ) : (
                    <div style={{ height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                )}
                <h3>{recipe.title}</h3>
            </Link>
            <p>By: <Link to={`/profile/${recipe.authorId}`}>{recipe.authorUsername}</Link></p>
            <p>Cuisine: {recipe.cuisineType || 'N/A'} | Difficulty: {recipe.difficultyLevel || 'N/A'}</p>
            <p>Likes: {recipe.likesCount || 0} | Comments: {(recipe.comments && recipe.comments.length) || 0} | Saved: {recipe.savesCount || 0}</p>
            {currentUser && (
                <div>
                    <button 
                        onClick={onLikeClick}
                        className={`action-button ${isLikedByCurrentUser ? 'active' : ''}`}
                    >
                        {isLikedByCurrentUser ? 'Unlike' : 'Like'}
                    </button>
                    <button 
                        onClick={onSaveClick}
                        className={`action-button ${isSavedByCurrentUser ? 'active' : ''}`}
                    >
                        {isSavedByCurrentUser ? 'Unsave' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default RecipeCard;