// src/services/recipeService.js
import { db } from '../firebaseConfig';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    startAfter,
    where,
    arrayUnion,
    arrayRemove,
    increment,
    writeBatch 
} from 'firebase/firestore';

const recipesCollectionRef = collection(db, 'recipes');

/**
 * Creates a new recipe document in Firestore.
 * @param {object} recipeData - The recipe data (should include authorId, authorUsername).
 * @returns {Promise<object>} The created recipe object with its new Firestore ID.
 */
export const createRecipeInFirestore = async (recipeData) => {
    console.log("recipeService: Creating recipe with data:", recipeData);
    try {
        const docRef = await addDoc(recipesCollectionRef, {
            ...recipeData, // Includes title, ingredients, instructions, photoURLs, cuisineType, difficultyLevel, dietaryRestrictions, authorId, authorUsername
            timestamp: serverTimestamp(),
            createdAt: serverTimestamp(), // Explicit creation timestamp
            updatedAt: serverTimestamp(), // Initial updatedAt
            likesCount: 0,
            savesCount: 0,
            likedBy: [], // Array of user UIDs who liked this
            comments: [], // Array of comment objects { commentId, userId, username, text, timestamp }
        });
        console.log("recipeService: Recipe created with ID:", docRef.id);
        
        return { id: docRef.id, ...recipeData, timestamp: new Date(), createdAt: new Date(), updatedAt: new Date(), likesCount: 0, savesCount: 0, likedBy: [], comments: [] }; // Return with ID and optimistic timestamps
    } catch (error) {
        console.error("recipeService: Error adding recipe to Firestore: ", error);
        throw error;
    }
};

/**
 * Fetches a paginated list of recipes from Firestore, ordered by timestamp.
 * @param {DocumentSnapshot | null} lastFetchedRecipe - The last document snapshot from the previous fetch (for pagination).
 * @param {number} queryLimit - The number of recipes to fetch.
 * @returns {Promise<{recipes: Array<object>, lastVisible: DocumentSnapshot | null}>}
 */
export const getRecipesFromFirestore = async (lastFetchedRecipeDoc = null, queryLimit = 9) => {
    console.log("recipeService: Fetching recipes, lastFetchedRecipeDoc:", lastFetchedRecipeDoc);
    let q;
    if (lastFetchedRecipeDoc) {
        q = query(recipesCollectionRef, orderBy('timestamp', 'desc'), startAfter(lastFetchedRecipeDoc), limit(queryLimit));
    } else {
        q = query(recipesCollectionRef, orderBy('timestamp', 'desc'), limit(queryLimit));
    }
    try {
        const querySnapshot = await getDocs(q);
        const recipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
        console.log(`recipeService: Fetched ${recipes.length} recipes. Last visible provided: ${!!lastVisible}`);
        return { recipes, lastVisible };
    } catch (error) {
        console.error("recipeService: Error fetching recipes:", error);
        throw error;
    }
};

/**
 * Fetches a single recipe by its ID from Firestore.
 * @param {string} recipeId - The ID of the recipe to fetch.
 * @returns {Promise<object | null>} The recipe object or null if not found.
 */
export const getRecipeByIdFromFirestore = async (recipeId) => {
    console.log("recipeService: Fetching recipe by ID:", recipeId);
    if (!recipeId) {
        console.warn("recipeService: getRecipeByIdFromFirestore called with no recipeId");
        return null;
    }
    const recipeDocRef = doc(db, 'recipes', recipeId);
    try {
        const docSnap = await getDoc(recipeDocRef);
        if (docSnap.exists()) {
            console.log("recipeService: Recipe found:", docSnap.id);
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn("recipeService: No such recipe with ID:", recipeId);
            return null;
        }
    } catch (error) {
        console.error(`recipeService: Error fetching recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Updates an existing recipe document in Firestore.
 * @param {string} recipeId - The ID of the recipe to update.
 * @param {object} dataToUpdate - An object containing the fields to update.
 */
export const updateRecipeInFirestore = async (recipeId, dataToUpdate) => {
    console.log(`recipeService: Updating recipe ${recipeId} with data:`, dataToUpdate);
    const recipeDocRef = doc(db, 'recipes', recipeId);
    try {
        await updateDoc(recipeDocRef, {
            ...dataToUpdate,
            updatedAt: serverTimestamp()
        });
        console.log(`recipeService: Recipe ${recipeId} updated successfully.`);
    } catch (error) {
        console.error(`recipeService: Error updating recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Deletes a recipe document from Firestore.
 * @param {string} recipeId - The ID of the recipe to delete.
 */
export const deleteRecipeFromFirestore = async (recipeId) => {
    console.log(`recipeService: Deleting recipe ${recipeId}`);
    const recipeDocRef = doc(db, 'recipes', recipeId);
    try {
        await deleteDoc(recipeDocRef);
        console.log(`recipeService: Recipe ${recipeId} deleted successfully.`);
        // TODO: Implement deletion of associated images from Storage.
        // TODO: Implement removal of this recipeId from all users' savedRecipeIds (e.g., via a Cloud Function).
    } catch (error) {
        console.error(`recipeService: Error deleting recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Toggles a like on a recipe for a given user.
 * Updates the `likedBy` array and `likesCount` on the recipe document.
 * @param {string} recipeId - The ID of the recipe.
 * @param {string} userId - The ID of the user liking/unliking.
 * @param {boolean} isCurrentlyLiked - Whether the user currently likes the recipe.
 */
export const toggleRecipeLike = async (recipeId, userId, isCurrentlyLiked) => {
    console.log(`recipeService: Toggling like for recipe ${recipeId}, user ${userId}, currently liked: ${isCurrentlyLiked}`);
    const recipeRef = doc(db, "recipes", recipeId);
    try {
        if (isCurrentlyLiked) {
            await updateDoc(recipeRef, {
                likedBy: arrayRemove(userId),
                likesCount: increment(-1)
            });
        } else {
            await updateDoc(recipeRef, {
                likedBy: arrayUnion(userId),
                likesCount: increment(1)
            });
        }
        console.log(`recipeService: Like status updated for recipe ${recipeId}.`);
    } catch (error) {
        console.error(`recipeService: Error toggling like for recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Adds a comment to a recipe.
 * Stores comments as an array on the recipe document for simplicity.
 * @param {string} recipeId - The ID of the recipe.
 * @param {object} commentData - Object containing { userId, username, text }.
 * @returns {Promise<object>} The newly added comment object with generated ID and timestamp.
 */


export const addCommentToFirestoreRecipe = async (recipeId, commentData) => {
    console.log(`recipeService: Adding comment to recipe ${recipeId} with data:`, commentData);
    if (!recipeId || !commentData || !commentData.userId || !commentData.text) {
        console.error("recipeService: Invalid data for adding comment.", { recipeId, commentData });
        throw new Error("Invalid data for adding comment.");
    }

    const recipeRef = doc(db, "recipes", recipeId);
    const commentId = doc(collection(db, "recipes", recipeId, "_dummyPathForIdGen")).id; // Get a unique ID
    console.log("recipeService: Generated commentId:", commentId);

    const newComment = {
        userId: commentData.userId,
        username: commentData.username,
        text: commentData.text,
        commentId: commentId,
        timestamp: new Date() // <-- Use client-side JavaScript Date object
        
    };
    console.log("recipeService: newComment object to be added:", newComment);

    try {
        await updateDoc(recipeRef, {
            comments: arrayUnion(newComment)
        });
        console.log(`recipeService: Successfully called updateDoc with arrayUnion for recipe ${recipeId}.`);
        return newComment; // Return the comment with the client-side timestamp
    } catch (error) {
        console.error(`recipeService: Error calling updateDoc for comments on recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Toggles a save on a recipe for a user.
 * Updates the user's `savedRecipeIds` array and the recipe's `savesCount`.
 * @param {string} recipeId - The ID of the recipe.
 * @param {string} userId - The ID of the user.
 * @param {boolean} isCurrentlySaved - Whether the user currently has this recipe saved.
 */
export const toggleRecipeSave = async (recipeId, userId, isCurrentlySaved) => {
    console.log(`recipeService: Toggling save for recipe ${recipeId}, user ${userId}, currently saved: ${isCurrentlySaved}`);
    const recipeRef = doc(db, "recipes", recipeId);
    const userRef = doc(db, "users", userId);
    const batch = writeBatch(db);

    try {
        if (isCurrentlySaved) {
            batch.update(userRef, { savedRecipeIds: arrayRemove(recipeId) });
            batch.update(recipeRef, { savesCount: increment(-1) });
        } else {
            batch.update(userRef, { savedRecipeIds: arrayUnion(recipeId) });
            batch.update(recipeRef, { savesCount: increment(1) });
        }
        await batch.commit();
        console.log(`recipeService: Save status updated for recipe ${recipeId} and user ${userId}.`);
    } catch (error) {
        console.error(`recipeService: Error toggling save for recipe ${recipeId}:`, error);
        throw error;
    }
};

/**
 * Searches recipes in Firestore based on various criteria.
 * @param {object} params - Search parameters { searchTerm, cuisineFilter, difficultyFilter }.
 * @returns {Promise<Array<object>>} An array of matching recipe objects.
 */
export const searchRecipesInFirestore = async ({ searchTerm, cuisineFilter, difficultyFilter }) => {
    console.log("recipeService: Searching recipes with params:", { searchTerm, cuisineFilter, difficultyFilter });
    let conditions = [];
    let q = collection(db, "recipes"); // Base query



    if (cuisineFilter) {
        conditions.push(where("cuisineType", "==", cuisineFilter));
    }
    if (difficultyFilter) {
        conditions.push(where("difficultyLevel", "==", difficultyFilter));
    }

    
    if (searchTerm) {
        
        if (searchTerm.trim()) {
             q = query(q, where("title", ">=", searchTerm.trim()), where("title", "<=", searchTerm.trim() + '\uf8ff'), orderBy("title"));
        }
        
        if (conditions.length > 0) {
             q = query(q, ...conditions, orderBy("timestamp", "desc"), limit(20));
        } else if (!searchTerm.trim()){ // No searchTerm and no other filters
             q = query(q, orderBy("timestamp", "desc"), limit(20));
        } else { // Only searchTerm
             q = query(q, orderBy("timestamp", "desc"), limit(20)); // Apply default ordering if only title search
        }

    } else if (conditions.length > 0) {
        q = query(q, ...conditions, orderBy("timestamp", "desc"), limit(20));
    } else {
        
        q = query(q, orderBy("timestamp", "desc"), limit(20));
    }

    console.log("recipeService: Executing search query.");
    try {
        const querySnapshot = await getDocs(q);
        const recipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`recipeService: Search found ${recipes.length} recipes.`);
        return recipes;
    } catch (error) {
        console.error("recipeService: Error searching recipes. You may need to create Firestore indexes. Query details might be in the error.", error);
       
        alert("Search failed. The database might require a new index for this query. Check console for details.");
        throw error;
    }
};