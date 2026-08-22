"use client";

import { useEffect } from "react";
import { initWebVitals } from "@/lib/web-vitals";

/**
 * Initialize Web Vitals tracking once.
 * Add to root layout.
 */
export function WebVitalsInit() {
  useEffect(() => {
    initWebVitals();
  }, []);
  return null;
}
