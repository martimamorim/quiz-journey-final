import { Compass, MapPin, QrCode, Brain, Trophy, Heart } from "lucide-react";

const STEPS = [
  { icon: MapPin, title: "Vai até ao local", text: "Segue as pistas no mapa para encontrar cada ponto." },
  { icon: QrCode, title: "Digitaliza o QR", text: "Aponta a câmara ao QR code do local." },
  { icon: Brain, title: "Responde à pergunta", text: "Há uma pergunta por local. O resultado só aparece no fim." },
  { icon: Trophy, title: "Sobe no ranking", text: "Mais pontos e menos tempo = melhor posição." },
];

export const AboutScreen = () => {
  return (
    <div className="min-h-screen pb-32 p-5 flex flex-col gap-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-secondary border border-border flex items-center justify-center">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold leading-tight">Sobre nós</h2>
          <p className="text-xs text-muted-foreground">Treasure Hunt School</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-2">O projeto</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Uma caça ao tesouro digital criada na <span className="text-foreground font-medium">Escola
          Profissional Oficina · Santo Tirso</span>. Os alunos exploram a escola,
          descobrem locais com QR codes e respondem a perguntas para somar pontos.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Como funciona</h3>
        <div className="flex flex-col gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{i + 1}. {s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
        <Heart className="h-5 w-5 text-primary" />
        <p className="text-xs text-muted-foreground">
          Feito com dedicação para alunos e professores. Boa caça ao tesouro!
        </p>
      </section>
    </div>
  );
};
