// src/pages/RecipeDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } // useNavigate added back
from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext';
import { toggleRecipeSave } from '../services/recipeService';
import { getUserProfile } from '../services/userService'; // To refresh user profile for save status

const RecipeDetailPage = () => {
    const { id } = useParams();
    // handleToggleLike and addComment come from useRecipes context
    const { getRecipeById, handleToggleLike, addComment, deleteRecipe: deleteRecipeFromContext } = useRecipes();
    const { currentUser, currentUserProfile, /* No direct updateUserProfile needed here from AuthContext for this page */ } = useAuth();
    const navigate = useNavigate(); // Added navigate

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSavedByCurrentUser, setIsSavedByCurrentUser] = useState(false);
    const [actionError, setActionError] = useState('');

    const fetchRecipeAndUserData = useCallback(async () => {
        console.log(`RecipeDetailPage: Fetching recipe ID: ${id}`);
        setLoading(true);
        setActionError('');
        try {
            const fetchedRecipe = await getRecipeById(id); // This should fetch from Firestore via context
            console.log("RecipeDetailPage: Fetched Recipe:", fetchedRecipe);
            if (fetchedRecipe) {
                setRecipe(fetchedRecipe);
                // Check saved status based on currentUserProfile (which should be up-to-date from AuthContext)
                if (currentUserProfile && fetchedRecipe.id) {
                    const saved = currentUserProfile.savedRecipeIds?.includes(fetchedRecipe.id) || false;
                    console.log(`RecipeDetailPage: Recipe ${fetchedRecipe.id} isSaved status: ${saved}`);
                    setIsSavedByCurrentUser(saved);
                } else if (currentUser && !currentUserProfile) {
                    console.warn("RecipeDetailPage: currentUser exists but currentUserProfile is null. Save status might be inaccurate.");
                }
            } else {
                console.warn(`RecipeDetailPage: Recipe with ID ${id} not found.`);
                setActionError(`Recipe not found.`);
            }
        } catch (error) {
            console.error("RecipeDetailPage: Error fetching recipe details:", error);
            setActionError("Could not load recipe details.");
        }
        setLoading(false);
    }, [id, getRecipeById, currentUserProfile, currentUser]); // Added currentUser to dependency array

    useEffect(() => {
        fetchRecipeAndUserData();
    }, [fetchRecipeAndUserData]); // Correct dependency

    const onToggleLikeInternal = async () => {
        if (!currentUser) {
            alert("Please login to like recipes.");
            console.log("Like attempt: No current user");
            return;
        }
        if (!recipe || !recipe.id) {
            console.error("Like attempt: Invalid recipe object");
            return;
        }
        console.log(`RecipeDetailPage: Attempting to like/unlike recipe ID: ${recipe.id}`);
        setActionError('');
        try {
            // handleToggleLike from context should update Firestore AND then update the recipe in context's state
            await handleToggleLike(recipe.id, recipe.likedBy || []); // Pass current likedBy array
            // After context updates, RecipeContext should ideally provide the updated recipe,
            // or this component re-fetches. Let's assume context handles the recipe state update for now.
            // To see immediate change, we might need to refetch or context needs to be more reactive here.
            await fetchRecipeAndUserData(); // Re-fetch to ensure UI consistency for likes
            console.log("RecipeDetailPage: Like toggled successfully.");
        } catch (error) {
            console.error("RecipeDetailPage: Error toggling like:", error);
            setActionError("Failed to update like status.");
        }
    };

    const handleCommentSubmitInternal = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Please login to comment.");
            console.log("Comment attempt: No current user");
            return;
        }
        if (!commentText.trim()) return;
        if (!recipe || !recipe.id) {
            console.error("Comment attempt: Invalid recipe object");
            return;
        }
        console.log(`RecipeDetailPage: Submitting comment for recipe ID: ${recipe.id}`);
        setActionError('');
        try {
            await addComment(recipe.id, commentText); // addComment from context
            setCommentText('');
            await fetchRecipeAndUserData(); // Re-fetch to show new comment and update comment count
            console.log("RecipeDetailPage: Comment submitted successfully.");
        } catch (error) {
            console.error("RecipeDetailPage: Error adding comment:", error);
            setActionError("Failed to post comment.");
        }
    };

    const handleToggleSaveInternal = async () => {
        if (!currentUser || !currentUser.uid) { // Check currentUser.uid specifically
            alert("Please login to save recipes.");
            console.log("Save attempt: No current user or UID");
            return;
        }
        if (!recipe || !recipe.id) {
            console.error("Save attempt: Invalid recipe object");
            return;
        }
        console.log(`RecipeDetailPage: Toggling save for recipe ID: ${recipe.id}, current save status: ${isSavedByCurrentUser}`);
        setActionError('');
        try {
            await toggleRecipeSave(recipe.id, currentUser.uid, isSavedByCurrentUser);
            setIsSavedByCurrentUser(!isSavedByCurrentUser); // Optimistic UI update for saved status

            // To update AuthContext.currentUserProfile with the new savedRecipeIds:
            // This is a bit tricky as AuthContext doesn't have a direct setter or refresh function for currentUserProfile
            // We'll fetch the user profile and rely on onAuthStateChanged OR a manual update if we modify AuthContext
            const updatedUserProfile = await getUserProfile(currentUser.uid); // Fetch fresh
            if (updatedUserProfile) {
                // Ideally, AuthContext would have a function like:
                // authContext.setCurrentUserProfile(updatedUserProfile);
                // For now, we assume on next app load or settings page visit it will refresh.
                // This means the savedRecipeIds in currentUserProfile might be stale until a full refresh of it.
                console.log("RecipeDetailPage: User profile fetched after save/unsave:", updatedUserProfile.savedRecipeIds);
            }
            await fetchRecipeAndUserData(); // Re-fetch recipe to update its savesCount
            console.log("RecipeDetailPage: Save status toggled successfully.");
        } catch (error) {
            console.error("RecipeDetailPage: Error toggling save:", error);
            setActionError("Failed to update save status.");
        }
    };

    const handleDeleteInternal = async () => { /* ... same as before ... */ };


    if (loading) return <div className="container"><p>Loading recipe details...</p></div>;
    if (actionError && !recipe) return <div className="container"><p style={{color: 'red'}}>{actionError}</p><Link to="/">Go Home</Link></div>;
    if (!recipe) return <div className="container"><p>Recipe not found.</p><Link to="/">Go Home</Link></div>; // Should be caught by error above

    const isAuthor = currentUser && recipe.authorId === currentUser.uid;
    // Use recipe.likedBy from the fetched recipe state for more reliability
    const isLikedByCurrentUserState = currentUser && recipe.likedBy?.includes(currentUser.uid);

    return (
        <div className="container recipe-detail">
            {actionError && <p style={{ color: 'red', textAlign: 'center' }}>{actionError}</p>}
            <h1>{recipe.title}</h1>
            {/* ... (other recipe details: author, image, ingredients, instructions) ... */}
            <p>By: <Link to={`/profile/${recipe.authorId}`}>{recipe.authorUsername || "Unknown"}</Link></p>
            {recipe.photoURLs && recipe.photoURLs.length > 0 && (
                <img src={recipe.photoURLs[0]} alt={recipe.title} style={{ /* ... */ }}/>
            )}
            <h2>Ingredients</h2><ul>{recipe.ingredients?.map((ing, index) => (<li key={index}>{ing.quantity} {ing.name}</li>))}</ul>
            <h2>Instructions</h2><p style={{whiteSpace: 'pre-wrap'}}>{recipe.instructions}</p>


            {currentUser && (
                <div className="recipe-actions" style={{ margin: "20px 0", display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onToggleLikeInternal}
                        className={`action-button ${isLikedByCurrentUserState ? 'active' : ''}`}
                        aria-pressed={isLikedByCurrentUserState}
                    >
                        <span role="img" aria-label="like icon">{isLikedByCurrentUserState ? '❤️' : '🤍'}</span>
                        Like ({recipe.likesCount || 0})
                    </button>
                    <button
                        onClick={handleToggleSaveInternal}
                        className={`action-button ${isSavedByCurrentUser ? 'active' : ''}`}
                        aria-pressed={isSavedByCurrentUser}
                    >
                         <span role="img" aria-label="save icon">{isSavedByCurrentUser ? '🔖' : '📑'}</span>
                        {isSavedByCurrentUser ? 'Unsave' : 'Save'} ({recipe.savesCount || 0})
                    </button>
                    {isAuthor && (
                        <button onClick={handleDeleteInternal} className="action-button danger" style={{backgroundColor: '#dc3545', color: 'white'}}>
                            Delete Recipe
                        </button>
                    )}
                </div>
            )}

            <h2>Comments ({(recipe.comments && recipe.comments.length) || 0})</h2>
            {/* ... (comment mapping - ensure comment.timestamp?.toDate().toLocaleString() is used) ... */}
            {recipe.comments && recipe.comments.length > 0 ? recipe.comments.map(comment => (
                <div key={comment.commentId || comment.userId + comment.timestamp?.seconds} className="comment">
                    <p><strong><Link to={`/profile/${comment.userId}`}>{comment.username}</Link>:</strong> {comment.text}</p>
                    <small>{comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString() : 'Recently'}</small>
                </div>
            )) : <p>No comments yet. Be the first to comment!</p>}


            {currentUser && (
                <form onSubmit={handleCommentSubmitInternal} style={{marginTop: "20px"}}>
                    <h3>Add a Comment</h3>
                    <div>
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write your comment..."
                            rows="3"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">Post Comment</button>
                </form>
            )}
        </div>
    );
};
export default RecipeDetailPage;