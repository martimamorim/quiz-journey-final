import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/AuthProvider";
import { useGame } from "@/game/GameContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { LogOut, Play, RefreshCw, GraduationCap, ListChecks, Plus, Trophy } from "lucide-react";

export const HomeScreen = () => {
  const { user, profile, role, signOut } = useAuth();
  const { go, classId, setActiveClass, locations, completedLocationIds, totalPoints } = useGame();
  const [classes, setClasses] = useState<{ id: string; name: string; join_code: string }[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  const loadClasses = async () => {
    if (!user) return;
    setLoadingClasses(true);
    let q;
    if (role === "teacher") {
      q = supabase.from("classes").select("id, name, join_code").eq("teacher_id", user.id);
    } else {
      const { data: members } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("student_id", user.id);
      const ids = (members ?? []).map((m) => m.class_id);
      if (ids.length === 0) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }
      q = supabase.from("classes").select("id, name, join_code").in("id", ids);
    }
    const { data } = await q;
    setClasses(data ?? []);
    setLoadingClasses(false);
  };

  useEffect(() => { loadClasses(); /* eslint-disable-next-line */ }, [user, role]);

  const joinClass = async () => {
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    const { data: cls } = await supabase
      .from("classes").select("id, name").eq("join_code", code).maybeSingle();
    if (!cls) return toast.error("Código inválido");
    const { error } = await supabase
      .from("class_members")
      .upsert({ class_id: cls.id, student_id: user.id }, { onConflict: "class_id,student_id" });
    if (error) return toast.error(error.message);
    toast.success(`Entraste na turma ${cls.name}`);
    setJoinCode("");
    await loadClasses();
    await setActiveClass(cls.id);
  };

  const activeClass = classes.find((c) => c.id === classId);

  return (
    <div className="min-h-screen p-5 pb-32 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <img src={logo} alt="" className="h-14 w-14 rounded-2xl shadow-glow" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Bem-vindo, {role === "teacher" ? "Professor" : "Aluno"}
          </div>
          <div className="font-black text-lg truncate">{profile?.display_name}</div>
        </div>
        <Button onClick={signOut} variant="ghost" size="icon" className="rounded-full">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {role === "teacher" && (
        <Button
          onClick={() => go("teacher")}
          className="h-14 rounded-2xl bg-gradient-primary text-primary-foreground font-bold shadow-glow"
        >
          <GraduationCap className="h-5 w-5 mr-2" /> Painel do Professor
        </Button>
      )}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" /> As tuas turmas
          </h3>
          <Button onClick={loadClasses} size="icon" variant="ghost" className="h-8 w-8 rounded-full">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {loadingClasses ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {role === "teacher" ? "Cria a tua primeira turma no painel." : "Ainda não estás em nenhuma turma."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classes.map((c) => (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${
                  c.id === classId ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Código: <span className="font-mono">{c.join_code}</span></div>
                </div>
                <Button size="sm" variant={c.id === classId ? "default" : "outline"} onClick={() => setActiveClass(c.id)} className="rounded-full">
                  {c.id === classId ? "Ativa" : "Selecionar"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {role === "student" && (
          <div className="mt-4 flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs" htmlFor="join">Entrar noutra turma</Label>
              <Input
                id="join"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                className="h-10 rounded-full uppercase tracking-widest font-bold"
              />
            </div>
            <Button onClick={joinClass} className="self-end rounded-full">
              <Plus className="h-4 w-4 mr-1" /> Entrar
            </Button>
          </div>
        )}
      </section>

      {activeClass && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Turma ativa</div>
          <div className="mt-1 text-xl font-black">{activeClass.name}</div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{locations.length} locais</span>
            <span>{completedLocationIds.length} feitos</span>
            <span className="flex items-center gap-1"><Trophy className="h-3 w-3" /> {totalPoints} pts</span>
          </div>

          {role === "student" && locations.length > 0 && (
            <Button
              onClick={() => go("map")}
              size="lg"
              className="mt-4 w-full h-14 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"
            >
              <Play className="h-5 w-5 mr-2" /> {completedLocationIds.length > 0 ? "Continuar" : "Começar"}
            </Button>
          )}
          {role === "teacher" && (
            <Button onClick={() => go("map")} variant="outline" className="mt-4 w-full h-12 rounded-full">
              Ver mapa
            </Button>
          )}
        </section>
      )}
    </div>
  );
};
