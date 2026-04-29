import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { GameProvider, useGame } from "@/game/GameContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { HomeScreen } from "@/components/game/HomeScreen";
import { MapScreen } from "@/components/game/MapScreen";
import { ScannerScreen } from "@/components/game/ScannerScreen";
import { QuizScreen } from "@/components/game/QuizScreen";
import { FinalScreen } from "@/components/game/FinalScreen";
import { ProgressScreen } from "@/components/game/ProgressScreen";
import { HelpScreen } from "@/components/game/HelpScreen";
import { RankingScreen } from "@/components/game/RankingScreen";
import { TeacherScreen } from "@/components/game/TeacherScreen";
import { BottomNav } from "@/components/game/BottomNav";
import { Loader2 } from "lucide-react";

const NAV_SCREENS = new Set(["home", "map", "scanner", "ranking", "help", "progress"]);

const Router = () => {
  const { screen } = useGame();
  const showNav = NAV_SCREENS.has(screen);
  return (
    <>
      {screen === "home" && <HomeScreen />}
      {screen === "map" && <MapScreen />}
      {screen === "scanner" && <ScannerScreen />}
      {screen === "quiz" && <QuizScreen />}
      {screen === "final" && <FinalScreen />}
      {screen === "progress" && <ProgressScreen />}
      {screen === "help" && <HelpScreen />}
      {screen === "ranking" && <RankingScreen />}
      {screen === "teacher" && <TeacherScreen />}
      {showNav && <BottomNav />}
    </>
  );
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
      <Router />
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
