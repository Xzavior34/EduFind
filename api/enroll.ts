// POST /api/enroll (auth required)
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyFirebaseIdToken } from "./_libs/auth";
import { enrollUserInCourse } from "./_libs/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { code: "E_METHOD", message: "Method not allowed" }
    });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: { code: "E_AUTH", message: "Missing Authorization header" }
      });
    }
    const idToken = authHeader.replace("Bearer ", "");
    const user = await verifyFirebaseIdToken(idToken);

    // Validate input
    const { course_id } = req.body;
    if (!course_id) {
      return res.status(400).json({
        error: { code: "E_VALIDATION", message: "Missing course_id" }
      });
    }

    const enrollResult = await enrollUserInCourse(user.uid, course_id);

    res.status(200).json({
      success: true,
      message: "Enrollment successful",
      courseSlug: enrollResult.courseSlug,
      courseTitle: enrollResult.courseTitle,
      enrollments: enrollResult.enrollments || [],
      // Frontend can send enrollment email via EmailJS after confirming success
      emailNotificationPending: true
    });

  } catch (err: any) {
    console.error("POST /api/enroll error:", err);
    return res.status(err.code || 500).json({
      error: {
        code: err.code || "E_INTERNAL",
        message: err.message || "Internal error"
      }
    });
  }
      }
