import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { GraduationCap, KeyRound, Loader2, UserRound } from "lucide-react";

// Generate a deterministic email-like identifier for class-code logins
const codeToEmail = (code: string, name: string) => {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "aluno";
  return `${slug}.${code.toLowerCase()}@treasurehunt.local`;
};

const codeToPassword = (code: string, name: string) =>
  `TH-${code.toUpperCase()}-${name.trim().toLowerCase().replace(/\s+/g, "-")}-v1`;

export const AuthScreen = () => {
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

      <Tabs defaultValue="student" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2 rounded-full h-12">
          <TabsTrigger value="student" className="rounded-full">
            <UserRound className="h-4 w-4 mr-2" /> Aluno
          </TabsTrigger>
          <TabsTrigger value="teacher" className="rounded-full">
            <GraduationCap className="h-4 w-4 mr-2" /> Professor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student">
          <StudentForm />
        </TabsContent>
        <TabsContent value="teacher">
          <TeacherForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StudentForm = () => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Preenche o teu nome e o código da turma");
      return;
    }
    setBusy(true);
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    // 1) Validate class code exists (public select policy)
    const { data: cls, error: clsErr } = await supabase
      .from("classes")
      .select("id, name")
      .eq("join_code", trimmedCode)
      .maybeSingle();
    if (clsErr || !cls) {
      setBusy(false);
      toast.error("Código de turma inválido");
      return;
    }

    const email = codeToEmail(trimmedCode, trimmedName);
    const password = codeToPassword(trimmedCode, trimmedName);

    // 2) Try to sign in; if it fails, sign up
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: trimmedName, role: "student" },
        },
      });
      if (signUpErr) {
        setBusy(false);
        toast.error("Não foi possível entrar", { description: signUpErr.message });
        return;
      }
    }

    // 3) Make sure membership exists
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("class_members")
        .upsert({ class_id: cls.id, student_id: user.id }, { onConflict: "class_id,student_id" });
    }

    setBusy(false);
    toast.success(`Bem-vindo à turma ${cls.name}!`);
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="space-y-2">
        <Label htmlFor="s-name">O teu nome</Label>
        <Input
          id="s-name"
          placeholder="Ex: Ana Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="h-12 rounded-2xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-code">Código da turma</Label>
        <Input
          id="s-code"
          placeholder="Ex: ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          className="h-12 rounded-2xl uppercase tracking-widest font-bold"
        />
        <p className="text-xs text-muted-foreground">Pede o código ao teu professor.</p>
      </div>
      <Button
        type="submit"
        disabled={busy}
        className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar como Aluno</>}
      </Button>
    </form>
  );
};

const TeacherForm = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const cleanEmail = (v: string) => v.trim().toLowerCase();

  const resendConfirmation = async (addr: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) toast.error("Não foi possível reenviar", { description: error.message });
    else toast.success("Email de confirmação reenviado");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = cleanEmail(email);
    if (!addr || !password) {
      toast.error("Preenche o email e a password");
      return;
    }
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: addr,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name.trim() || addr.split("@")[0], role: "teacher" },
        },
      });
      if (error) {
        setBusy(false);
        if (error.message.toLowerCase().includes("registered")) {
          toast.error("Já existe uma conta com este email", {
            description: "Muda para 'Entrar' e usa a tua password.",
          });
        } else {
          toast.error("Não foi possível registar", { description: error.message });
        }
        return;
      }
      // Try to sign in immediately (auto-confirm is on).
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: addr, password });
      setBusy(false);
      if (signInErr) {
        toast.success("Conta criada. Já podes entrar!");
        setMode("login");
      } else {
        toast.success("Bem-vindo!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      setBusy(false);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("not confirmed")) {
          toast.error("Email ainda não confirmado", {
            description: "Clica para reenviar o email de confirmação.",
            action: { label: "Reenviar", onClick: () => resendConfirmation(addr) },
          });
        } else if (msg.includes("invalid")) {
          toast.error("Email ou password incorretos", {
            description: "Verifica os dados ou regista-te se ainda não tens conta.",
          });
        } else {
          toast.error("Não foi possível entrar", { description: error.message });
        }
      }
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-card">
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="t-name">Nome</Label>
          <Input
            id="t-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prof. Silva"
            className="h-12 rounded-2xl"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="t-email">Email</Label>
        <Input
          id="t-email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prof@escola.pt"
          className="h-12 rounded-2xl lowercase"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="t-pass">Password</Label>
        <Input
          id="t-pass"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="h-12 rounded-2xl"
          required
          minLength={6}
        />
      </div>
      <Button
        type="submit"
        disabled={busy}
        className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-bold"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === "login" ? (
          <><KeyRound className="h-4 w-4 mr-2" /> Entrar como Professor</>
        ) : (
          "Criar conta de Professor"
        )}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="block w-full text-xs text-muted-foreground hover:text-primary transition"
      >
        {mode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entra"}
      </button>
    </form>
  );
};
