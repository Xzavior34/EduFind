// POST /api/enroll (auth)
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseIdToken } from "./_lib/auth";
import { enrollUserInCourse } from "./_lib/db";
import emailjs from "@emailjs/browser";

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
    if (!course_id) return res.status(400).json({ error: { code: "E_VALIDATION", message: "Missing course_id" } });

    const enrollResult = await enrollUserInCourse(user.uid, course_id);

    // Send confirmation email via EmailJS
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ENROLL!,
      {
        course: enrollResult.courseTitle,
        user_email: user.email,
        course_url: `https://yourdomain.com/courses/${enrollResult.courseSlug}`
      },
      process.env.EMAILJS_PUBLIC_KEY
    );

    res.json({ success: true, enrollments: enrollResult.enrollments });
  } catch (err: any) {
    res.status(err.code || 500).json({ error: { code: err.code || "E_INTERNAL", message: err.message || "Internal error" } });
  }
}
