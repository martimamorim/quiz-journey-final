import { useGame, Screen } from "@/game/GameContext";
import { Map, Trophy, HelpCircle, QrCode, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { screen: Screen; label: string; icon: React.ComponentType<{ className?: string }> };

const LEFT: Item[] = [
  { screen: "home", label: "Início", icon: Home },
  { screen: "map", label: "Mapa", icon: Map },
];
const RIGHT: Item[] = [
  { screen: "ranking", label: "Ranking", icon: Trophy },
  { screen: "help", label: "Ajuda", icon: HelpCircle },
];

export const BottomNav = () => {
  const { screen, go } = useGame();

  return (
    <nav aria-label="Navegação principal" className="fixed bottom-0 inset-x-0 z-[1000] mx-auto max-w-md">
      <div className="relative mx-3 mb-3 rounded-3xl border border-border bg-card/90 backdrop-blur-xl shadow-card">
        <div className="flex items-end justify-around h-20 px-2 pb-2 pt-2">
          {LEFT.map((it) => (
            <NavButton key={it.screen} item={it} active={screen === it.screen} onClick={() => go(it.screen)} />
          ))}
          <button
            onClick={() => go("scanner")}
            aria-label="Digitalizar QR Code"
            className={cn(
              "relative -mt-10 h-16 w-16 shrink-0 rounded-full bg-gradient-primary text-primary-foreground shadow-glow flex items-center justify-center transition-transform active:scale-95 mx-2",
              screen === "scanner" && "ring-4 ring-primary/40 animate-pulse-glow",
            )}
          >
            <QrCode className="h-7 w-7" />
          </button>
          {RIGHT.map((it) => (
            <NavButton key={it.screen} item={it} active={screen === it.screen} onClick={() => go(it.screen)} />
          ))}
        </div>
      </div>
    </nav>
  );
};

const NavButton = ({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
    </button>
  );
};
