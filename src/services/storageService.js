// src/services/storageService.js
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // For unique file names

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param {File} file The file to upload.
 * @param {string} path The path in Firebase Storage (e.g., 'profilePictures/userId').
 * @returns {Promise<string>} The download URL of the uploaded file.
 */
export const uploadFile = async (file, path) => {
    if (!file) throw new Error("No file provided for upload.");

    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `${path}/${fileName}`);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
};

/**
 * Deletes a file from Firebase Storage.
 * @param {string} fileURL The full HTTPS download URL of the file to delete.
 * @returns {Promise<void>}
 */
export const deleteFileByUrl = async (fileURL) => {
    if (!fileURL) return;
    try {
        const storageRef = ref(storage, fileURL); // This gets a reference from the HTTPS URL
        await deleteObject(storageRef);
        console.log("File deleted successfully from URL:", fileURL);
    } catch (error) {
        // Firebase throws an error if the file doesn't exist, which can be okay if we're just cleaning up.
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting file by URL:", error);
            throw error;
        } else {
            console.warn("Attempted to delete a file that was not found:", fileURL);
        }
    }
};