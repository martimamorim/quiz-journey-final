import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { GameProvider, useGame } from "@/game/GameContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { MapScreen } from "@/components/game/MapScreen";
import { ScannerScreen } from "@/components/game/ScannerScreen";
import { QuizScreen } from "@/components/game/QuizScreen";
import { FinalScreen } from "@/components/game/FinalScreen";
import { Loader2, LogOut, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMusicEnabled, startMusic, toggleMusic } from "@/game/music";

const Router = () => {
  const { screen } = useGame();
  return (
    <>
      {(screen === "home" || screen === "map") && <MapScreen />}
      {screen === "scanner" && <ScannerScreen />}
      {screen === "quiz" && <QuizScreen />}
      {screen === "final" && <FinalScreen />}
    </>
  );
};

const TopBar = () => {
  const { signOut, profile } = useAuth();
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  return (
    <div className="fixed top-0 inset-x-0 z-[1000] mx-auto max-w-md px-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/85 backdrop-blur px-3 py-2 shadow-card">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Aluno</div>
          <div className="text-sm font-semibold truncate">{profile?.display_name ?? "—"}</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          onClick={async () => setMusicOn(await toggleMusic())}
          aria-label={musicOn ? "Desligar música" : "Ligar música"}
        >
          {musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={signOut} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const StartMusicOnce = () => {
  useEffect(() => {
    const handler = () => {
      startMusic();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);
  return null;
};

const Gate = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return (
    <GameProvider>
      <StartMusicOnce />
      <TopBar />
      <div className="pt-16">
        <Router />
      </div>
    </GameProvider>
  );
};

const Index = () => (
  <main className="mx-auto max-w-md w-full">
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </main>
);

export default Index;
