// POST /api/users (create profile)
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseIdToken } from "./_libs/auth";
import { createUserProfile } from "./_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw { code: 401, message: "Missing Authorization header" };
    const idToken = authHeader.replace("Bearer ", "");
    const user = await verifyFirebaseIdToken(idToken);

    const { uid, email } = req.body;
    if (!uid || !email) return res.status(400).json({ error: { code: "E_VALIDATION", message: "Missing uid or email" } });

    await createUserProfile({ uid, email });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.code || 500).json({ error: { code: err.code || "E_INTERNAL", message: err.message || "Internal error" } });
  }
}
