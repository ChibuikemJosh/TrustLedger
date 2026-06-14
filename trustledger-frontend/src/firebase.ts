import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Production credentials for the TrustLedger live client instance
const firebaseConfig = {
  apiKey: "AIzaSyCNzrmiUTUEJE9QpuIbfwK3pDukSRBlI5Y",
  authDomain: "trust-ledger-55fe8.firebaseapp.com",
  projectId: "trust-ledger-55fe8",
  storageBucket: "trust-ledger-55fe8.firebasestorage.app",
  messagingSenderId: "669769330334",
  appId: "1:669769330334:web:adb77f6b4b774df9e1958f",
  measurementId: "G-FZVJ61NL65"
};

// Prevent duplicate initializations during React/Next.js hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core production exports linked directly to your live platform gateway
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
