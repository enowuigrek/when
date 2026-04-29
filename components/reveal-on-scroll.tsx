"use client";

import { useEffect } from "react";

/**
 * Adds class `is-in-view` to any element with `data-reveal` when it
 * enters the viewport. CSS handles the actual transition.
 *
 * Drop one <RevealOnScroll /> anywhere in a tree and add `data-reveal`
 * to elements you want animated.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      // Old browsers — just show everything
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        el.classList.add("is-in-view");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in-view");
            observer.unobserve(entry.target); // animate once
          }
        }
      },
      // Trigger when the element is well inside the viewport — not
      // when it just peeks from the bottom edge. Bottom margin shrinks
      // the observed area so the element must be ~25% above the
      // viewport bottom before firing.
      { threshold: 0.25, rootMargin: "0px 0px -22% 0px" }
    );

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
