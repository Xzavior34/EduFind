// POST /api/search
import type { NextApiRequest, NextApiResponse } from "next";
import { searchCoursesWithScoring } from "./_lib/search";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }
  try {
    const { q, filters, page = 1, per_page = 24 } = req.body;
    const results = await searchCoursesWithScoring(q, filters, page, per_page);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: { code: "E_INTERNAL", message: err.message || "Internal error" } });
  }
}
