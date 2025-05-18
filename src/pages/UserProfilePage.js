// src/pages/UserProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getUserProfile, getRecipesByAuthor } from '../services/userService';
import { getRecipeByIdFromFirestore } from '../services/recipeService'; // To fetch saved recipes
import RecipeCard from '../components/RecipeCard';
import { useAuth } from '../contexts/AuthContext'; // To check if it's the current user's profile

const UserProfilePage = () => {
    const { userId } = useParams();
    const { currentUser } = useAuth(); // The logged-in user from Firebase Auth
    const [profileData, setProfileData] = useState(null);
    const [createdRecipes, setCreatedRecipes] = useState([]);
    const [savedRecipesData, setSavedRecipesData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProfileAndRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const userProf = await getUserProfile(userId);
            setProfileData(userProf);

            if (userProf) {
                const authored = await getRecipesByAuthor(userId);
                setCreatedRecipes(authored);

                if (userProf.savedRecipeIds && userProf.savedRecipeIds.length > 0) {
                    const savedFetches = userProf.savedRecipeIds.map(id => getRecipeByIdFromFirestore(id));
                    const fetchedSavedRecipes = (await Promise.all(savedFetches)).filter(Boolean); // Filter out nulls if a recipe was deleted
                    setSavedRecipesData(fetchedSavedRecipes);
                } else {
                    setSavedRecipesData([]);
                }
            }
        } catch (error) {
            console.error("Error fetching user profile data:", error);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchProfileAndRecipes();
    }, [fetchProfileAndRecipes]);


    if (loading) return <div className="container"><p>Loading profile...</p></div>;
    if (!profileData) return <div className="container"><p>User profile not found.</p></div>;

    

    return (
        <div className="container">
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '30px'}}>
                <img 
                    src={profileData.profilePictureURL || currentUser?.photoURL || 'https://via.placeholder.com/100'} 
                    alt={profileData.username} 
                    style={{width: '100px', height: '100px', borderRadius: '50%', marginRight: '20px', objectFit: 'cover'}}
                />
                <div>
                    <h1>{profileData.username}</h1>
                    <p>{profileData.email}</p>
                    {profileData.dietaryRestrictions && profileData.dietaryRestrictions.length > 0 &&
                        <p>Dietary: {profileData.dietaryRestrictions.join(', ')}</p>}
                    {profileData.favoriteCuisines && profileData.favoriteCuisines.length > 0 &&
                        <p>Favorite Cuisines: {profileData.favoriteCuisines.join(', ')}</p>}
                </div>
            </div>

            <h2>Recipes Created ({createdRecipes.length})</h2>
            {createdRecipes.length > 0 ? (
                <div className="recipe-grid">
                    {createdRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
                </div>
            ) : <p>No recipes created yet.</p>}
            
            <h2 style={{marginTop: "30px"}}>Saved Recipes ({savedRecipesData.length})</h2>
             {savedRecipesData.length > 0 ? (
                <div className="recipe-grid">
                    {savedRecipesData.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
                </div>
            ) : <p>No recipes saved yet.</p>}
        </div>
    );
};
export default UserProfilePage;