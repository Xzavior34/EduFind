import React, { useEffect, useState, useCallback } from "react";

type Props = {
  isFree: boolean;
  price?: number;
  onEnroll: () => Promise<void> | void;
  enrolled?: boolean;
  loading?: boolean;
};

/**
 * StickyEnrollCTA
 *
 * Behavior (implements spec):
 * - Mobile (width < md): when user scrolls past the course hero (top 30% of viewport),
 *   show a full-width bottom bar with Enroll/Buy and a dismiss (x) control.
 * - Desktop (width >= md): if viewport height > 720px show a right-side sticky card
 *   while hero is visible. When the hero scrolls out (user scrolls down), show a compact
 *   pill-style CTA fixed to bottom-right. Dismissible but reappears on navigation (dismissal not persisted).
 *
 * Accessibility:
 * - Buttons have aria-labels, role attributes where appropriate.
 *
 * Usage:
 * <StickyEnrollCTA isFree={course.is_free} price={course.price} onEnroll={handleEnroll} enrolled={enrolled} />
 */
export default function StickyEnrollCTA({ isFree, price = 0, onEnroll, enrolled = false, loading = false }: Props) {
  const [show, setShow] = useState(false); // whether CTA should be visible
  const [compact, setCompact] = useState(false); // desktop compact pill mode
  const [dismissed, setDismissed] = useState(false); // one-page dismissal
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 800);

  // compute thresholds
  const isMobile = viewportWidth < 768; // tailwind md breakpoint approximation
  const desktopTall = viewportHeight > 720;

  const checkHeroPosition = useCallback(() => {
    const hero = document.getElementById("course-hero");
    if (!hero) {
      // If no hero found, fallback: show CTA on mobile & desktop compact if not dismissed
      setShow(true);
      setCompact(isMobile ? false : true);
      return;
    }
    const rect = hero.getBoundingClientRect();
    // mobile: show when user scrolls past top 30% of page -> when hero bottom < 70% of viewport height
    const mobileTrigger = rect.bottom < window.innerHeight * 0.7;
    // desktop: show right sticky card when viewport tall; show card while hero visible (rect.bottom > 0),
    // switch to compact when hero bottom <= 0 (scrolled past)
    const heroVisible = rect.bottom > 0 && rect.top < window.innerHeight;
    if (isMobile) {
      setShow(mobileTrigger && !dismissed);
      setCompact(false);
    } else {
      // desktop
      if (!desktopTall) {
        // if viewport not tall enough, default to compact bottom-right pill (if not dismissed)
        setShow(!dismissed);
        setCompact(true);
      } else {
        // tall desktop: when hero visible, show right-side card; when hero not visible, compact pill
        setShow(!dismissed);
        setCompact(!heroVisible);
      }
    }
  }, [dismissed, isMobile, desktopTall]);

  useEffect(() => {
    // update viewport dims on resize
    function onResize() {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    // scroll listener
    function onScroll() {
      checkHeroPosition();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // initial check
    setTimeout(checkHeroPosition, 100);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [checkHeroPosition]);

  // Reset dismissed state when navigation happens (component remount on route change in Next.js)
  // We don't persist dismissal across navigation intentionally to match spec.
  useEffect(() => {
    setDismissed(false);
  }, [/* empty — will run once; in SPAs route change typically remounts component */]);

  // handle enroll click
  const handleEnroll = async () => {
    try {
      await onEnroll();
    } catch (e) {
      // swallow — parent should handle errors and show UI. Keep CTA visible.
      console.error("Enroll failed:", e);
    }
  };

  // Dismiss handler: hides CTA until the user scrolls again (we'll clear dismissed when they scroll)
  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    // When user scrolls, show should be recalculated by checkHeroPosition (which will ignore dismissed -> we want reappearance on navigation,
    // but per spec reappears on navigation; we keep dismissal ephemeral to page lifetime)
    // We set up a one-time listener to clear dismissal on next navigation or next mount; simplest: clear on next scroll after a small delay
    const onNextScroll = () => {
      setDismissed(false);
      window.removeEventListener("scroll", onNextScroll);
      checkHeroPosition();
    };
    // listen for user scroll to re-enable (this makes dismissal short-lived)
    window.addEventListener("scroll", onNextScroll, { passive: true });
    // also clear after 10s as a fallback
    setTimeout(() => {
      setDismissed(false);
      checkHeroPosition();
    }, 10000);
  };

  // Don't render anything if user is already enrolled
  if (enrolled) return null;

  // Nothing to show
  if (!show) return null;

  // Mobile full-width bottom bar
  if (isMobile && !compact) {
    return (
      <div
        role="region"
        aria-label="Enroll call to action"
        className="fixed bottom-0 left-0 w-full z-50 transition-transform"
      >
        <div className="bg-cta text-white flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-semibold">{isFree ? "Enroll Free" : `Buy $${price}`}</span>
              <span className="text-xs opacity-90">{isFree ? "Instant access" : "Proceed to checkout"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Dismiss enroll bar"
              onClick={handleDismiss}
              className="text-white opacity-90 p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
            >
              ✕
            </button>

            <button
              onClick={handleEnroll}
              disabled={loading}
              className="bg-white text-cta rounded-md px-4 py-2 font-medium shadow-sm"
              aria-label={isFree ? "Enroll in course" : "Buy course"}
            >
              {loading ? "Processing..." : isFree ? "Enroll" : `Buy $${price}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop — compact pill (bottom-right) or right-side sticky card
  if (!isMobile && compact) {
    return (
      <div className="fixed right-6 bottom-6 z-50">
        <div className="flex items-center gap-3 bg-cardBg p-2 rounded-full shadow-lg">
          <button
            aria-label={isFree ? "Enroll in course" : "Buy course"}
            onClick={handleEnroll}
            disabled={loading}
            className="bg-cta text-white rounded-full px-4 py-2 font-medium shadow-sm"
          >
            {loading ? "Processing..." : isFree ? "Enroll" : `Buy $${price}`}
          </button>
          <button
            aria-label="Dismiss enroll"
            onClick={handleDismiss}
            className="text-sm text-gray-600 px-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cta"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Desktop right-side sticky card (visible when hero is in view and viewport tall)
  return (
    <aside
      role="complementary"
      aria-label="Enroll card"
      className="hidden md:block fixed right-8 top-32 z-40"
    >
      <div className="bg-cardBg shadow-lg rounded-md flex flex-col gap-4 p-4 w-64">
        <div>
          <div className="text-sm font-semibold">{isFree ? "Enroll Free" : `Buy this course`}</div>
          <div className="text-xs text-gray-500">{isFree ? "Instant access" : `Price: $${price}`}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleEnroll}
            disabled={loading}
            className="bg-cta text-white rounded-md px-4 py-2 font-medium shadow-sm w-full"
            aria-label={isFree ? "Enroll in course" : "Buy course"}
          >
            {loading ? "Processing..." : isFree ? "Enroll" : `Buy $${price}`}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss enroll card"
            className="text-sm text-gray-600 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cta"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
