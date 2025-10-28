import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "@/api/_libs/firebaseAdmin";
import { SearchResponse, Course } from "@/api/_libs/search"; // using your existing types
import Fuse from "fuse.js";

const DEFAULT_PER_PAGE = 12;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse | { error: string }>
) {
  try {
    const { q = "", page = 1, category, is_free } = req.query;
    const db = getFirestore();
    const coursesRef = db.collection("courses");
    const snapshot = await coursesRef.get();
    const firebaseCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];

    let filtered = [...firebaseCourses];

    if (q) {
      const fuse = new Fuse(firebaseCourses, {
        keys: ["title", "short_description", "category", "tags"],
        threshold: 0.45
      });
      const results = fuse.search(q as string);
      filtered = results.map(r => ({ ...r.item, final_score: r.score ? 1 - r.score : 1 }));
    }

    if (category) {
      filtered = filtered.filter(c => c.category?.toLowerCase() === String(category).toLowerCase());
    }

    if (is_free !== undefined) {
      const freeVal = is_free === "true" || is_free === true;
      filtered = filtered.filter(c => c.is_free === freeVal);
    }

    // If no results found in Firebase, call free course providers
    if (filtered.length === 0 && q) {
      const liveResults = await fetchExternalCourses(q as string);
      filtered = liveResults;
    }

    const total = filtered.length;
    const per_page = DEFAULT_PER_PAGE;
    const start = (Number(page) - 1) * per_page;
    const results = filtered.slice(start, start + per_page);

    res.status(200).json({
      total,
      page: Number(page),
      per_page,
      results: results.map(r => ({ ...r, final_score: r.final_score || 0.8 }))
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal Search Error" });
  }
}

async function fetchExternalCourses(query: string): Promise<Course[]> {
  try {
    const apis = [
      `https://www.udemy.com/api-2.0/search/?q=${encodeURIComponent(query)}`,
      `https://www.coursera.org/search?query=${encodeURIComponent(query)}`,
      `https://api.freecodecamp.org/internal/search?q=${encodeURIComponent(query)}`
    ];

    const responses = await Promise.allSettled(apis.map(url => fetch(url)));
    const data: Course[] = [];

    for (const res of responses) {
      if (res.status === "fulfilled") {
        // TODO parse real formats based on provider
        data.push({
          id: "live-" + Math.random().toString(36).substring(2, 9),
          slug: query.toLowerCase().replace(" ", "-"),
          title: "Live Course: " + query,
          short_description: "Fetched from live course platforms.",
          is_free: true,
          final_score: 0.7
        } as any);
      }
    }

    return data;
  } catch {
    return [];
  }
}
