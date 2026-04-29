import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { ArrowLeft, Brain } from "lucide-react";
import { vibrate } from "@/game/sound";
import { cn } from "@/lib/utils";

export const QuizScreen = () => {
  const { go, currentLocationId, locations, questions, recordAnswers, finishRun, completedLocationIds } = useGame();
  const loc = locations.find((l) => l.id === currentLocationId);
  // Only 1 question per location.
  const qs = useMemo(() => (loc ? (questions[loc.id] ?? []).slice(0, 1) : []), [loc, questions]);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loc) {
    const allDone = locations.length > 0 && completedLocationIds.length >= locations.length;
    return (
      <div className="min-h-screen p-5 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
        <Brain className="h-10 w-10 text-primary" />
        <p className="text-muted-foreground">
          {allDone ? "Já completaste todos os locais." : "Sem local ativo."}
        </p>
        <Button onClick={() => go(allDone ? "final" : "map")} className="rounded-full">
          {allDone ? "Ver resultado" : "Voltar ao mapa"}
        </Button>
      </div>
    );
  }

  if (qs.length === 0) {
    return (
      <div className="min-h-screen p-5 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">Este local ainda não tem pergunta.</p>
        <Button onClick={() => go("map")} className="mt-4 rounded-full">Voltar ao mapa</Button>
      </div>
    );
  }

  const q = qs[0];

  const submit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    vibrate(50);

    // Save answer silently — student does NOT see if correct or wrong.
    await recordAnswers(loc.id, [{ question_id: q.id, selected_index: selected }]);

    // If this was the last location, finish the run and go to the final screen.
    const idx = locations.findIndex((l) => l.id === loc.id);
    const isLast = idx === locations.length - 1;
    if (isLast) {
      await finishRun();
      go("final");
    } else {
      go("map");
    }
  };

  return (
    <div className="min-h-screen p-5 flex flex-col animate-fade-in pb-32">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => go("map")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            {loc.name}
          </div>
          <div className="font-bold">Pergunta</div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="mt-5 text-2xl font-bold leading-tight max-w-md">{q.text}</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Escolhe a tua resposta. O resultado só aparece no final.
        </p>
      </div>

      <div className="mt-8 grid gap-3">
        {q.options.map((opt, i) => {
          const isSel = selected === i;
          return (
            <button
              key={i}
              disabled={submitting}
              onClick={() => setSelected(i)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all font-medium",
                "bg-card border-border hover:border-primary/60",
                isSel && "border-primary bg-primary/10",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <Button
        size="lg"
        onClick={submit}
        disabled={selected === null || submitting}
        className="mt-auto h-14 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow disabled:opacity-50"
      >
        Confirmar resposta
      </Button>
    </div>
  );
};
