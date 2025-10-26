// Token verification helper for protected API routes.
// Verifies ID tokens with Firebase Admin SDK.

import { getAuth } from "./firebaseAdmin";

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken) {
    throw { code: 401, message: "Missing Firebase ID token" };
  }
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    throw { code: 401, message: "Invalid or expired Firebase ID token" };
  }
}
