import Fuse from "fuse.js";
import fs from "fs";
import path from "path";

export interface Course {
  id: string;
  title: string;
  tags?: string[];
  short_description?: string;
  long_description?: string;
  category?: string;
  level?: string;
  avg_rating?: number;
  review_count?: number;
  is_free?: boolean;
  published_at?: string;
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

// Utility
export function daysSince(dateStr?: string) {
  if (!dateStr) return 3650;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeFinalScore(
  doc: Course,
  fuseScore: number,
  opts: { free_boost?: number } = {}
) {
  const free_boost = opts.free_boost ?? 1.25;
  const base = (1 - (fuseScore ?? 1)) * 3;

  const rating_adj = ((doc.avg_rating || 0) - 3) * 0.35;
  const rc_adj = Math.log(1 + (doc.review_count || 0)) * 0.04;
  const days = daysSince(doc.published_at);
  const recency_adj = Math.max(0, Math.min(1, (30 - days) / 30)) * 0.15;
  const free_multiplier = doc.is_free ? free_boost : 1.0;

  const combined = base + rating_adj + rc_adj + recency_adj;
  const final_score = combined * free_multiplier;

  return { final_score };
}

export function loadLocalCourses(): Course[] {
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Course[];
  } catch (err) {
    console.error("Failed to load mock courses:", err);
    return [];
  }
}

export async function searchCoursesWithScoring(
  q: string,
  filters: SearchFilters = {},
  page = 1,
  per_page = 24,
  free_boost = 1.25
): Promise<SearchResponse> {
  let courses = loadLocalCourses();

  // Filtering
  if (filters.category) {
    courses = courses.filter(c => c.category === filters.category);
  }
  if (filters.level) {
    courses = courses.filter(c => c.level === filters.level);
  }
  if (filters.is_free !== undefined) {
    const wantFree = filters.is_free === "true" || filters.is_free === true;
    courses = courses.filter(c => !!c.is_free === wantFree);
  }

  // If no search query: sort by popularity heuristic
  if (!q || q.trim() === "") {
    const scored = courses
      .map(c => ({
        ...c,
        final_score:
          (c.avg_rating || 0) +
          Math.log(1 + (c.review_count || 0)) * 0.1
      }))
      .sort((a, b) => b.final_score - a.final_score);

    const start = (page - 1) * per_page;
    return {
      total: scored.length,
      page,
      per_page,
      results: scored.slice(start, start + per_page)
    };
  }

  const fuse = new Fuse(courses, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "tags", weight: 0.25 },
      { name: "short_description", weight: 0.15 },
      { name: "long_description", weight: 0.10 },
      { name: "category", weight: 0.05 }
    ],
    includeScore: true,
    threshold: 0.45,
    useExtendedSearch: true
  });

  const fuseResults = fuse.search(q, { limit: 200 });

  const scored = fuseResults
    .map(r => {
      const doc = r.item;
      const baseScore = r.score ?? 1;
      const { final_score } = computeFinalScore(doc, baseScore, { free_boost });

      return {
        ...doc,
        bm25_like_score: 1 - baseScore,
        final_score
      };
    })
    .sort((a, b) => b.final_score - a.final_score);

  const start = (page - 1) * per_page;
  return {
    total: scored.length,
    page,
    per_page,
    results: scored.slice(start, start + per_page)
  };
}
