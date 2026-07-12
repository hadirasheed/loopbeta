"use client";

import { useEffect } from "react";

/** Registers the service worker once per page load. Renders nothing. */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is best-effort; the app works fine without it */
      });
    }
  }, []);
  return null;
}
