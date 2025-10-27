// GET /api/users/{uid}/dashboard (auth)
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseIdToken } from "../../_libs/auth";
import { getUserEnrollments } from "../../_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw { code: 401, message: "Missing Authorization header" };
    const idToken = authHeader.replace("Bearer ", "");
    const user = await verifyFirebaseIdToken(idToken);

    const enrollments = await getUserEnrollments(user.uid);
    res.json({ enrollments });
  } catch (err: any) {
    res.status(err.code || 500).json({ error: { code: err.code || "E_INTERNAL", message: err.message || "Internal error" } });
  }
}
