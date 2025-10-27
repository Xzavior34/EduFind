
# EduFind (Vercel-ready)

This branch is configured to run on Vercel, using local mock course data and optional Firebase Firestore persistence.

Quick summary of what changed from the original Lovable Cloud scaffold:
- All serverless endpoints are Next.js API routes (Vercel serverless functions).
- Course data is read from `mock/courses.seed.json` by default (no external search service required).
- Search is powered by Fuse.js with the platform scoring formula applied server-side.
- User profiles & enrollments can be persisted to Firebase Firestore if you enable `USE_FIRESTORE=true` and set `FIREBASE_ADMIN_KEY` (service account JSON) in Vercel environment variables.
- A `scripts/seedCourses.js` script uploads the mock courses to Firestore when enabled.

Environment variables (set these in Vercel project settings):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- FIREBASE_ADMIN_KEY (JSON string for service account) — required only if you want Firestore writes
- USE_FIRESTORE=true (optional, set to enable Firestore writes)
- EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_WELCOME, EMAILJS_TEMPLATE_ENROLL
- FREE_BOOST (optional, default 1.25)

Local dev:
1. Install deps:
   npm install
2. Dev:
   npm run dev
3. Search: the SearchBar calls `/api/courses?q=...` which triggers server-side Fuse search.
4. Seed Firestore (optional):
   - Set env vars locally: FIREBASE_ADMIN_KEY and USE_FIRESTORE=true
   - Run: npm run seed:courses

Deploy to Vercel:
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard (FIREBASE_ADMIN_KEY as raw JSON string)
4. Deploy — Vercel will run Next.js and serverless APIs

Notes:
- If FIREBASE_ADMIN_KEY is not provided, the app runs using local mock data only (read-only). Enrollments are mocked client-side in that mode.
- For production persistence, enable Firestore (USE_FIRESTORE=true) and seed the courses into Firestore with `npm run seed:courses`.
```
