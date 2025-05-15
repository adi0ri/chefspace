// src/pages/RecipeDetailPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipes } from '../contexts/RecipeContext';
import { useAuth } from '../contexts/AuthContext';
import { toggleRecipeSave } from '../services/recipeService'; // Direct service call
import { getUserProfile, updateUserFirestoreProfile } from '../services/userService'; // For saved recipes

const RecipeDetailPage = () => {
    const { id } = useParams();
    const { getRecipeById, handleToggleLike, addComment, deleteRecipe: deleteRecipeFromContext } = useRecipes(); // getRecipeById is now async
    const { currentUser, currentUserProfile, updateUserCustomProfile: refreshUserProfileContext } = useAuth();
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSaved, setIsSaved] = useState(false); // Local state for saved status

    const fetchRecipeDetails = useCallback(async () => {
        setLoading(true);
        const fetchedRecipe = await getRecipeById(id); // This will fetch from Firestore if not cached
        setRecipe(fetchedRecipe);
        setLoading(false);
    }, [id, getRecipeById]);

    useEffect(() => {
        fetchRecipeDetails();
    }, [fetchRecipeDetails]);

    useEffect(() => {
        if (currentUserProfile && recipe) {
            setIsSaved(currentUserProfile.savedRecipeIds?.includes(recipe.id) || false);
        }
    }, [currentUserProfile, recipe]);


    if (loading) return <div className="container"><p>Loading recipe...</p></div>;
    if (!recipe) return <div className="container"><p>Recipe not found!</p></div>;

    const isAuthor = currentUser && recipe.authorId === currentUser.uid;
    const isLikedByCurrentUser = currentUser && recipe.likedBy?.includes(currentUser.uid);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        try {
            await addComment(recipe.id, commentText);
            setCommentText('');
            fetchRecipeDetails(); // Re-fetch to show new comment
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this recipe?")) {
            try {
                await deleteRecipeFromContext(recipe.id);
                navigate('/');
            } catch (error) {
                console.error("Error deleting recipe:", error);
            }
        }
    };

    const onToggleLike = async () => {
        try {
            await handleToggleLike(recipe.id, recipe.likedBy);
            fetchRecipeDetails(); // Re-fetch to update like count and likedBy array
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    const handleToggleSave = async () => {
        if (!currentUser) return alert("Please log in to save recipes.");
        try {
            await toggleRecipeSave(recipe.id, currentUser.uid, isSaved);
            // Optimistically update UI, then refresh user profile from context
            setIsSaved(!isSaved);
            // To update the currentUserProfile in AuthContext with new savedRecipeIds:
            const latestUserProfile = await getUserProfile(currentUser.uid); // Fetch fresh user profile
            if (latestUserProfile) {
                 // This is a bit of a hack as AuthContext doesn't have a direct setter for profile.
                 // A better way would be for AuthContext to expose a refreshUserProfile function.
                 // For now, this is a conceptual update:
                 if (typeof refreshUserProfileContext === 'function') { // Assuming we add a refresh function
                    await refreshUserProfileContext(); // This would call getUserProfile(currentUser.uid) inside AuthContext
                 } else {
                    // Manually trigger an update if refreshUserProfileContext is not available
                    // This might involve a more direct update to the currentUserProfile state in AuthContext
                    // For example, if AuthContext directly managed fetching its own profile.
                    // Or we update a local copy and rely on next full profile load.
                    // As a simpler immediate fix, SettingsPage also fetches user profile.
                    const updatedProfile = await getUserProfile(currentUser.uid);
                    // Need a way to update AuthContext's currentUserProfile
                    // This is a limitation of the current AuthContext structure for this specific action.
                    // Let's assume for now the save count on recipe updates, and user's list on next profile load.
                 }
            }
            fetchRecipeDetails(); // Re-fetch recipe to update savesCount
        } catch (error) {
            console.error("Error toggling save:", error);
            alert("Failed to update save status.");
        }
    };

    return (
        <div className="container recipe-detail">
            <h1>{recipe.title}</h1>
            <p>By: <Link to={`/profile/${recipe.authorId}`}>{recipe.authorUsername}</Link></p>
            {/* ... (display cuisine, difficulty, photos, ingredients, instructions - same as before) ... */}
            {recipe.photoURLs && recipe.photoURLs.length > 0 && (
                <img src={recipe.photoURLs[0]} alt={recipe.title} />
            )}
            <h2>Ingredients</h2>
            <ul>{recipe.ingredients.map((ing, index) => (<li key={index}>{ing.quantity} {ing.name}</li>))}</ul>
            <h2>Instructions</h2>
            <p style={{whiteSpace: 'pre-wrap'}}>{recipe.instructions}</p>


            {currentUser && (
                <div style={{ margin: "20px 0" }}>
                    <button onClick={onToggleLike} className={`action-button ${isLikedByCurrentUser ? 'active' : ''}`}>
                        {isLikedByCurrentUser ? 'Unlike' : 'Like'} ({recipe.likesCount || 0})
                    </button>
                    <button onClick={handleToggleSave} className={`action-button ${isSaved ? 'active' : ''}`}>
                        {isSaved ? 'Unsave' : 'Save'} ({recipe.savesCount || 0})
                    </button>
                    {isAuthor && <button onClick={handleDelete} className="action-button" style={{backgroundColor: 'red', color: 'white', borderColor: 'red'}}>Delete Recipe</button>}
                </div>
            )}

            <h2>Comments ({(recipe.comments && recipe.comments.length) || 0})</h2>
            {recipe.comments && recipe.comments.map(comment => (
                <div key={comment.commentId || comment.text.slice(0,10)} className="comment"> {/* Use commentId if available */}
                    <p><strong><Link to={`/profile/${comment.userId}`}>{comment.username}</Link>:</strong> {comment.text}</p>
                    <small>{comment.timestamp?.toDate ? comment.timestamp.toDate().toLocaleString() : 'Just now'}</small>
                </div>
            ))}
            {currentUser && (
                <form onSubmit={handleCommentSubmit} style={{marginTop: "20px"}}>
                    {/* ... (comment form - same as before) ... */}
                    <h3>Add a Comment</h3>
                    <div><textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write your comment..." rows="3" required/></div>
                    <button type="submit">Post Comment</button>
                </form>
            )}
        </div>
    );
};
export default RecipeDetailPage;