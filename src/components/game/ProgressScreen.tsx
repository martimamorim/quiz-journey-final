import { useGame } from "@/game/GameContext";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { Check, Lock, MapPin, RotateCcw, Trophy } from "lucide-react";

export const ProgressScreen = () => {
  const { completedLocationIds, currentLocationId, resetProgress, locations, totalPoints, go } = useGame();

  return (
    <div className="min-h-screen pb-32 p-5 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Trophy className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black leading-tight">Progresso</h2>
          <p className="text-xs text-muted-foreground">
            {completedLocationIds.length}/{locations.length} locais · {totalPoints} pontos
          </p>
        </div>
        <Button onClick={() => go("ranking")} variant="outline" size="sm" className="rounded-full">
          Ranking
        </Button>
      </header>

      <ProgressBar />

      {locations.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Esta turma ainda não tem locais.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {locations.map((loc, i) => {
            const isDone = completedLocationIds.includes(loc.id);
            const isCurrent = loc.id === currentLocationId;
            const isLocked = !isDone && !isCurrent;
            return (
              <li
                key={loc.id}
                className={`rounded-2xl border p-4 flex items-center gap-4 shadow-card transition-all ${
                  isCurrent ? "border-primary/60 bg-card animate-pulse-glow"
                  : isDone ? "border-success/40 bg-card/80"
                  : "border-border bg-card/50 opacity-70"
                }`}
              >
                <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center font-black ${
                  isDone ? "bg-success text-success-foreground"
                  : isCurrent ? "bg-gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="h-5 w-5" /> : isLocked ? <Lock className="h-5 w-5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{isLocked ? "???" : loc.name}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {isLocked ? "Bloqueado" : loc.hint || "—"}
                  </div>
                </div>
                {isCurrent && (
                  <Button size="sm" onClick={() => go("scanner")} className="rounded-full bg-gradient-primary text-primary-foreground">
                    Ir
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button
        variant="outline"
        onClick={() => { if (confirm("Repor todo o progresso?")) resetProgress(); }}
        className="rounded-full mt-2"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Repor progresso
      </Button>
    </div>
  );
};
