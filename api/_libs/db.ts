// Lightweight DB abstraction for Vercel deployment with live course fetch fallback.

import fs from "fs";
import path from "path";
import { getFirestore } from "./firebaseAdmin";

// External fetchers
import { fetchEdxCourses, fetchFreeCodeCampCourses } from "./externalCourses";

const USE_FIRESTORE = process.env.USE_FIRESTORE === "true";

/**
 * Get all courses (read-only). Prefer Firestore if USE_FIRESTORE and collection exists.
 * If no courses, fallback to mock JSON, then external platforms.
 */
export async function getCourses({ q, category, level, price, sort, page = 1, per_page = 24 }: any) {
  let courses: any[] = [];

  // 1️⃣ Fetch from Firestore if enabled
  if (USE_FIRESTORE) {
    const db = getFirestore();
    const snap = await db.collection("courses").get();
    courses = snap.docs.map(d => d.data());
  }

  // 2️⃣ Fallback to mock JSON if Firestore empty
  if (courses.length === 0) {
    const file = path.join(process.cwd(), "mock", "courses.seed.json");
    const raw = fs.readFileSync(file, "utf-8");
    courses = JSON.parse(raw);
  }

  // 3️⃣ Fetch external courses if query exists or still empty
  if (!courses.length || q) {
    const externalCourses = [
      ...(await fetchEdxCourses()),
      ...(await fetchFreeCodeCampCourses())
    ];
    courses = [...courses, ...externalCourses];
  }

  // 4️⃣ Apply simple search filtering
  if (q) {
    const query = String(q).toLowerCase();
    courses = courses.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.short_description.toLowerCase().includes(query) ||
      (c.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    );
  }

  // 5️⃣ Pagination
  const start = (page - 1) * per_page;
  return { results: courses.slice(start, start + per_page), total: courses.length, page, per_page };
}

/**
 * Get single course by slug (from Firestore -> mock -> external)
 */
export async function getCourseBySlug(slug: string) {
  // Check Firestore
  if (USE_FIRESTORE) {
    const db = getFirestore();
    const snap = await db.collection("courses").where("slug", "==", slug).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  }

  // Check mock
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  const raw = fs.readFileSync(file, "utf-8");
  const arr = JSON.parse(raw);
  let found = arr.find((c: any) => c.slug === slug || c.id === slug);
  if (found) return found;

  // Check external
  const externalCourses = [
    ...(await fetchEdxCourses()),
    ...(await fetchFreeCodeCampCourses())
  ];
  found = externalCourses.find((c: any) => c.slug === slug || c.id === slug);
  return found || null;
}

/**
 * Create user profile — writes to Firestore 'users' collection if enabled.
 */
export async function createUserProfile({ uid, email }: { uid: string; email: string }) {
  if (!USE_FIRESTORE) return;
  const db = getFirestore();
  const ref = db.collection("users").doc(uid);
  await ref.set({ uid, email, created_at: new Date().toISOString() }, { merge: true });
}

/**
 * Enroll user in a course.
 */
export async function enrollUserInCourse(uid: string, course_id: string) {
  if (!USE_FIRESTORE) {
    return {
      courseTitle: "Sample Course (mock)",
      courseSlug: course_id,
      enrollments: [{ course_id, course_title: "Sample Course (mock)", enrolled_at: new Date().toISOString() }],
    };
  }
  const db = getFirestore();
  const enrollRef = db.collection("enrollments").doc();
  const enrollDoc = { uid, course_id, enrolled_at: new Date().toISOString() };
  await enrollRef.set(enrollDoc);
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
