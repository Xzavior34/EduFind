// GET /api/courses?q=&category=&level=&price=&sort=&page=&per_page=
// For search queries prefer POST /api/search which uses Fuse.js scoring.
// This route provides simple listing and quick query passthrough to search (GET uses q param).

import type { NextApiRequest, NextApiResponse } from "next";
import { searchCoursesWithScoring } from "../../api/_libs/search";
import { getCourses } from "../../api/_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }
  try {
    const { q, category, level, price, sort, page = "1", per_page = "24" } = req.query;
    // If there's a search query, route through the search function
    if (q && String(q).trim() !== "") {
      const filters: any = {};
      if (category) filters.category = category;
      if (level) filters.level = level;
      if (price === "free") filters.is_free = true;
      const data = await searchCoursesWithScoring(String(q), filters, Number(page), Number(per_page), Number(process.env.FREE_BOOST || 1.25));
      return res.json(data);
    }
    // Otherwise return paginated list
    const data = await getCourses({ q, category, level, price, sort, page: Number(page), per_page: Number(per_page) });
    res.json(data);
  } catch (err: any) {
    console.error("GET /api/courses error", err);
    res.status(500).json({ error: { code: "E_INTERNAL", message: err.message || "Internal error" } });
  }
}
