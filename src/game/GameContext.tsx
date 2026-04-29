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
  | "progress"
  | "help"
  | "ranking"
  | "teacher";

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
    const { data: locs } = await supabase
      .from("locations")
      .select("*")
      .eq("class_id", cId)
      .order("order_index", { ascending: true });
    // Hard cap at 5 locations on the client too.
    const list = ((locs ?? []) as DBLocation[]).slice(0, 5);
    setLocations(list);

    if (list.length > 0) {
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .in("location_id", list.map((l) => l.id))
        .order("order_index", { ascending: true });
      const grouped: Record<string, DBQuestion[]> = {};
      (qs ?? []).forEach((q: any) => {
        const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options ?? "[]");
        const item = { ...q, options: opts } as DBQuestion;
        // Only keep the first question per location.
        if (!grouped[q.location_id]) grouped[q.location_id] = [item];
      });
      setQuestions(grouped);
    } else {
      setQuestions({});
    }
    setLoading(false);
  }, []);

  const loadActiveRun = useCallback(async (cId: string) => {
    if (!user) return;
    const { data: runs } = await supabase
      .from("runs")
      .select("id, total_points, finished_at")
      .eq("class_id", cId)
      .eq("student_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1);
    const active = runs?.find((r) => !r.finished_at);
    if (active) {
      setRunId(active.id);
      setTotalPoints(active.total_points ?? 0);
      const { data: ans } = await supabase
        .from("answers")
        .select("question_id")
        .eq("run_id", active.id);
      const answeredQs = new Set((ans ?? []).map((a) => a.question_id));
      const done: string[] = [];
      Object.entries(questions).forEach(([locId, qs]) => {
        if (qs.length > 0 && qs.every((q) => answeredQs.has(q.id))) done.push(locId);
      });
      setCompletedLocationIds(done);
    } else {
      setRunId(null);
      setTotalPoints(0);
      setCompletedLocationIds([]);
    }
  }, [user, questions]);

  const setActiveClass = async (id: string) => {
    localStorage.setItem(ACTIVE_CLASS_KEY, id);
    setClassId(id);
    await loadClassData(id);
  };

  useEffect(() => {
    if (classId) loadClassData(classId);
  }, [classId, loadClassData]);

  useEffect(() => {
    if (classId && Object.keys(questions).length >= 0) {
      loadActiveRun(classId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, locations.length]);

  const startRun = async () => {
    if (!user || !classId) return;
    const { data, error } = await supabase
      .from("runs")
      .insert({ student_id: user.id, class_id: classId, total_points: 0 })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Erro ao iniciar percurso", { description: error?.message });
      return;
    }
    setRunId(data.id);
    setTotalPoints(0);
    setCompletedLocationIds([]);
    setSummary(null);
  };

  // SILENT recording: no toast, no immediate feedback to the student.
  const recordAnswers = async (
    locationId: string,
    answers: { question_id: string; selected_index: number }[],
  ) => {
    if (!user || !classId) return;

    let activeRunId = runId;
    if (!activeRunId) {
      const { data, error } = await supabase
        .from("runs")
        .insert({ student_id: user.id, class_id: classId, total_points: 0 })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Erro ao iniciar percurso");
        return;
      }
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

    if (rows.length > 0) await supabase.from("answers").insert(rows);

    const newTotal = totalPoints + pointsEarned;
    setTotalPoints(newTotal);
    setCompletedLocationIds((prev) => Array.from(new Set([...prev, locationId])));

    await supabase.from("runs").update({ total_points: newTotal }).eq("id", activeRunId);
  };

  const finishRun = async (): Promise<RunSummary | null> => {
    if (!runId) return null;
    const startedRow = await supabase.from("runs").select("started_at").eq("id", runId).single();
    const startedAt = startedRow.data?.started_at ? new Date(startedRow.data.started_at) : new Date();
    const duration = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 1000));

    // Compute correct/wrong totals from saved answers.
    const { data: ans } = await supabase
      .from("answers")
      .select("is_correct")
      .eq("run_id", runId);
    const totalAnswered = ans?.length ?? 0;
    const correct = (ans ?? []).filter((a) => a.is_correct).length;
    const wrong = totalAnswered - correct;

    await supabase
      .from("runs")
      .update({ finished_at: new Date().toISOString(), duration_seconds: duration })
      .eq("id", runId);

    const result: RunSummary = {
      correctCount: correct,
      wrongCount: wrong,
      totalQuestions: totalAnswered,
      durationSeconds: duration,
    };
    setSummary(result);
    return result;
  };

  const resetProgress = async () => {
    if (!user || !classId) return;
    await supabase
      .from("runs")
      .delete()
      .eq("student_id", user.id)
      .eq("class_id", classId)
      .is("finished_at", null);
    setRunId(null);
    setTotalPoints(0);
    setCompletedLocationIds([]);
    setSummary(null);
    toast.success("Progresso reposto");
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
