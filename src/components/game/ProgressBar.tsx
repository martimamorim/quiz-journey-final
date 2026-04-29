import { useGame } from "@/game/GameContext";

export const ProgressBar = () => {
  const { completedLocationIds, locations, totalPoints } = useGame();
  const total = locations.length;
  const done = completedLocationIds.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span className="font-semibold tracking-wider uppercase">Progresso</span>
        <span>
          {done}/{total} locais · {totalPoints} pts
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-primary transition-all duration-500 shadow-glow"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
