/**
 * The Loop app frame: a centered 430px paper surface with the halftone dot
 * texture. Player screens render their content inside it.
 */
export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-1 flex-col overflow-hidden bg-paper">
      <div className="halftone pointer-events-none absolute inset-0 z-0 opacity-5" />
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
