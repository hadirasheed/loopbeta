"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Chrome's install-prompt event (not yet in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Captured at module scope: the event fires once, early in the page's life —
// usually before the menu tray (and this component) has mounted.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag when launched from the home screen.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac, so also check for touch.
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

// Static browser facts read via useSyncExternalStore so the server render
// (which can't know them) hydrates cleanly: server says "standalone" so
// nothing flashes, the client corrects it right after hydration.
const emptySubscribe = () => () => {};

/**
 * "Add to Home Screen" button. On Chrome/Android it fires the native install
 * prompt; on iOS (no prompt API) it opens step-by-step instructions. Hidden
 * entirely when already running as an installed app.
 */
export default function InstallApp({
  variant = "home",
}: {
  variant?: "home" | "tray";
}) {
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const standalone = useSyncExternalStore(emptySubscribe, isStandalone, () => true);
  const ios = useSyncExternalStore(emptySubscribe, isIos, () => false);

  useEffect(() => {
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (standalone) return null; // already an app — nothing to offer

  async function install() {
    if (deferredPrompt) {
      const p = deferredPrompt;
      deferredPrompt = null;
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    // No native prompt available (iOS, or the browser withheld it) —
    // show manual instructions instead.
    setShowHelp(true);
  }

  const label = installed ? "✓ Added to Home Screen" : "Add to Home Screen";

  const button =
    variant === "tray" ? (
      <button
        type="button"
        onClick={install}
        disabled={installed}
        className="press mb-2 flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-card px-4 py-[13px] text-left text-[15px] font-semibold text-ink shadow-hard-sm disabled:opacity-60"
      >
        <PhoneIcon />
        {label}
      </button>
    ) : (
      <button
        type="button"
        onClick={install}
        disabled={installed}
        className="press mt-[14px] flex items-center gap-2 rounded-full border-[3px] border-ink bg-card px-4 py-[9px] text-[13px] font-bold text-ink shadow-hard-sm disabled:opacity-60"
      >
        <PhoneIcon />
        {label}
      </button>
    );

  return (
    <>
      {button}

      {showHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div className="absolute inset-0 bg-ink/40" />
          <div
            className="anim-dropInBottom relative w-full max-w-[430px] rounded-t-[24px] border-t-[3px] border-ink bg-paper px-6 pb-[calc(26px+env(safe-area-inset-bottom))] pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/20" />
            <h2 className="text-[19px] font-bold text-ink">
              Save Loop to your home screen
            </h2>
            <ol className="mt-3 flex flex-col gap-2 font-[family-name:var(--font-body)] text-[14px] font-semibold text-ink/80">
              {ios ? (
                <>
                  <li>
                    1. Tap the <b>Share</b> button{" "}
                    <span aria-hidden>(the square with an arrow)</span> in
                    Safari&apos;s toolbar.
                  </li>
                  <li>
                    2. Scroll down and tap <b>Add to Home Screen</b>.
                  </li>
                  <li>
                    3. Tap <b>Add</b> — Loop opens full-screen like an app.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    1. Open your browser&apos;s <b>⋮ menu</b>.
                  </li>
                  <li>
                    2. Tap <b>Add to Home screen</b> (or <b>Install app</b>).
                  </li>
                  <li>3. Confirm — Loop opens full-screen like an app.</li>
                </>
              )}
            </ol>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="press mt-5 w-full rounded-2xl border-[3px] border-ink bg-accent px-4 py-[13px] text-[15px] font-bold text-ink shadow-hard-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#161512"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M12 6v6" />
      <path d="M9.5 9.5L12 12l2.5-2.5" />
      <path d="M10 18h4" />
    </svg>
  );
}
