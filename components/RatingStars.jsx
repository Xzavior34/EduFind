// components/RatingStars.jsx
import React from "react";

/**
 * Simple star rating component.
 * Props:
 * - value: number (0-5)
 * - max: number (default 5)
 * - size: tailwind text size class or pixel number (optional)
 */
export default function RatingStars({ value = 0, max = 5, size = "text-sm" }) {
  const filled = Math.round(Math.max(0, Math.min(value, max)));
  return (
    <div className={`inline-flex items-center gap-0.5 ${typeof size === "string" ? size : ""}`} aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className="leading-none" aria-hidden>
          {i < filled ? "★" : "☆"}
        </span>
      ))}
      <span className="sr-only">{value} out of {max} stars</span>
    </div>
  );
}
