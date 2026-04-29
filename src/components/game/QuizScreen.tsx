import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { ArrowLeft, Brain, Check, X, Trophy } from "lucide-react";
import { playCorrect, playWrong, vibrate } from "@/game/sound";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const QuizScreen = () => {
  const { go, currentLocationId, locations, questions, recordAnswers, finishRun } = useGame();
  const loc = locations.find((l) => l.id === currentLocationId);
  const qs = useMemo(() => (loc ? questions[loc.id] ?? [] : []), [loc, questions]);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [answers, setAnswers] = useState<{ question_id: string; selected_index: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!loc) {
    return (
      <div className="min-h-screen p-5 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Sem local ativo.</p>
        <Button onClick={() => go("map")} className="mt-4 rounded-full">Voltar</Button>
      </div>
    );
  }

  if (qs.length === 0) {
    return (
      <div className="min-h-screen p-5 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">Este local ainda não tem perguntas.</p>
        <Button onClick={() => go("map")} className="mt-4 rounded-full">Voltar ao mapa</Button>
      </div>
    );
  }

  const q = qs[step];

  const submit = async () => {
    if (selected === null) return;
    const isCorrect = selected === q.correct_index;
    if (isCorrect) {
      setStatus("correct");
      playCorrect();
      vibrate([60, 50, 60]);
    } else {
      setStatus("wrong");
      playWrong();
      vibrate(200);
    }

    const newAnswers = [...answers, { question_id: q.id, selected_index: selected }];
    setAnswers(newAnswers);

    setTimeout(async () => {
      if (step + 1 < qs.length) {
        setStep(step + 1);
        setSelected(null);
        setStatus("idle");
      } else {
        // Submit all
        setSubmitting(true);
        const { correctCount, pointsEarned } = await recordAnswers(loc.id, newAnswers);
        toast.success(`+${pointsEarned} pontos`, {
          description: `Acertaste ${correctCount} de ${qs.length}`,
        });
        // Check if last location
        const idx = locations.findIndex((l) => l.id === loc.id);
        const isLast = idx === locations.length - 1;
        if (isLast) {
          await finishRun();
          go("final");
        } else {
          go("map");
        }
      }
    }, 1100);
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
          <div className="font-bold flex items-center gap-2">
            Pergunta {step + 1} de {qs.length}
            <span className="text-xs text-primary flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {q.points} pts
            </span>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="mt-4 flex gap-1.5">
        {qs.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-success" : i === step ? "bg-primary" : "bg-secondary",
            )}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="mt-5 text-2xl font-bold leading-tight max-w-md">{q.text}</h2>
      </div>

      <div className="mt-8 grid gap-3">
        {q.options.map((opt, i) => {
          const isSel = selected === i;
          const isCorrect = status !== "idle" && i === q.correct_index;
          const isWrong = status === "wrong" && isSel;
          return (
            <button
              key={i}
              disabled={status !== "idle" || submitting}
              onClick={() => setSelected(i)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all font-medium",
                "bg-card border-border hover:border-primary/60",
                isSel && status === "idle" && "border-primary bg-primary/10",
                isCorrect && "border-success bg-success/20 animate-bounce-in",
                isWrong && "border-destructive bg-destructive/20 animate-shake",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span>{opt}</span>
                {isCorrect && <Check className="h-5 w-5 text-success" />}
                {isWrong && <X className="h-5 w-5 text-destructive" />}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        size="lg"
        onClick={submit}
        disabled={selected === null || status !== "idle" || submitting}
        className="mt-auto h-14 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow disabled:opacity-50"
      >
        {step + 1 === qs.length ? "Finalizar local" : "Próxima pergunta"}
      </Button>
    </div>
  );
};
