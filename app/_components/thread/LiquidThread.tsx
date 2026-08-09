"use client";

import { useEffect, useRef } from "react";
import { initLiquidThread } from "./liquid-thread";
import "./liquid-thread.css";

/*
 * The React shell around liquid-thread.js — renders the overlay div
 * and hands it to the vanilla module, which owns everything after
 * that (path generation, scrub, liquid motion, pulses, teardown).
 * Mounted on the landing page only.
 */
export default function LiquidThread() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    return initLiquidThread(hostRef.current);
  }, []);

  return <div ref={hostRef} className="liquid-thread" aria-hidden="true" />;
}
