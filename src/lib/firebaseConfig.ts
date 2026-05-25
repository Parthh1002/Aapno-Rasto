import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

// Only initialize Firebase if all required config values are present
export const firebaseConfigured: boolean =
  Boolean(apiKey) && Boolean(authDomain) && Boolean(projectId) && Boolean(appId);

let _firebaseApp: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

if (firebaseConfigured) {
  try {
    _firebaseApp = initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });
    _auth = getAuth(_firebaseApp);
    _db = getFirestore(_firebaseApp);
    _storage = getStorage(_firebaseApp);
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (e) {
    console.warn("[Firebase] Initialization failed:", e);
  }
}

export const firebaseApp = _firebaseApp;
export const auth = _auth;
export const db = _db;
export const storage = _storage;
export const googleProvider = _googleProvider;
