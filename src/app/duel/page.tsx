import Link from "next/link";

// Placeholder — the duel loop is built in Phase 2.
export default function DuelPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-4xl">🍜</div>
      <h1 className="text-xl font-semibold">Duels are coming next</h1>
      <p className="max-w-xs text-sm text-black/60 dark:text-white/60">
        Phase 2 wires up the two-card duel loop and the result screen.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full border border-black/15 px-5 py-2.5 text-sm dark:border-white/20"
      >
        Back home
      </Link>
    </main>
  );
}
