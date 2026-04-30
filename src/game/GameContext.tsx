import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";

export type Screen =
  | "home"
  | "map"
  | "scanner"
  | "quiz"
  | "final"
  | "ranking"
  | "about";

export type DBLocation = {
  id: string;
  class_id: string;
  name: string;
  hint: string | null;
  qr_code: string;
  lat: number;
  lng: number;
  order_index: number;
};

export type DBQuestion = {
  id: string;
  location_id: string;
  text: string;
  options: string[];
  correct_index: number;
  points: number;
  order_index: number;
};

export type DBClass = { id: string; teacher_id: string; name: string; join_code: string };

export type RunSummary = {
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  durationSeconds: number;
};

type GameState = {
  screen: Screen;
  classId: string | null;
  locations: DBLocation[];
  questions: Record<string, DBQuestion[]>;
  completedLocationIds: string[];
  currentLocationId: string | null;
  runId: string | null;
  totalPoints: number;
  loading: boolean;
  summary: RunSummary | null;
};

type GameCtx = GameState & {
  go: (s: Screen) => void;
  setActiveClass: (id: string) => Promise<void>;
  startRun: () => Promise<void>;
  finishRun: () => Promise<RunSummary | null>;
  recordAnswers: (
    locationId: string,
    answers: { question_id: string; selected_index: number }[],
  ) => Promise<void>;
  resetProgress: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<GameCtx | null>(null);
const ACTIVE_CLASS_KEY = "th-active-class";

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [classId, setClassId] = useState<string | null>(() => localStorage.getItem(ACTIVE_CLASS_KEY));
  const [locations, setLocations] = useState<DBLocation[]>([]);
  const [questions, setQuestions] = useState<Record<string, DBQuestion[]>>({});
  const [completedLocationIds, setCompletedLocationIds] = useState<string[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const go = (s: Screen) => setScreen(s);

  const loadClassData = useCallback(async (cId: string) => {
    setLoading(true);
    try {
      const { data: locs, error: locErr } = await supabase
        .from("locations")
        .select("*")
        .eq("class_id", cId)
        .order("order_index", { ascending: true });
      if (locErr) throw locErr;

      const list = ((locs ?? []) as DBLocation[]).slice(0, 5);
      setLocations(list);

      if (list.length > 0) {
        const { data: qs, error: qsErr } = await supabase
          .from("questions")
          .select("*")
          .in("location_id", list.map((l) => l.id))
          .order("order_index", { ascending: true });
        if (qsErr) throw qsErr;

        const grouped: Record<string, DBQuestion[]> = {};
        (qs ?? []).forEach((q: any) => {
          const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options ?? "[]");
          const item = { ...q, options: opts } as DBQuestion;
          if (!grouped[q.location_id]) grouped[q.location_id] = [item];
        });
        setQuestions(grouped);
      } else {
        setQuestions({});
      }
    } catch (error) {
      console.error("Erro ao carregar dados da turma:", error);
      toast.error("Não foi possível carregar a turma", {
        description: error instanceof Error ? error.message : undefined,
      });
      setLocations([]);
      setQuestions({});
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveRun = useCallback(async (cId: string) => {
    if (!user) return;

    try {
      const { data: runs, error: runsErr } = await supabase
        .from("runs")
        .select("id, total_points, finished_at")
        .eq("class_id", cId)
        .eq("student_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1);
      if (runsErr) throw runsErr;

      const active = runs?.find((r) => !r.finished_at);
      if (!active) {
        setRunId(null);
        setTotalPoints(0);
        setCompletedLocationIds([]);
        return;
      }

      const { data: ans, error: ansErr } = await supabase
        .from("answers")
        .select("question_id")
        .eq("run_id", active.id);
      if (ansErr) throw ansErr;

      const answeredQs = new Set((ans ?? []).map((a) => a.question_id));
      const done: string[] = [];
      Object.entries(questions).forEach(([locId, qs]) => {
        if (qs.length > 0 && qs.every((q) => answeredQs.has(q.id))) done.push(locId);
      });

      setRunId(active.id);
      setTotalPoints(active.total_points ?? 0);
      setCompletedLocationIds(done);
    } catch (error) {
      console.error("Erro ao carregar percurso:", error);
      toast.error("Erro ao carregar percurso", {
        description: error instanceof Error ? error.message : undefined,
      });
      setRunId(null);
      setTotalPoints(0);
      setCompletedLocationIds([]);
    }
  }, [user, questions]);

  const setActiveClass = async (id: string) => {
    localStorage.setItem(ACTIVE_CLASS_KEY, id);
    setClassId(id);
    await loadClassData(id);
    if (user) {
      await loadActiveRun(id);
    }
  };

  // Seleciona automaticamente a 1ª (única) turma do aluno
  useEffect(() => {
    if (!user || classId) return;
    (async () => {
      const { data } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("student_id", user.id)
        .limit(1);
      const cid = data?.[0]?.class_id;
      if (cid) {
        localStorage.setItem(ACTIVE_CLASS_KEY, cid);
        setClassId(cid);
      }
    })();
  }, [user, classId]);

  useEffect(() => {
    if (classId) {
      loadClassData(classId);
    }
  }, [classId, loadClassData]);

  useEffect(() => {
    if (classId && user?.id) {
      loadActiveRun(classId);
    }
  }, [classId, user?.id, questions, loadActiveRun]);

  // Inicia automaticamente uma run se ainda não existir
  useEffect(() => {
    if (!user || !classId || runId || loading) return;
    if (locations.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("runs")
        .insert({ student_id: user.id, class_id: classId, total_points: 0 })
        .select("id")
        .single();
      if (data) setRunId(data.id);
    })();
  }, [user, classId, runId, loading, locations.length]);

  const startRun = async () => {
    if (!user || !classId) return;

    try {
      const { data, error } = await supabase
        .from("runs")
        .insert({ student_id: user.id, class_id: classId, total_points: 0 })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Não foi possível criar o percurso");

      setRunId(data.id);
      setTotalPoints(0);
      setCompletedLocationIds([]);
      setSummary(null);
    } catch (error) {
      console.error("Erro ao iniciar percurso:", error);
      toast.error("Erro ao iniciar percurso", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const recordAnswers = async (
    locationId: string,
    answers: { question_id: string; selected_index: number }[],
  ) => {
    if (!user || !classId) return;

    try {
      let activeRunId = runId;
      if (!activeRunId) {
        const { data, error } = await supabase
          .from("runs")
          .insert({ student_id: user.id, class_id: classId, total_points: 0 })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("Não foi possível iniciar percurso");

        activeRunId = data.id;
        setRunId(activeRunId);
      }

      const locQs = questions[locationId] ?? [];
      let pointsEarned = 0;
      const rows = answers.map((a) => {
        const q = locQs.find((x) => x.id === a.question_id);
        const ok = !!q && q.correct_index === a.selected_index;
        const pts = ok ? q!.points : 0;
        pointsEarned += pts;
        return {
          run_id: activeRunId!,
          question_id: a.question_id,
          selected_index: a.selected_index,
          is_correct: ok,
          points_earned: pts,
        };
      });

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from("answers").insert(rows);
        if (insertError) throw insertError;
      }

      const newTotal = totalPoints + pointsEarned;
      setTotalPoints(newTotal);
      setCompletedLocationIds((prev) => Array.from(new Set([...prev, locationId])));

      const { error: updateError } = await supabase.from("runs").update({ total_points: newTotal }).eq("id", activeRunId);
      if (updateError) throw updateError;
    } catch (error) {
      console.error("Erro ao registar respostas:", error);
      toast.error("Não foi possível registar as respostas", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const finishRun = async (): Promise<RunSummary | null> => {
    if (!runId) return null;

    try {
      const startedRow = await supabase.from("runs").select("started_at").eq("id", runId).single();
      const startedAt = startedRow.data?.started_at ? new Date(startedRow.data.started_at) : new Date();
      const duration = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 1000));

      const { data: ans, error: ansErr } = await supabase
        .from("answers")
        .select("is_correct")
        .eq("run_id", runId);
      if (ansErr) throw ansErr;

      const totalAnswered = ans?.length ?? 0;
      const correct = (ans ?? []).filter((a) => a.is_correct).length;
      const wrong = totalAnswered - correct;

      const { error: updateError } = await supabase
        .from("runs")
        .update({ finished_at: new Date().toISOString(), duration_seconds: duration })
        .eq("id", runId);
      if (updateError) throw updateError;

      const result: RunSummary = {
        correctCount: correct,
        wrongCount: wrong,
        totalQuestions: totalAnswered,
        durationSeconds: duration,
      };
      setSummary(result);
      return result;
    } catch (error) {
      console.error("Erro ao finalizar percurso:", error);
      toast.error("Não foi possível finalizar o percurso", {
        description: error instanceof Error ? error.message : undefined,
      });
      return null;
    }
  };

  const resetProgress = async () => {
    if (!user || !classId) return;

    try {
      const { error } = await supabase
        .from("runs")
        .delete()
        .eq("student_id", user.id)
        .eq("class_id", classId)
        .is("finished_at", null);
      if (error) throw error;
      setRunId(null);
      setTotalPoints(0);
      setCompletedLocationIds([]);
      setSummary(null);
      toast.success("Progresso reposto");
    } catch (error) {
      console.error("Erro ao repor progresso:", error);
      toast.error("Não foi possível repor o progresso", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const reload = async () => {
    if (classId) {
      await loadClassData(classId);
      await loadActiveRun(classId);
    }
  };

  const currentLocationId = useMemo(() => {
    const next = locations.find((l) => !completedLocationIds.includes(l.id));
    return next?.id ?? null;
  }, [locations, completedLocationIds]);

  return (
    <Ctx.Provider
      value={{
        screen,
        classId,
        locations,
        questions,
        completedLocationIds,
        currentLocationId,
        runId,
        totalPoints,
        loading,
        summary,
        go,
        setActiveClass,
        startRun,
        finishRun,
        recordAnswers,
        resetProgress,
        reload,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useGame = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGame must be used within GameProvider");
  return c;
};
