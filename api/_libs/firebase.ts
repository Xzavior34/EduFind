// api/_libs/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAAS80A2t4wixW68WVyN5wqd7TSp-vPPIQ",
  authDomain: "courseai-b7b37.firebaseapp.com",
  projectId: "courseai-b7b37",
  storageBucket: "courseai-b7b37.firebasestorage.app",
  messagingSenderId: "132177544783",
  appId: "1:132177544783:web:5c3f87eff0191bf0934c3a"
};

// Prevent Next.js from initializing Firebase multiple times
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
