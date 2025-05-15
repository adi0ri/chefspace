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

export const createRecipeInFirestore = async (recipeData) => {
    // recipeData should include authorId, authorUsername from currentUser
    try {
        const docRef = await addDoc(recipesCollectionRef, {
            ...recipeData,
            timestamp: serverTimestamp(), // Use server timestamp
            likesCount: 0, // Initialize counts
            savesCount: 0,
            // comments will be a subcollection or an array
        });
        return { id: docRef.id, ...recipeData, timestamp: new Date() }; // Return with ID
    } catch (error) {
        console.error("Error adding recipe to Firestore: ", error);
        throw error;
    }
};

export const getRecipesFromFirestore = async (lastFetchedRecipe = null, queryLimit = 9) => {
    let q;
    if (lastFetchedRecipe) {
        q = query(recipesCollectionRef, orderBy('timestamp', 'desc'), startAfter(lastFetchedRecipe), limit(queryLimit));
    } else {
        q = query(recipesCollectionRef, orderBy('timestamp', 'desc'), limit(queryLimit));
    }
    const querySnapshot = await getDocs(q);
    const recipes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    return { recipes, lastVisible };
};

export const getRecipeByIdFromFirestore = async (recipeId) => {
    const recipeDocRef = doc(db, 'recipes', recipeId);
    const docSnap = await getDoc(recipeDocRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        console.log("No such recipe!");
        return null;
    }
};

export const updateRecipeInFirestore = async (recipeId, dataToUpdate) => {
    const recipeDocRef = doc(db, 'recipes', recipeId);
    await updateDoc(recipeDocRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp() // Optionally add an updatedAt field
    });
};

export const deleteRecipeFromFirestore = async (recipeId) => {
    const recipeDocRef = doc(db, 'recipes', recipeId);
    await deleteDoc(recipeDocRef);
    // TODO: Also delete from users' savedRecipeIds (can be complex, consider Cloud Functions)
    // TODO: Delete associated comments and likes if they are in subcollections
};

// --- Interactions ---

// Like/Unlike a recipe (using an array of UIDs on the recipe doc for simplicity here)
export const toggleRecipeLike = async (recipeId, userId, isCurrentlyLiked) => {
    const recipeRef = doc(db, "recipes", recipeId);
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
};

// Add a comment to a recipe (as an array field for simplicity)
// For larger apps, a subcollection 'comments' under each recipe is better.
export const addCommentToFirestoreRecipe = async (recipeId, commentData) => {
    // commentData: { userId, username, text }
    const recipeRef = doc(db, "recipes", recipeId);
    await updateDoc(recipeRef, {
        comments: arrayUnion({
            ...commentData,
            commentId: doc(collection(db, 'dummy')).id, // Generate a unique ID for the comment
            timestamp: serverTimestamp()
        })
    });
};

// Save/Unsave a recipe (updates user's list and recipe's save count)
export const toggleRecipeSave = async (recipeId, userId, isCurrentlySaved) => {
    const recipeRef = doc(db, "recipes", recipeId);
    const userRef = doc(db, "users", userId);
    const batch = writeBatch(db);

    if (isCurrentlySaved) {
        batch.update(userRef, { savedRecipeIds: arrayRemove(recipeId) });
        batch.update(recipeRef, { savesCount: increment(-1) });
    } else {
        batch.update(userRef, { savedRecipeIds: arrayUnion(recipeId) });
        batch.update(recipeRef, { savesCount: increment(1) });
    }
    await batch.commit();
};


export const searchRecipesInFirestore = async ({ searchTerm, cuisineFilter, difficultyFilter }) => {
    let q = collection(recipesCollectionRef); // Start with the base collection
    let conditions = [];

    // Firestore requires the first orderBy field to be the same as an inequality field if used.
    // Simple title search (case-sensitive prefix match)
    if (searchTerm) {
        // For true full-text search, use Algolia or similar.
        // This is a basic prefix search.
        conditions.push(where("title", ">=", searchTerm));
        conditions.push(where("title", "<=", searchTerm + '\uf8ff'));
    }

    if (cuisineFilter) {
        conditions.push(where("cuisineType", "==", cuisineFilter));
    }

    if (difficultyFilter) {
        conditions.push(where("difficultyLevel", "==", difficultyFilter));
    }

    if (conditions.length > 0) {
        q = query(recipesCollectionRef, ...conditions, orderBy("title"), orderBy("timestamp", "desc"), limit(20));
    } else {
        // If no filters, just get recent recipes
        q = query(recipesCollectionRef, orderBy("timestamp", "desc"), limit(20));
    }
    
    // IMPORTANT: You will likely need to create composite indexes in Firestore
    // for these queries to work. Firestore will give you an error message with a link
    // to create the required index if it's missing.

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error searching recipes, you might need to create Firestore indexes:", error);
        throw error; // Re-throw to be caught by the UI
    }
};