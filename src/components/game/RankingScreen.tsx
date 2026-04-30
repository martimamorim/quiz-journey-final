import { useEffect, useState } from "react";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, Loader2, Clock, Star } from "lucide-react";

type Row = {
  run_id: string;
  student_id: string;
  display_name: string;
  total_points: number;
  duration_seconds: number;
  finished_at: string;
};

const formatDuration = (s: number) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
};

const Podium = ({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) => {
  if (rows.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">
        Ainda ninguém terminou. Sê o primeiro!
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2 mt-4">
      {rows.map((r, i) => {
        const isMe = r.student_id === currentUserId;
        const medal =
          i === 0 ? <Crown className="h-5 w-5 text-primary" />
          : i === 1 ? <Medal className="h-5 w-5 text-muted-foreground" />
          : i === 2 ? <Medal className="h-5 w-5 text-accent" />
          : <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
        return (
          <li
            key={r.run_id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              isMe ? "border-primary bg-primary/10" : "border-border bg-card"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">{medal}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{r.display_name}{isMe && " (tu)"}</div>
              <div className="text-xs text-muted-foreground flex gap-3">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(r.duration_seconds)}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3" />{r.total_points} pts</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export const RankingScreen = () => {
  const { classId } = useGame();
  const { user } = useAuth();
  const [classRows, setClassRows] = useState<Row[]>([]);
  const [globalRows, setGlobalRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fetchRuns = async (filterClass?: string) => {
        let q = supabase
          .from("runs")
          .select("id, student_id, total_points, duration_seconds, finished_at, class_id")
          .not("finished_at", "is", null)
          .order("total_points", { ascending: false })
          .order("duration_seconds", { ascending: true })
          .limit(20);
        if (filterClass) q = q.eq("class_id", filterClass);
        const { data } = await q;
        const list = data ?? [];
        if (list.length === 0) return [];
        const ids = Array.from(new Set(list.map((r: any) => r.student_id)));
        const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.display_name]));
        return list.map((r: any) => ({
          run_id: r.id,
          student_id: r.student_id,
          total_points: r.total_points,
          duration_seconds: r.duration_seconds ?? 0,
          finished_at: r.finished_at,
          display_name: nameMap.get(r.student_id) ?? "Anónimo",
        }));
      };
      const [c, g] = await Promise.all([
        classId ? fetchRuns(classId) : Promise.resolve([]),
        fetchRuns(),
      ]);
      setClassRows(c);
      setGlobalRows(g);
      setLoading(false);
    };
    load();
  }, [classId]);

  return (
    <div className="min-h-screen pb-32 p-5 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-secondary border border-border flex items-center justify-center">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold leading-tight">Ranking</h2>
          <p className="text-xs text-muted-foreground">Mais pontos · menos tempo</p>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> A carregar…
        </div>
      ) : (
        <Tabs defaultValue="class">
          <TabsList className="w-full grid grid-cols-2 rounded-full h-11">
            <TabsTrigger value="class" className="rounded-full">Turma</TabsTrigger>
            <TabsTrigger value="global" className="rounded-full">Global</TabsTrigger>
          </TabsList>
          <TabsContent value="class">
            <Podium rows={classRows} currentUserId={user?.id ?? ""} />
          </TabsContent>
          <TabsContent value="global">
            <Podium rows={globalRows} currentUserId={user?.id ?? ""} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
