// GET /api/courses?category=&level=&price=&sort=&page=&per_page=
//
// Simple course listing endpoint
// Filtering: category, level, price (free)
// Sorting: rating, free_first, popular, etc.
// No Fuse.js search here anymore
// Full-text search now handled by POST /api/search

import type { NextApiRequest, NextApiResponse } from "next";
import { getCourses } from "./_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: { code: "E_METHOD", message: "Method not allowed" }
    });
  }

  try {
    const {
      category,
      level,
      price,
      sort = "popular",
      page = "1",
      per_page = "24"
    } = req.query;

    const currentPage = Number(page);
    const perPage = Number(per_page);

    // Fetch basic listing (mock DB or Firestore)
    const list = await getCourses({
      category: category ? String(category) : undefined,
      level: level ? String(level) : undefined,
      price,
      sort,
      page: currentPage,
      per_page: perPage
    });

    let results = [...list.results];

    // Filters
    if (category) results = results.filter(c => c.category === category);
    if (level) results = results.filter(c => c.level === level);
    if (price === "free") results = results.filter(c => c.is_free === true);

    // Sorting
    if (sort === "rating") {
      results.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    } else if (sort === "free_first") {
      results.sort((a, b) => (b.is_free === true ? 1 : 0) - (a.is_free === true ? 1 : 0));
    } else if (sort === "popular") {
      results.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    }

    return res.status(200).json({
      results,
      total: results.length,
      page: currentPage,
      per_page: perPage
    });

  } catch (err: any) {
    console.error("GET /api/courses error", err);
    return res.status(500).json({
      error: { code: "E_INTERNAL", message: err.message || "Internal error" }
    });
  }
                                        }
