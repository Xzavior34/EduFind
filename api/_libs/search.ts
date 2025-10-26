// Server-side search implementation using Fuse.js and the specified scoring formula.
// If you want a true BM25 index you can replace this with a hosted search service later.

import Fuse from "fuse.js";
import fs from "fs";
import path from "path";

/**
 * Compute days since a date string (ISO).
 */
export function daysSince(dateStr: string) {
  if (!dateStr) return 3650;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * computeFinalScore implements the exact formula from your spec.
 * Here base_score is derived from Fuse.js score (lower is better), so we invert it.
 */
export function computeFinalScore(doc: any, baseScore: number, opts: { free_boost?: number } = {}) {
  const free_boost = opts.free_boost ?? 1.25;
  // Convert Fuse score (0 -> perfect) to a base_score where higher is better.
  // We'll use base = (1 - fuseScore) * 3 as a heuristic scale.
  const base = (1 - (baseScore ?? 1)) * 3;

  const rating_adj = ((doc.avg_rating || 0) - 3) * 0.35;
  const rc_adj = Math.log(1 + (doc.review_count || 0)) * 0.04;
  const days = daysSince(doc.published_at);
  const recency_adj = Math.max(0, Math.min(1, (30 - days) / 30)) * 0.15;
  const free_multiplier = doc.is_free ? free_boost : 1.0;
  const combined = base + rating_adj + rc_adj + recency_adj;
  const final_score = combined * free_multiplier;
  return { final_score, components: { base, rating_adj, rc_adj, recency_adj, free_multiplier } };
}

/**
 * Load courses from mock JSON file
 */
export function loadLocalCourses() {
  const file = path.join(process.cwd(), "mock", "courses.seed.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const arr = JSON.parse(raw);
    return arr;
  } catch (err) {
    console.error("Failed to load mock courses:", err);
    return [];
  }
}

/**
 * searchCourses performs fuzzy search over courses and applies scoring formula.
 * Params:
 * - q: query string
 * - filters: optional { category, level, is_free }
 * - page, per_page, free_boost
 */
export async function searchCoursesWithScoring(q: string, filters: any = {}, page = 1, per_page = 24, free_boost = 1.25) {
  // Load dataset (for now from local mock)
  let courses = loadLocalCourses();

  // Simple filtering first
  if (filters) {
    if (filters.category) {
      courses = courses.filter((c: any) => c.category === filters.category);
    }
    if (filters.level) {
      courses = courses.filter((c: any) => c.level === filters.level);
    }
    if (filters.is_free !== undefined) {
      const wantFree = filters.is_free === "true" || filters.is_free === true;
      courses = courses.filter((c: any) => !!c.is_free === wantFree);
    }
  }

  if (!q || q.trim() === "") {
    // If empty query, return by popularity (avg_rating * ln(1+review_count)) heuristic
    const scored = courses.map((c: any) => {
      const pop = (c.avg_rating || 0) + Math.log(1 + (c.review_count || 0)) * 0.1;
      return { doc: c, final_score: pop };
    });
    scored.sort((a: any, b: any) => b.final_score - a.final_score);
    const results = scored.map((s: any) => ({ ...s.doc, final_score: s.final_score }));
    const start = (page - 1) * per_page;
    return { total: results.length, page, per_page, results: results.slice(start, start + per_page) };
  }

  // Fuse.js configuration: weight title x3, tags x2, short_description / long_description lower weight
  const fuse = new Fuse(courses, {
    keys: [
      { name: "title", weight: 0.45 },
      { name: "tags", weight: 0.25 },
      { name: "short_description", weight: 0.15 },
      { name: "long_description", weight: 0.10 },
      { name: "category", weight: 0.05 },
    ],
    includeScore: true,
    threshold: 0.45,
    useExtendedSearch: true,
  });

  const fuseResults = fuse.search(q, { limit: 200 });

  const scored = fuseResults.map((r) => {
    const doc = r.item;
    const baseScore = r.score ?? 1;
    const { final_score } = computeFinalScore(doc, baseScore, { free_boost });
    return { ...doc, bm25_like_score: 1 - baseScore, final_score };
  });

  // If there are courses not matched by fuse but we want to include (optional), skip for MVP

  scored.sort((a: any, b: any) => b.final_score - a.final_score);

  const total = scored.length;
  const start = (page - 1) * per_page;
  const results = scored.slice(start, start + per_page);

  return { total, page, per_page, results };
}
