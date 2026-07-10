/** Slim indeterminate progress bar pinned to the top of the viewport. */
export default function LoadingBar() {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-accent/20"
    >
      <div className="loadingbar-fill absolute inset-y-0 w-[45%] rounded-full bg-accent" />
    </div>
  );
}
