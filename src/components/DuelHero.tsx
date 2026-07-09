/** Two tilted floating dish cards with a VS badge — the brand hero. */
export default function DuelHero({ size = 230 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="stripes anim-floatA absolute h-[150px] w-[130px] rounded-[20px] border-[3px] border-ink shadow-[5px_5px_0_rgba(20,19,15,0.9)]"
        style={{ top: "14%", left: "2%" }}
      >
        <div className="absolute inset-x-[-2px] bottom-[-2px] flex h-[34px] items-center justify-center rounded-b-[20px] border-[3px] border-ink bg-accent text-[13px] font-bold text-ink">
          THIS
        </div>
      </div>
      <div
        className="anim-floatB absolute h-[150px] w-[130px] rounded-[20px] border-[3px] border-ink bg-card shadow-[5px_5px_0_rgba(20,19,15,0.9)]"
        style={{ top: "26%", right: "2%" }}
      >
        <div className="stripes absolute inset-0 rounded-[18px]" />
        <div className="absolute inset-x-[-2px] bottom-[-2px] flex h-[34px] items-center justify-center rounded-b-[20px] border-[3px] border-ink bg-ink text-[13px] font-bold text-accent">
          THAT
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 z-[3] flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] items-center justify-center rounded-full border-[3px] border-white bg-ink shadow-[0_0_0_3px_#161512]">
        <span className="text-[24px] font-bold italic tracking-[-1px] text-accent">
          VS
        </span>
      </div>
    </div>
  );
}
