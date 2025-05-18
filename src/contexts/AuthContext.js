// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile as updateFirebaseAuthProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider, 
    signInWithPopup,    
    linkWithPopup,      
    OAuthProvider      
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { createUserProfileDocument, getUserProfile, updateUserFirestoreProfile as updateUserServiceProfile } from '../services/userService';

const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider(); 

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const signup = async (email, password, username) => {
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateFirebaseAuthProfile(userCredential.user, { displayName: username });
        await createUserProfileDocument(userCredential.user, { username });
        return userCredential.user;
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            await createUserProfileDocument(user, {
                username: user.displayName,
                profilePictureURL: user.photoURL
            });
            return user;
        } catch (error) {
            
            if (error.code === 'auth/account-exists-with-different-credential') {
                
                console.error("Account exists with different credential:", error);
                alert("An account already exists with this email address using a different sign-in method. Try logging in with that method or link your accounts (linking not yet implemented in UI).");
            } else {
                console.error("Google Sign-In Error:", error);
            }
            throw error;
        }
    };

    
    const linkGoogleAccount = async () => {
        if (!auth.currentUser) throw new Error("No user signed in to link account.");
        try {
            await linkWithPopup(auth.currentUser, googleProvider);
            // Refresh user data to get updated providerData
            setCurrentUser({ ...auth.currentUser });
            alert("Google account linked successfully!");
        } catch (error) {
            console.error("Error linking Google account:", error);
            alert(`Failed to link Google account: ${error.message}`);
            throw error;
        }
    };


    const logout = () => {
        // ... (same as before)
        setCurrentUserProfile(null);
        return signOut(auth);
    };

    const resetPassword = (email) => {
        // ... (same as before)
        return sendPasswordResetEmail(auth, email);
    };

    const updateUserFirebaseProfile = async (profileUpdates) => {
        // ... (same as before)
        if (auth.currentUser) {
            await updateFirebaseAuthProfile(auth.currentUser, profileUpdates);
            setCurrentUser({ ...auth.currentUser });
        } else {
            throw new Error("No user logged in to update Firebase profile.");
        }
    };

    const updateUserCustomProfile = async (profileData) => {
        // ... (same as before)
        if (currentUser && currentUser.uid) {
            await updateUserServiceProfile(currentUser.uid, profileData);
            const updatedProfile = await getUserProfile(currentUser.uid);
            setCurrentUserProfile(updatedProfile);
        } else {
            throw new Error("No user logged in to update custom profile.");
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                setCurrentUser(userAuth);
                
                let userProfileData = await getUserProfile(userAuth.uid);
                if (!userProfileData) {
                    console.warn("User profile not found in Firestore for UID, attempting to create:", userAuth.uid);
                    try {
                        
                        await createUserProfileDocument(userAuth, {
                            username: userAuth.displayName,
                            profilePictureURL: userAuth.photoURL
                        });
                        userProfileData = await getUserProfile(userAuth.uid);
                    } catch (error) {
                        console.error("Failed to create fallback user profile after Google sign-in:", error);
                    }
                }
                setCurrentUserProfile(userProfileData);
            } else {
                setCurrentUser(null);
                setCurrentUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        currentUserProfile,
        loading,
        signup,
        login,
        loginWithGoogle, 
        linkGoogleAccount, 
        logout,
        resetPassword,
        updateUserFirebaseProfile,
        updateUserCustomProfile
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};