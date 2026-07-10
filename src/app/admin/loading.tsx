import LoadingBar from "@/components/LoadingBar";

// Shown in the admin content area (sidebar persists) during page transitions.
export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <LoadingBar />
      <div className="h-8 w-40 animate-pulse rounded-lg bg-black/10" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-black/10 bg-white"
          />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl border border-black/10 bg-white" />
    </div>
  );
}
