// Seed script to upload mock/courses.seed.json into Firestore (optional).
// Usage: FIREBASE_ADMIN_KEY='{"type":...}' USE_FIRESTORE=true node scripts/seedCourses.js
//
// On Vercel / CI: set FIREBASE_ADMIN_KEY in Environment Variables and run this script in CI or locally.

const fs = require("fs");
const path = require("path");

async function main() {
  const USE_FIRESTORE = process.env.USE_FIRESTORE === "true";
  if (!USE_FIRESTORE) {
    console.log("USE_FIRESTORE not enabled; skipping seed (local mock only). To seed Firestore set USE_FIRESTORE=true and provide FIREBASE_ADMIN_KEY env var.");
    return;
  }
  if (!process.env.FIREBASE_ADMIN_KEY) {
    console.error("FIREBASE_ADMIN_KEY is missing. Provide service account JSON string in env.");
    process.exit(1);
  }
  // initialize firebase admin
  const admin = require("firebase-admin");
  const svc = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  try {
    admin.initializeApp({
      credential: admin.credential.cert(svc),
    });
  } catch (e) {
    // ignore duplicate init in reused environments
  }
  const db = admin.firestore();

  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  const raw = fs.readFileSync(file, "utf-8");
  const courses = JSON.parse(raw);

  for (const c of courses) {
    const docId = c.id || c.slug;
    const ref = db.collection("courses").doc(String(docId));
    const payload = { ...c, updated_at: new Date().toISOString() };
    await ref.set(payload, { merge: true });
    console.log("Seeded course:", docId);
  }
  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
