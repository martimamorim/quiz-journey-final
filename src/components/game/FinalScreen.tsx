import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { Trophy, RotateCcw, Clock, Check, X, Loader2 } from "lucide-react";
import { vibrate } from "@/game/sound";
import { supabase } from "@/integrations/supabase/client";

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} min ${s.toString().padStart(2, "0")}s`;
};

type Detail = {
  question_text: string;
  location_name: string;
  selected_text: string;
  correct_text: string;
  is_correct: boolean;
};

export const FinalScreen = () => {
  const { resetProgress, summary, runId, locations, questions } = useGame();
  const [details, setDetails] = useState<Detail[] | null>(null);

  useEffect(() => {
    vibrate([100, 50, 100]);
  }, []);

  useEffect(() => {
    if (!runId) return;
    (async () => {
      const { data } = await supabase
        .from("answers")
        .select("question_id, selected_index, is_correct, answered_at")
        .eq("run_id", runId)
        .order("answered_at", { ascending: true });
      if (!data) return;
      const list: Detail[] = data.map((a) => {
        let q: any = null;
        let locName = "—";
        for (const loc of locations) {
          const found = (questions[loc.id] ?? []).find((x) => x.id === a.question_id);
          if (found) { q = found; locName = loc.name; break; }
        }
        return {
          question_text: q?.text ?? "Pergunta",
          location_name: locName,
          selected_text: q?.options?.[a.selected_index] ?? "—",
          correct_text: q?.options?.[q?.correct_index] ?? "—",
          is_correct: !!a.is_correct,
        };
      });
      setDetails(list);
    })();
  }, [runId, locations, questions]);

  const correct = summary?.correctCount ?? 0;
  const wrong = summary?.wrongCount ?? 0;
  const total = summary?.totalQuestions ?? correct + wrong;
  const duration = summary?.durationSeconds ?? 0;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/15 blur-2xl rounded-full" />
        <div className="relative w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center shadow-card">
          <Trophy className="w-9 h-9 text-primary" />
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-bold text-center">Caça ao tesouro concluída</h1>
      <p className="mt-1 text-sm text-muted-foreground text-center">Aqui está o teu resumo.</p>

      <div className="mt-6 w-full max-w-sm grid gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Tempo total</div>
            <div className="text-lg font-semibold">{formatDuration(duration)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="h-9 w-9 rounded-lg bg-success/15 text-success flex items-center justify-center mb-2">
              <Check className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">Certas</div>
            <div className="text-2xl font-bold text-success">{correct}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="h-9 w-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center mb-2">
              <X className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">Erradas</div>
            <div className="text-2xl font-bold text-destructive">{wrong}</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Acertaste <span className="font-semibold text-foreground">{correct}</span> de{" "}
          <span className="font-semibold text-foreground">{total}</span> perguntas.
        </p>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Revisão das respostas
        </h2>
        {details === null ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : details.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem respostas registadas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {details.map((d, i) => (
              <li
                key={i}
                className={`rounded-2xl border p-3 ${
                  d.is_correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center ${
                      d.is_correct ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {d.is_correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {d.location_name}
                    </div>
                    <div className="text-sm font-medium leading-snug">{d.question_text}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      A tua resposta:{" "}
                      <span className={d.is_correct ? "text-success font-medium" : "text-destructive font-medium"}>
                        {d.selected_text}
                      </span>
                    </div>
                    {!d.is_correct && (
                      <div className="text-xs text-muted-foreground">
                        Resposta certa:{" "}
                        <span className="text-success font-medium">{d.correct_text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button variant="outline" onClick={resetProgress} className="mt-8 rounded-full">
        <RotateCcw className="mr-2 h-4 w-4" /> Jogar novamente
      </Button>
    </div>
  );
};
