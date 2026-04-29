import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { Trophy, RotateCcw, Sparkles, Medal } from "lucide-react";
import { playWin, vibrate } from "@/game/sound";

export const FinalScreen = () => {
  const { resetProgress, totalPoints, go } = useGame();

  useEffect(() => {
    playWin();
    vibrate([100, 50, 100, 50, 200]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden pb-32">
      {Array.from({ length: 24 }).map((_, i) => (
        <Sparkles
          key={i}
          className="absolute text-primary animate-float opacity-70"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            width: `${12 + Math.random() * 20}px`,
            height: `${12 + Math.random() * 20}px`,
          }}
        />
      ))}

      <div className="relative animate-bounce-in">
        <div className="absolute inset-0 bg-gradient-treasure blur-3xl opacity-60 rounded-full" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-treasure flex items-center justify-center shadow-glow">
          <Trophy className="w-16 h-16 text-background" />
        </div>
      </div>

      <h1 className="mt-8 text-4xl font-black bg-gradient-treasure bg-clip-text text-transparent animate-scale-in">
        Tesouro Encontrado!
      </h1>
      <p className="mt-3 text-muted-foreground max-w-xs animate-fade-in">
        Parabéns! Completaste a caça ao tesouro com <span className="text-primary font-bold">{totalPoints}</span> pontos.
      </p>

      <Button
        size="lg"
        onClick={() => go("ranking")}
        className="mt-8 h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"
      >
        <Medal className="mr-2 h-5 w-5" /> Ver Ranking
      </Button>
      <Button variant="ghost" onClick={resetProgress} className="mt-3 rounded-full">
        <RotateCcw className="mr-2 h-4 w-4" /> Jogar Novamente
      </Button>
    </div>
  );
};
