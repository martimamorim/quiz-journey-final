import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { useAuth } from "@/auth/AuthProvider";
import { HelpCircle, QrCode, MapPin, Brain, Trophy, Mail, ChevronRight, LogOut } from "lucide-react";

const STEPS = [
  { icon: MapPin, title: "Vai até ao local", text: "Segue as pistas no mapa para encontrar cada ponto." },
  { icon: QrCode, title: "Digitaliza o QR", text: "Toca no botão central e aponta a câmara ao QR code." },
  { icon: Brain, title: "Responde à pergunta", text: "Há 1 pergunta por local. O resultado só aparece no final." },
  { icon: Trophy, title: "Sobe no ranking", text: "Quanto mais rápido e mais pontos, melhor a tua posição." },
];

const FAQ = [
  { q: "O GPS não funciona, e agora?", a: "Verifica se ativaste a permissão de localização no telemóvel e se estás ao ar livre." },
  { q: "A câmara não abre.", a: "Permite o acesso à câmara nas definições do navegador. Em alternativa usa 'Simular leitura'." },
  { q: "Posso continuar mais tarde?", a: "Sim! O progresso é guardado na tua conta automaticamente." },
];

export const HelpScreen = () => {
  const { go } = useGame();
  const { signOut, profile, role } = useAuth();

  return (
    <div className="min-h-screen pb-32 p-5 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <HelpCircle className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black leading-tight">Ajuda</h2>
          <p className="text-xs text-muted-foreground truncate">
            {profile?.display_name} · {role === "teacher" ? "Professor" : "Aluno"}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Como jogar</h3>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{i + 1}. {s.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.text}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">FAQ</h3>
        {FAQ.map((f, i) => (
          <details key={i} className="group rounded-2xl border border-border bg-card p-4 shadow-card">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 font-semibold text-sm">
              {f.q}
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <div className="flex-1 text-xs">
          <div className="font-bold text-sm">Precisas de ajuda?</div>
          <div className="text-muted-foreground">Fala com o teu professor.</div>
        </div>
      </section>

      <Button onClick={() => go("home")} className="rounded-full h-12 bg-gradient-primary text-primary-foreground font-bold">
        Voltar
      </Button>
      <Button onClick={signOut} variant="outline" className="rounded-full h-12">
        <LogOut className="h-4 w-4 mr-2" /> Sair
      </Button>
    </div>
  );
};
