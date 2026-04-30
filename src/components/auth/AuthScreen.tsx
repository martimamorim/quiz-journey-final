import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";

const getDeviceId = () => {
  const KEY = "th-device-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36))
      .replace(/-/g, "")
      .slice(0, 16);
    localStorage.setItem(KEY, id);
  }
  return id;
};

const codeToEmail = (code: string, deviceId: string) =>
  `aluno-${deviceId}.${code.toLowerCase()}@treasurehunt.local`;

const codeToPassword = (code: string, deviceId: string) =>
  `TH-${code.toUpperCase()}-${deviceId}-v1`;

export const AuthScreen = () => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Insere o código da turma");
      return;
    }

    setBusy(true);

    try {
      const trimmedCode = code.trim().toUpperCase();
      const deviceId = getDeviceId();

      const { data: cls, error: clsErr } = await supabase
        .from("classes")
        .select("id, name")
        .eq("join_code", trimmedCode)
        .maybeSingle();
      if (clsErr || !cls) {
        toast.error("Código de turma inválido");
        return;
      }

      const email = codeToEmail(trimmedCode, deviceId);
      const password = codeToPassword(trimmedCode, deviceId);
      const displayName = `Aluno-${deviceId.slice(0, 4).toUpperCase()}`;

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        const canSignUp = signInErr.status === 400 || signInErr.status === 401 || /invalid login credentials/i.test(signInErr.message);
        if (!canSignUp) throw signInErr;

        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName, role: "student" },
          },
        });
        if (signUpErr) throw signUpErr;
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw userErr ?? new Error("Não foi possível obter o utilizador");
      }

      await supabase.from("class_members").upsert(
        { class_id: cls.id, student_id: userData.user.id },
        { onConflict: "class_id,student_id" },
      );

      toast.success(`Bem-vindo à turma ${cls.name}!`);
    } catch (error) {
      console.error("Erro de autenticação:", error);
      toast.error("Não foi possível entrar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 animate-fade-in">
      <div className="relative animate-float mb-6">
        <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
        <img
          src={logo}
          alt="Treasure Hunt School"
          className="relative w-28 h-28 rounded-2xl shadow-glow object-cover"
        />
      </div>
      <h1 className="text-3xl font-black bg-gradient-primary bg-clip-text text-transparent mb-1">
        Treasure Hunt School
      </h1>
      <p className="text-muted-foreground text-sm mb-6">Entra para começar a aventura</p>

      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card"
      >
        <div className="space-y-2">
          <Label htmlFor="s-code">Código da turma</Label>
          <Input
            id="s-code"
            placeholder="Ex: ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="h-12 rounded-2xl uppercase tracking-widest font-bold text-center"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">Pede o código ao teu professor.</p>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </div>
  );
};
