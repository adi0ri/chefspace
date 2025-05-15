// src/services/userService.js
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';

// Create or update user profile in Firestore
export const createUserProfileDocument = async (userAuth, additionalData = {}) => {
    if (!userAuth) return;

    const userRef = doc(db, 'users', userAuth.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        const { email, displayName, photoURL } = userAuth;
        const createdAt = new Date();
        try {
            await setDoc(userRef, {
                uid: userAuth.uid,
                email,
                username: displayName || additionalData.username || email.split('@')[0],
                profilePictureURL: photoURL || additionalData.profilePictureURL || '',
                createdAt,
                dietaryRestrictions: [],
                favoriteCuisines: [],
                savedRecipeIds: [],
                ...additionalData, // Allow overriding username, etc. during signup
            });
        } catch (error) {
            console.error('Error creating user profile in Firestore:', error);
            throw error;
        }
    }
    return userRef;
};

// Get user profile from Firestore
export const getUserProfile = async (uid) => {
    if (!uid) return null;
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        console.log('No such user profile!');
        return null;
    }
};

// Update user profile in Firestore
export const updateUserFirestoreProfile = async (uid, dataToUpdate) => {
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, dataToUpdate);
    } catch (error) {
        console.error('Error updating user profile in Firestore:', error);
        throw error;
    }
};

// Save a recipe ID to user's saved list
export const saveRecipeForUser = async (userId, recipeId) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        savedRecipeIds: arrayUnion(recipeId)
    });
};

// Unsave a recipe ID from user's saved list
export const unsaveRecipeForUser = async (userId, recipeId) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        savedRecipeIds: arrayRemove(recipeId)
    });
};

// Fetch recipes created by a specific user
export const getRecipesByAuthor = async (authorId) => {
    const recipesRef = collection(db, "recipes");
    const q = query(recipesRef, where("authorId", "==", authorId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};