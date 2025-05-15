// src/components/RecipeCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRecipes } from '../contexts/RecipeContext'; // To call handleToggleLike
// We are moving toggleRecipeSave logic into RecipeDetailPage for better state management of isSaved.
// For the card, it's mostly display. Actions will be on the detail page.
// However, if you want like/save directly on the card, the context function needs to handle UI update.

const RecipeCard = ({ recipe }) => {
    const { currentUser, currentUserProfile } = useAuth();
    const { handleToggleLike } = useRecipes(); // Assuming this updates the recipe in context

    // Defensive checks for recipe object
    if (!recipe || !recipe.id) {
        // console.warn("RecipeCard received an invalid recipe object:", recipe);
        return null; // Don't render if recipe is invalid
    }

    const isLikedByCurrentUser = currentUser && recipe.likedBy?.includes(currentUser.uid);
    // For saved status on the card, we'd ideally need this info passed down or managed in a way
    // that the card can reflect it without fetching user profile for every card.
    // Let's assume for the card, we primarily show counts, and full save interaction is on detail page.
    const isSavedByCurrentUserOnCard = currentUserProfile && currentUserProfile.savedRecipeIds?.includes(recipe.id);


    const onLikeClickOnCard = async (e) => {
        e.preventDefault(); // Prevent navigation if card is wrapped in Link
        e.stopPropagation(); // Prevent event bubbling
        if (!currentUser) {
            alert("Please login to like recipes.");
            console.log("Like attempt: No current user");
            return;
        }
        console.log(`RecipeCard: Attempting to like/unlike recipe ID: ${recipe.id} by user ${currentUser.uid}`);
        try {
            await handleToggleLike(recipe.id, recipe.likedBy); // This should trigger a re-render if 'recipes' in context updates
            console.log(`RecipeCard: Like toggled for ${recipe.id}`);
        } catch (error) {
            console.error("RecipeCard: Error liking/unliking recipe:", error);
            alert("Failed to update like status. Please try again.");
        }
    };

    // Simplified save button for card - actual save/unsave logic on detail page
    // or implement a similar handleToggleSave in RecipeContext if needed here.
    const onSaveClickOnCard = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            alert("Please login to save recipes.");
            return;
        }
        // For the card, you might just navigate to the detail page or show a message
        // alert(`Save functionality primarily on recipe detail page for ${recipe.title}`);
        // Or, if you implement a context function for card-level save:
        // try { await handleToggleSaveOnCard(recipe.id, isSavedByCurrentUserOnCard); } catch ...
        // For now, let's make it a visual indicator and link to the detail page for action
        console.log("RecipeCard: Save button clicked. Interaction on detail page.");
    };


    return (
        <div className="recipe-card">
            <Link to={`/recipe/${recipe.id}`}>
                {/* ... (image and title - same as before) ... */}
                {recipe.photoURLs && recipe.photoURLs.length > 0 ? (
                    <img src={recipe.photoURLs[0]} alt={recipe.title} />
                ) : (
                    <div style={{ height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                )}
                <h3>{recipe.title}</h3>
            </Link>
            <p>By: <Link to={`/profile/${recipe.authorId}`}>{recipe.authorUsername || 'Unknown'}</Link></p>
            <p>Likes: {recipe.likesCount || 0} | Comments: {(recipe.comments && recipe.comments.length) || 0} | Saved: {recipe.savesCount || 0}</p>
            {currentUser && (
                <div className="recipe-card-actions" style={{ marginTop: '10px' }}>
                    <button
                        onClick={onLikeClickOnCard}
                        className={`action-button ${isLikedByCurrentUser ? 'active' : ''}`}
                        aria-pressed={isLikedByCurrentUser}
                        title={isLikedByCurrentUser ? 'Unlike this recipe' : 'Like this recipe'}
                    >
                        <span role="img" aria-label="like icon">{isLikedByCurrentUser ? '❤️' : '🤍'}</span> Like
                    </button>
                    {/* For card, save button might just be an indicator or link */}
                    <Link to={`/recipe/${recipe.id}`} className={`action-button ${isSavedByCurrentUserOnCard ? 'active' : ''}`} style={{marginLeft: '5px', textDecoration:'none'}} title="View and Save/Unsave">
                        <span role="img" aria-label="save icon">{isSavedByCurrentUserOnCard ? '🔖' : '📑'}</span> Save
                    </Link>
                </div>
            )}
        </div>
    );
};

export default RecipeCard;