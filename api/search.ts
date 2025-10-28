// POST /api/search
import type { NextApiRequest, NextApiResponse } from "next";
import Fuse from "fuse.js";
import fs from "fs";
import path from "path";
import { getFirestore } from "./firebaseAdmin";

export interface Course {
  id: string;
  slug: string;
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

const USE_FIRESTORE = process.env.USE_FIRESTORE === "true";

// Utility: compute final score for ranking
function daysSince(dateStr?: string) {
  if (!dateStr) return 3650;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function computeFinalScore(doc: Course, fuseScore: number, free_boost = 1.25) {
  const base = (1 - (fuseScore ?? 1)) * 3;
  const rating_adj = ((doc.avg_rating || 0) - 3) * 0.35;
  const rc_adj = Math.log(1 + (doc.review_count || 0)) * 0.04;
  const days = daysSince(doc.published_at);
  const recency_adj = Math.max(0, Math.min(1, (30 - days) / 30)) * 0.15;
  const free_multiplier = doc.is_free ? free_boost : 1.0;

  const final_score = (base + rating_adj + rc_adj + recency_adj) * free_multiplier;
  return final_score;
}

// Load local mock courses
function loadLocalCourses(): Course[] {
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load mock courses:", err);
    return [];
  }
}

// Fetch external courses (example: edX + freeCodeCamp)
async function fetchExternalCourses(): Promise<Course[]> {
  const courses: Course[] = [];

  try {
    // Example: edX (simplified API call)
    const edxResp = await fetch("https://www.edx.org/api/v1/catalog/search?limit=20");
    const edxData = await edxResp.json();
    if (edxData?.results) {
      courses.push(
        ...edxData.results.map((c: any) => ({
          id: c.id || c.key,
          slug: c.slug || c.id,
          title: c.title,
          short_description: c.short_description || "",
          long_description: c.description || "",
          category: c.subjects?.[0]?.name || "General",
          level: c.level || "Beginner",
          avg_rating: c.avg_rating || 4,
          review_count: c.review_count || 0,
          is_free: c.price === 0,
          price: c.price || 0,
          published_at: c.start || new Date().toISOString(),
          tags: c.subjects?.map((s: any) => s.name) || [],
          thumbnail_url: c.image?.url || "",
          instructor: { id: "edx", name: c.org || "edX", bio: "", avatar_url: "" }
        }))
      );
    }

    // Example: freeCodeCamp (from GitHub)
    const fccResp = await fetch(
      "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum.json"
    );
    const fccData = await fccResp.json();
    if (fccData) {
      courses.push(
        ...Object.values(fccData).map((c: any) => ({
          id: `fcc-${c.id}`,
          slug: c.slug || c.id,
          title: c.title,
          short_description: c.description || "",
          long_description: c.description || "",
          category: "freeCodeCamp",
          level: "Beginner",
          avg_rating: 4.5,
          review_count: 50,
          is_free: true,
          price: 0,
          published_at: new Date().toISOString(),
          tags: c.topics || [],
          thumbnail_url: "https://picsum.photos/seed/fcc/600/400",
          instructor: { id: "fcc", name: "freeCodeCamp", bio: "", avatar_url: "" }
        }))
      );
    }
  } catch (err) {
    console.error("Failed to fetch external courses:", err);
  }

  return courses;
}

// Unified search endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }

  try {
    const { q, filters = {}, page = 1, per_page = 24, free_boost = 1.25 } = req.body;

    // 1. Firestore courses
    let courses: Course[] = [];
    if (USE_FIRESTORE) {
      const db = getFirestore();
      const snap = await db.collection("courses").get();
      courses = snap.docs.map(d => d.data() as Course);
    }

    // 2. Mock fallback
    if (!courses.length) {
      courses = loadLocalCourses();
    }

    // 3. External live courses
    const external = await fetchExternalCourses();
    courses.push(...external);

    // Apply filters
    if (filters.category) courses = courses.filter(c => c.category === filters.category);
    if (filters.level) courses = courses.filter(c => c.level === filters.level);
    if (filters.is_free !== undefined) {
      const wantFree = filters.is_free === "true" || filters.is_free === true;
      courses = courses.filter(c => !!c.is_free === wantFree);
    }

    // Fuse.js search
    let results: Array<Course & { final_score: number; bm25_like_score?: number }> = [];
    if (!q || q.trim() === "") {
      results = courses.map(c => ({
        ...c,
        final_score: (c.avg_rating || 0) + Math.log(1 + (c.review_count || 0)) * 0.1
      }));
    } else {
      const fuse = new Fuse(courses, {
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

      const fuseResults = fuse.search(q, { limit: 200 });
      results = fuseResults
        .map(r => {
          const final_score = computeFinalScore(r.item, r.score ?? 1, free_boost);
          return { ...r.item, bm25_like_score: 1 - (r.score ?? 1), final_score };
        })
        .sort((a, b) => b.final_score - a.final_score);
    }

    // Pagination
    const start = (page - 1) * per_page;
    res.json({
      total: results.length,
      page,
      per_page,
      results: results.slice(start, start + per_page)
    });
  } catch (err: any) {
    console.error("Search error:", err);
    res.status(500).json({ error: { code: "E_INTERNAL", message: err.message || "Internal error" } });
  }
             }
