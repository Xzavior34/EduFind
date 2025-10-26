// Lightweight DB abstraction for Vercel deployment.
// - Courses: read from mock/courses.seed.json by default (read-only).
// - Optionally you can set USE_FIRESTORE=true and provide FIREBASE_ADMIN_KEY to persist enrollments and profiles in Firestore.

import fs from "fs";
import path from "path";
import { getFirestore } from "./firebaseAdmin";

const USE_FIRESTORE = process.env.USE_FIRESTORE === "true";

/**
 * Get all courses (read-only). Prefer Firestore if USE_FIRESTORE and collection exists.
 */
export async function getCourses({ q, category, level, price, sort, page = 1, per_page = 24 }: any) {
  // For simplicity, we use search layer for searching; here we just return the first page of everything.
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  const raw = fs.readFileSync(file, "utf-8");
  const arr = JSON.parse(raw);
  const start = (page - 1) * per_page;
  return { results: arr.slice(start, start + per_page), total: arr.length, page, per_page };
}

/**
 * Get single course by slug (from mock)
 */
export async function getCourseBySlug(slug: string) {
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  const raw = fs.readFileSync(file, "utf-8");
  const arr = JSON.parse(raw);
  const found = arr.find((c: any) => c.slug === slug || c.id === slug);
  return found || null;
}

/**
 * Create user profile — writes to Firestore 'users' collection if enabled,
 * otherwise does nothing (mock-only).
 */
export async function createUserProfile({ uid, email }: { uid: string; email: string }) {
  if (!USE_FIRESTORE) return;
  const db = getFirestore();
  const ref = db.collection("users").doc(uid);
  await ref.set({ uid, email, created_at: new Date().toISOString() }, { merge: true });
}

/**
 * Enroll user in a course. If USE_FIRESTORE, writes to collection 'enrollments'.
 * Returns an object with basic enrollment info.
 */
export async function enrollUserInCourse(uid: string, course_id: string) {
  if (!USE_FIRESTORE) {
    // Mock response — do not persist. This keeps enroll working for free courses in stateless mode.
    // Return a shaped response expected by frontend.
    return {
      courseTitle: "Sample Course (mock)",
      courseSlug: course_id,
      enrollments: [{ course_id, course_title: "Sample Course (mock)", enrolled_at: new Date().toISOString() }],
    };
  }
  const db = getFirestore();
  const enrollRef = db.collection("enrollments").doc();
  const courseRef = db.collection("courses").doc(course_id);
  // If course docs exist in Firestore you might want to fetch title; for now we set minimal info.
  const enrollDoc = {
    uid,
    course_id,
    enrolled_at: new Date().toISOString(),
  };
  await enrollRef.set(enrollDoc);
  // return updated enrollments
  const enrollmentsSnap = await db.collection("enrollments").where("uid", "==", uid).get();
  const enrollments = enrollmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { courseTitle: `Course ${course_id}`, courseSlug: course_id, enrollments };
}

/**
 * Get user enrollments (from Firestore if enabled)
 */
export async function getUserEnrollments(uid: string) {
  if (!USE_FIRESTORE) return [];
  const db = getFirestore();
  const snap = await db.collection("enrollments").where("uid", "==", uid).orderBy("enrolled_at", "desc").get();
  return snap.docs.map((d) => d.data());
}
