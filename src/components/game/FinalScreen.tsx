import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { Trophy, RotateCcw, Sparkles, Medal, Clock, Check, X } from "lucide-react";
import { playWin, vibrate } from "@/game/sound";

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} min ${s.toString().padStart(2, "0")}s`;
};

export const FinalScreen = () => {
  const { resetProgress, summary, go } = useGame();

  useEffect(() => {
    playWin();
    vibrate([100, 50, 100, 50, 200]);
  }, []);

  const correct = summary?.correctCount ?? 0;
  const wrong = summary?.wrongCount ?? 0;
  const total = summary?.totalQuestions ?? correct + wrong;
  const duration = summary?.durationSeconds ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden pb-32">
      {Array.from({ length: 18 }).map((_, i) => (
        <Sparkles
          key={i}
          className="absolute text-primary animate-float opacity-60 pointer-events-none"
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
        <div className="relative w-28 h-28 rounded-full bg-gradient-treasure flex items-center justify-center shadow-glow">
          <Trophy className="w-14 h-14 text-background" />
        </div>
      </div>

      <h1 className="mt-6 text-3xl font-black bg-gradient-treasure bg-clip-text text-transparent animate-scale-in">
        Caça ao Tesouro Concluída!
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Aqui está o teu resultado.
      </p>

      {/* Stats */}
      <div className="mt-6 w-full max-w-sm grid gap-3 animate-fade-in">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 shadow-card">
          <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs text-muted-foreground">Tempo total</div>
            <div className="text-lg font-bold">{formatDuration(duration)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-success/20 text-success flex items-center justify-center mb-2">
              <Check className="h-5 w-5" />
            </div>
            <div className="text-xs text-muted-foreground">Certas</div>
            <div className="text-2xl font-black text-success">{correct}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center mb-2">
              <X className="h-5 w-5" />
            </div>
            <div className="text-xs text-muted-foreground">Erradas</div>
            <div className="text-2xl font-black text-destructive">{wrong}</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Acertaste <span className="font-bold text-foreground">{correct}</span> de{" "}
          <span className="font-bold text-foreground">{total}</span> perguntas.
        </p>
      </div>

      <Button
        size="lg"
        onClick={() => go("ranking")}
        className="mt-6 h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"
      >
        <Medal className="mr-2 h-5 w-5" /> Ver Ranking
      </Button>
      <Button variant="ghost" onClick={resetProgress} className="mt-2 rounded-full">
        <RotateCcw className="mr-2 h-4 w-4" /> Jogar Novamente
      </Button>
    </div>
  );
};
