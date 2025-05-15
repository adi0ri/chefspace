// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyALxRfZqcrZJnb_CVPj1i6tc7ZvGrDTYNw",
  authDomain: "chefspace-d4c66.firebaseapp.com",
  projectId: "chefspace-d4c66",
  storageBucket: "chefspace-d4c66.firebasestorage.app",
  messagingSenderId: "446970770307",
  appId: "1:446970770307:web:3ae24f59b6f59902bcbcb6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage }; 