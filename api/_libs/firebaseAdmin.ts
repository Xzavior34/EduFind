// Centralized Firebase Admin initialization for Vercel serverless functions.
// Expects FIREBASE_ADMIN_KEY environment variable to contain the JSON string for the service account.

import admin from "firebase-admin";

if (!global.__fbAdminInitialized) {
  if (process.env.FIREBASE_ADMIN_KEY) {
    try {
      const svc = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(svc),
      });
      // firestore will be available via admin.firestore()
      // auth via admin.auth()
      // Note: on Vercel serverless, admin initialization must be guarded
      // to avoid "already exists" errors when lambdas are reused.
    } catch (err) {
      // Invalid JSON in env var
      console.error("FIREBASE_ADMIN_KEY parse error", err);
    }
  } else {
    // Do not throw here — allow mock-mode if admin key is not present
    console.warn("FIREBASE_ADMIN_KEY not set — running in mock-only mode for courses.");
  }
  // mark initialized
  // @ts-ignore
  global.__fbAdminInitialized = true;
}

export const firebaseAdmin = admin;
export const getFirestore = () => admin.firestore();
export const getAuth = () => admin.auth();
