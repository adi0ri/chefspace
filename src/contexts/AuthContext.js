// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    // ... (Firebase Auth imports remain the same)
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile as updateFirebaseAuthProfile, // Renamed for clarity
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { createUserProfileDocument, getUserProfile, updateUserFirestoreProfile as updateUserServiceProfile } from '../services/userService'; // Import user service

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null); // Firebase Auth user object
    const [currentUserProfile, setCurrentUserProfile] = useState(null); // Firestore user profile
    const [loading, setLoading] = useState(true);

    const signup = async (email, password, username) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update Firebase Auth profile
        await updateFirebaseAuthProfile(userCredential.user, { displayName: username });
        // Create user document in Firestore
        await createUserProfileDocument(userCredential.user, { username }); // Pass username to ensure it's set
        // onAuthStateChanged will fetch the full profile
        return userCredential.user;
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        setCurrentUserProfile(null); // Clear Firestore profile on logout
        return signOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    // Updates Firebase Auth profile (displayName, photoURL)
    const updateUserFirebaseProfile = async (profileUpdates) => {
        if (auth.currentUser) {
            await updateFirebaseAuthProfile(auth.currentUser, profileUpdates);
            // Optionally, trigger a refetch of the currentUser from onAuthStateChanged or manually update
            setCurrentUser({ ...auth.currentUser }); // Quick update for UI
        } else {
            throw new Error("No user logged in to update Firebase profile.");
        }
    };

    // Updates Firestore user profile (dietary, cuisines, etc.)
    const updateUserCustomProfile = async (profileData) => {
        if (currentUser && currentUser.uid) {
            await updateUserServiceProfile(currentUser.uid, profileData);
            // Fetch updated profile to reflect changes
            const updatedProfile = await getUserProfile(currentUser.uid);
            setCurrentUserProfile(updatedProfile);
        } else {
            throw new Error("No user logged in to update custom profile.");
        }
    };


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                setCurrentUser(userAuth); // Set Firebase Auth user
                // Attempt to create user doc if it's a new signup and doc doesn't exist
                // The signup function now handles creating the initial doc.
                // Here, we just fetch it.
                const userProfileData = await getUserProfile(userAuth.uid);
                if (userProfileData) {
                    setCurrentUserProfile(userProfileData);
                } else {
                    // This case might happen if Firestore creation failed during signup
                    // or if it's an existing auth user without a Firestore doc.
                    // You might want to try creating it here as a fallback.
                    console.warn("User profile not found in Firestore for UID:", userAuth.uid);
                    // Attempt to create one if signup didn't or if it's an old user
                    try {
                        await createUserProfileDocument(userAuth, { username: userAuth.displayName });
                        const freshProfile = await getUserProfile(userAuth.uid);
                        setCurrentUserProfile(freshProfile);
                    } catch (error) {
                         console.error("Failed to create fallback user profile:", error);
                    }
                }
            } else {
                setCurrentUser(null);
                setCurrentUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser, // Firebase Auth user
        currentUserProfile, // Firestore user profile
        loading,
        signup,
        login,
        logout,
        resetPassword,
        updateUserFirebaseProfile, // For Auth profile (name, photo)
        updateUserCustomProfile    // For Firestore profile (dietary, etc.)
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};