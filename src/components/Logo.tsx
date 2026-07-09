/** The Loop mark: a tilted green sticker tile with a noodle glyph. */
export default function Logo({
  size = 52,
  wordmark = true,
  wordmarkSize = 34,
}: {
  size?: number;
  wordmark?: boolean;
  wordmarkSize?: number;
}) {
  const tile = Math.round(size * 0.36); // inner glyph size

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex shrink-0 -rotate-[4deg] items-center justify-center border-[3px] border-ink bg-accent shadow-[3px_3px_0_rgba(20,19,15,0.9)]"
        style={{ width: size, height: size, borderRadius: size * 0.3 }}
      >
        <svg
          width={tile}
          height={tile}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#161512"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4v7a3 3 0 0 0 3 3v6" />
          <path d="M8 4v6" />
          <path d="M4 8h4" />
          <path d="M18 4c-1.5 0-2.5 2-2.5 5s1 3.5 2.5 3.5V20" />
        </svg>
      </div>
      {wordmark && (
        <span
          className="font-semibold tracking-[-0.03em] text-ink"
          style={{ fontSize: wordmarkSize, fontWeight: 700 }}
        >
          Loop
        </span>
      )}
    </div>
  );
}
