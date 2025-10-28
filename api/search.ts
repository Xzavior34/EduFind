// /api/search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Fuse from "fuse.js";
import fs from "fs";
import path from "path";
import { getFirestore } from "./_libs/firebaseAdmin";

/**
 * Types (use your existing type shape)
 */
export interface Course {
  id: string;
  slug?: string;
  title: string;
  tags?: string[];
  short_description?: string;
  long_description?: string;
  category?: string;
  level?: string;
  avg_rating?: number;
  review_count?: number;
  is_free?: boolean;
  price?: number;
  published_at?: string;
  thumbnail_url?: string;
  instructor?: { id: string; name: string; bio?: string; avatar_url?: string };
}

export interface SearchFilters {
  category?: string;
  level?: string;
  is_free?: boolean | string;
}

export interface SearchResponse {
  total: number;
  page: number;
  per_page: number;
  results: Array<Course & { final_score: number; bm25_like_score?: number }>;
}

/**
 * Config
 */
const USE_FIRESTORE = process.env.USE_FIRESTORE === "true";
const FREE_BOOST = Number(process.env.FREE_BOOST || 1.25);
const EXTERNAL_CACHE_DOC_ID = "external_courses_cache_all";
const EXTERNAL_CACHE_TTL_HOURS = Number(process.env.EXTERNAL_CACHE_TTL_HOURS || 24);

/**
 * Utility helpers
 */
function daysSince(dateStr?: string) {
  if (!dateStr) return 3650;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function computeFinalScore(doc: Course, fuseScore: number, free_boost = FREE_BOOST) {
  const base = (1 - (fuseScore ?? 1)) * 3;
  const rating_adj = ((doc.avg_rating || 0) - 3) * 0.35;
  const rc_adj = Math.log(1 + (doc.review_count || 0)) * 0.04;
  const days = daysSince(doc.published_at);
  const recency_adj = Math.max(0, Math.min(1, (30 - days) / 30)) * 0.15;
  const free_multiplier = doc.is_free ? free_boost : 1.0;

  return (base + rating_adj + rc_adj + recency_adj) * free_multiplier;
}

function loadLocalCourses(): Course[] {
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Course[];
  } catch (err) {
    console.warn("Could not load mock courses:", err);
    return [];
  }
}

/**
 * External provider fetchers
 * Each returns Course[] mapped to our shape.
 * They are defensive — if any provider fails or requires credentials missing, it returns [].
 */

/** edX fetch */
async function fetchEdxCourses(limit = 40): Promise<Course[]> {
  try {
    const url = `https://www.edx.org/api/v1/catalog/search?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json.results) ? json.results : [];
    return items.map((c: any) => ({
      id: c.id || `edx-${c.key || Math.random().toString(36).slice(2, 8)}`,
      slug: c.key || c.id || c.slug,
      title: c.title || "edX Course",
      short_description: c.short_description || "",
      long_description: c.description || "",
      category: (c.subjects && c.subjects[0] && c.subjects[0].name) || c.subject || "General",
      level: c.level || "All",
      avg_rating: c.avg_rating || 0,
      review_count: c.review_count || 0,
      is_free: (c.price === 0) || c.price === undefined,
      price: c.price || 0,
      published_at: c.start || c.published || "",
      tags: c.keywords || [],
      thumbnail_url: c.image?.url || c.media?.image?.uri || "",
      instructor: { id: "edx", name: c.org || "edX", bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.warn("fetchEdxCourses error:", err);
    return [];
  }
}

/** freeCodeCamp fetch (GitHub curriculum JSON) */
async function fetchFreeCodeCampCourses(): Promise<Course[]> {
  try {
    const url = "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum/curriculum.json";
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    // json can be object or array depending on repo structure; normalize to array
    const arr = Array.isArray(json) ? json : Object.values(json || {});
    // Map only a reasonable number
    return arr.slice(0, 200).map((c: any, i: number) => ({
      id: `fcc-${i}-${String(c.title || c.name || "").slice(0, 20)}`,
      slug: (c.slug || c.name || `fcc-${i}`).toString(),
      title: c.title || c.name || "freeCodeCamp Course",
      short_description: c.description || "",
      long_description: c.description || "",
      category: "freeCodeCamp",
      level: "All",
      avg_rating: 4.5,
      review_count: 10,
      is_free: true,
      price: 0,
      published_at: "",
      tags: c.topics || [],
      thumbnail_url: "https://picsum.photos/seed/fcc/600/400",
      instructor: { id: "fcc", name: "freeCodeCamp", bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.warn("fetchFreeCodeCampCourses error:", err);
    return [];
  }
}

/** Udemy fetch (requires client id/secret) - optional */
async function fetchUdemyCourses(query?: string, limit = 40): Promise<Course[]> {
  try {
    const clientId = process.env.UDEMY_CLIENT_ID;
    const clientSecret = process.env.UDEMY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      // skip if credentials not set
      return [];
    }
    // Udemy API expects Basic auth with client_id:client_secret and endpoint search
    const url = `https://www.udemy.com/api-2.0/courses/?page_size=${limit}${query ? `&search=${encodeURIComponent(query)}` : ""}`;
    const res = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        Accept: "application/json, text/plain, */*"
      }
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results = Array.isArray(json.results) ? json.results : json.results || json;
    return (results || []).map((c: any) => ({
      id: c.id ? `udemy-${c.id}` : `udemy-${Math.random().toString(36).slice(2, 8)}`,
      slug: c.url || c.title?.toLowerCase().replace(/\s+/g, "-") || String(c.id),
      title: c.title || "Udemy Course",
      short_description: c.short_description || c.headline || "",
      long_description: c.description || "",
      category: c.primary_subcategory?.title || c.category || "General",
      level: (c.is_paid === false ? "Beginner" : c.level) || "All",
      avg_rating: c.avg_rating || c.rating || 0,
      review_count: c.num_reviews || c.ratings || 0,
      is_free: c.is_paid === false,
      price: c.price || (c.is_paid ? 1 : 0),
      published_at: c.published_time || c.created || "",
      tags: c.tags || [],
      thumbnail_url: c.image_480x270 || c.image || "",
      instructor: { id: "udemy", name: (c.visible_instructors && c.visible_instructors[0] && c.visible_instructors[0].display_name) || "Udemy Instructor", bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.warn("fetchUdemyCourses error:", err);
    return [];
  }
}

/** Coursera fetch (public catalog) */
async function fetchCourseraCourses(query?: string, limit = 40): Promise<Course[]> {
  try {
    // Coursera has an API we can try: courses.v1?q=search&query=...
    const url = query
      ? `https://www.coursera.org/api/catalog.v1/courses?includes=instructorIds&fields=slug,primaryCredential,description,photoUrl,partnerIds&query=${encodeURIComponent(query)}&limit=${limit}`
      : `https://www.coursera.org/api/catalog.v1/courses?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const elements = json.elements || json;
    return (elements || []).map((c: any) => ({
      id: c.id ? `coursera-${c.id}` : `coursera-${Math.random().toString(36).slice(2, 8)}`,
      slug: c.slug || c.name || "",
      title: c.name || c.title || "Coursera Course",
      short_description: c.description || "",
      long_description: c.description || "",
      category: c.primaryCredential || c.partnerIds ? String(c.partnerIds?.[0] || "") : "General",
      level: c.level || "All",
      avg_rating: c.avg_rating || 0,
      review_count: c.review_count || 0,
      is_free: false,
      price: 0,
      published_at: c.createdAt || "",
      tags: c.tags || [],
      thumbnail_url: c.photoUrl || "",
      instructor: { id: "coursera", name: c.instructor || "Coursera", bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.warn("fetchCourseraCourses error:", err);
    return [];
  }
}

/**
 * Caching helpers - store external combined results in Firestore 'meta' collection
 */
async function readExternalCache(db: FirebaseFirestore.Firestore) {
  try {
    const doc = await db.collection("meta").doc(EXTERNAL_CACHE_DOC_ID).get();
    if (!doc.exists) return null;
    const data = doc.data() as { fetched_at?: string; courses?: Course[] } | undefined;
    if (!data) return null;
    const fetchedAt = data.fetched_at ? new Date(data.fetched_at) : new Date(0);
    const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours <= EXTERNAL_CACHE_TTL_HOURS) return data.courses || [];
    return null;
  } catch (err) {
    console.warn("readExternalCache error", err);
    return null;
  }
}

async function writeExternalCache(db: FirebaseFirestore.Firestore, courses: Course[]) {
  try {
    await db.collection("meta").doc(EXTERNAL_CACHE_DOC_ID).set({
      fetched_at: new Date().toISOString(),
      courses
    });
  } catch (err) {
    console.warn("writeExternalCache error", err);
  }
}

/**
 * Fetch & combine external providers — uses cache when available.
 * If forceRefresh=true, ignores cache and fetches fresh.
 */
async function getExternalCourses(forceRefresh = false): Promise<Course[]> {
  if (USE_FIRESTORE) {
    try {
      const db = getFirestore();
      if (!forceRefresh) {
        const cached = await readExternalCache(db);
        if (cached) return cached;
      }
      // fetch live from providers in parallel
      const [edx, fcc, udemy, coursera] = await Promise.all([
        fetchEdxCourses(80),
        fetchFreeCodeCampCourses(),
        fetchUdemyCourses(undefined, 80),
        fetchCourseraCourses(undefined, 80)
      ]);
      const combined = [...edx, ...fcc, ...udemy, ...coursera];
      // write cache
      await writeExternalCache(getFirestore(), combined);
      return combined;
    } catch (err) {
      console.warn("getExternalCourses error:", err);
      return [];
    }
  } else {
    // no Firestore -> always fetch live (may be slower)
    try {
      const [edx, fcc, udemy, coursera] = await Promise.all([
        fetchEdxCourses(40),
        fetchFreeCodeCampCourses(),
        fetchUdemyCourses(undefined, 40),
        fetchCourseraCourses(undefined, 40)
      ]);
      return [...edx, ...fcc, ...udemy, ...coursera];
    } catch (err) {
      console.warn("getExternalCourses (no firestore) error:", err);
      return [];
    }
  }
}

/**
 * Main search function (internal)
 */
export async function searchCoursesWithScoring(
  q: string,
  filters: SearchFilters = {},
  page = 1,
  per_page = 24,
  free_boost = FREE_BOOST,
  options: { forceExternalRefresh?: boolean } = {}
): Promise<SearchResponse> {
  // 1. Load base courses (Firestore -> mock)
  let baseCourses: Course[] = [];
  if (USE_FIRESTORE) {
    try {
      const db = getFirestore();
      const snap = await db.collection("courses").get();
      baseCourses = snap.docs.map((d) => d.data() as Course);
    } catch (err) {
      console.warn("Failed to load courses from Firestore:", err);
      baseCourses = [];
    }
  }

  if (!baseCourses.length) {
    baseCourses = loadLocalCourses();
  }

  // 2. External courses (cached)
  const external = await getExternalCourses(Boolean(options.forceExternalRefresh));
  // Merge and dedupe (prefer baseCourses over external)
  const seen = new Set<string>();
  const merged: Course[] = [];
  for (const c of [...baseCourses, ...external]) {
    const key = (c.slug || c.id || "").toString();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(c);
  }

  // 3. Apply filters
  let filtered = merged;
  if (filters.category) filtered = filtered.filter((c) => c.category === filters.category);
  if (filters.level) filtered = filtered.filter((c) => c.level === filters.level);
  if (filters.is_free !== undefined) {
    const wantFree = filters.is_free === "true" || filters.is_free === true;
    filtered = filtered.filter((c) => !!c.is_free === wantFree);
  }

  // 4. If no query => popularity heuristic
  if (!q || q.trim() === "") {
    const scored = filtered
      .map((c) => ({ ...(c as any), final_score: (c.avg_rating || 0) + Math.log(1 + (c.review_count || 0)) * 0.1 }))
      .sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0));
    const total = scored.length;
    const start = (page - 1) * per_page;
    return { total, page, per_page, results: scored.slice(start, start + per_page) };
  }

  // 5. Fuse.js search + scoring
  const fuse = new Fuse(filtered, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "tags", weight: 0.25 },
      { name: "short_description", weight: 0.15 },
      { name: "long_description", weight: 0.1 },
      { name: "category", weight: 0.05 }
    ],
    includeScore: true,
    threshold: 0.45,
    useExtendedSearch: true
  });

  const fuseResults = fuse.search(q, { limit: 1000 });
  const scored = fuseResults
    .map((r) => {
      const final_score = computeFinalScore(r.item as Course, r.score ?? 1, free_boost);
      return { ...(r.item as Course), bm25_like_score: 1 - (r.score ?? 1), final_score };
    })
    .sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0));

  const total = scored.length;
  const start = (page - 1) * per_page;
  return { total, page, per_page, results: scored.slice(start, start + per_page) };
}

/**
 * API Handler (POST)
 *
 * Body:
 * {
 *   q: string,
 *   filters?: { category, level, is_free },
 *   page?: number,
 *   per_page?: number,
 *   free_boost?: number,
 *   action?: "sync"  // optional: forces external refresh and updates cache
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }

  try {
    const body = req.body || {};
    const q = body.q ?? "";
    const filters = body.filters ?? {};
    const page = Number(body.page || 1);
    const per_page = Number(body.per_page || 24);
    const free_boost = Number(body.free_boost || FREE_BOOST);
    const action = body.action as string | undefined;

    if (action === "sync") {
      // Force refresh external cache
      if (!USE_FIRESTORE) {
        // cannot cache if no Firestore - still try fetching
        await getExternalCourses(true);
        return res.json({ success: true, message: "Fetched external sources (no Firestore to cache)" });
      }
      const external = await getExternalCourses(true);
      return res.json({ success: true, message: "External cache refreshed", count: external.length });
    }

    const data = await searchCoursesWithScoring(q, filters, page, per_page, free_boost, {
      forceExternalRefresh: false
    });

    return res.json(data);
  } catch (err: any) {
    console.error("POST /api/search error:", err);
    return res.status(500).json({ error: { code: "E_INTERNAL", message: err.message || "Internal error" } });
  }
                           }
