// POST /api/enroll (auth)
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseIdToken } from "./_libs/auth";
import { enrollUserInCourse } from "./_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "E_METHOD", message: "Method not allowed" } });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw { code: 401, message: "Missing Authorization header" };
    const idToken = authHeader.replace("Bearer ", "");
    const user = await verifyFirebaseIdToken(idToken);

    const { course_id } = req.body;
    if (!course_id) {
      return res.status(400).json({ error: { code: "E_VALIDATION", message: "Missing course_id" } });
    }

    const enrollResult = await enrollUserInCourse(user.uid, course_id);

    // TODO: Send EmailJS notification from client after enroll confirmation

    res.json({ success: true, enrollments: enrollResult.enrollments });
  } catch (err: any) {
    res.status(err.code || 500).json({
      error: { code: err.code || "E_INTERNAL", message: err.message || "Internal error" }
    });
  }
              }
