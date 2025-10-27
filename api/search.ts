// POST /api/search
import type { NextApiRequest, NextApiResponse } from "next";
import { searchCoursesWithScoring } from "./_libs/search";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { code: "E_METHOD", message: "Method not allowed. Use POST request." }
    });
  }

  try {
    const { q, filters = {}, page = 1, per_page = 24 } = req.body;

    if (!q || String(q).trim() === "") {
      return res.status(400).json({
        error: { code: "E_QUERY", message: "Missing search query `q`." }
      });
    }

    const FREE_BOOST = Number(process.env.FREE_BOOST || 1.25);

    const results = await searchCoursesWithScoring(
      String(q),
      filters,
      Number(page),
      Number(per_page),
      FREE_BOOST
    );

    return res.json(results);

  } catch (err: any) {
    console.error("POST /api/search error", err);
    return res.status(500).json({
      error: { code: "E_INTERNAL", message: err.message || "Internal error" }
    });
  }
}
