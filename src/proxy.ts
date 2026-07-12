import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 renamed Middleware to Proxy. This refreshes the Supabase session
// and redirects unauthenticated users to /login.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets, image files, and the PWA
     * plumbing (manifest + service worker) — the browser fetches those
     * without auth and they must never bounce to /login.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
