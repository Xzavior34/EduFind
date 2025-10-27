// GET /api/courses?q=&category=&level=&price=&sort=&page=&per_page=
//
// If a search term exists, delegate to Fuse.js scoring via searchCoursesWithScoring.
// Otherwise return paginated listing from mock DB.
// Includes:
// - Free course boost
// - Filters (category, level, price)
// - Sorting (rating, popularity, free-first, etc.)

import type { NextApiRequest, NextApiResponse } from "next";
import { searchCoursesWithScoring } from "./_libs/search";
import { getCourses } from "./_libs/db";

const FREE_BOOST = Number(process.env.FREE_BOOST || 1.25);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }

  try {
    const {
      q,
      category,
      level,
      price,
      sort = "relevance",
      page = "1",
      per_page = "24"
    } = req.query;

    const currentPage = Number(page);
    const perPage = Number(per_page);

    // If search query given, perform intelligent Fuse.js search
    if (q && String(q).trim() !== "") {
      const filters: Record<string, any> = {};

      if (category) filters.category = String(category);
      if (level) filters.level = String(level);
      if (price === "free") filters.is_free = true;

      const data = await searchCoursesWithScoring(
        String(q),
        filters,
        currentPage,
        perPage,
        FREE_BOOST
      );

      return res.status(200).json(data);
    }

    // Default fallback listing when no search query provided
    const list = await getCourses({
      q,
      category,
      level,
      price,
      sort,
      page: currentPage,
      per_page: perPage
    });

    let results = list.results;

    // Basic filtering for default list view
    if (category) results = results.filter((c: any) => c.category === category);
    if (level) results = results.filter((c: any) => c.level === level);
    if (price === "free") results = results.filter((c: any) => c.is_free === true);

    // Sorting logic
    if (sort === "rating") {
      results.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === "free_first") {
      results.sort((a: any, b: any) => (b.is_free === true ? 1 : 0) - (a.is_free === true ? 1 : 0));
    } else if (sort === "popular") {
      results.sort((a: any, b: any) => (b.enrolled_count || 0) - (a.enrolled_count || 0));
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
