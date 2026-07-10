import LoadingBar from "@/components/LoadingBar";
import Frame from "@/components/Frame";
import Logo from "@/components/Logo";

// Shown during transitions between player screens (login / onboarding / duel).
export default function AppLoading() {
  return (
    <Frame>
      <LoadingBar />
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse">
          <Logo size={56} wordmark={false} />
        </div>
      </div>
    </Frame>
  );
}
