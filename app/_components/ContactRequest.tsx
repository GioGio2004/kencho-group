"use client";

import { useSyncExternalStore } from "react";
import { REQUEST_CONTEXT_KEY } from "./ContactProvider";
import ProjectRequestForm from "./ProjectRequestForm";

function subscribe(change: () => void) {
  window.addEventListener(REQUEST_CONTEXT_KEY, change);
  window.addEventListener("storage", change);
  return () => {
    window.removeEventListener(REQUEST_CONTEXT_KEY, change);
    window.removeEventListener("storage", change);
  };
}
function snapshot() {
  try { return sessionStorage.getItem(REQUEST_CONTEXT_KEY)?.slice(0, 1000) || ""; }
  catch { return ""; }
}

export default function ContactRequest() {
  const about = useSyncExternalStore(subscribe, snapshot, () => "");
  return <ProjectRequestForm about={about} />;
}
