import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { ArrowLeft, QrCode, AlertCircle, Sparkles } from "lucide-react";
import { playScan, vibrate } from "@/game/sound";
import { toast } from "sonner";

export const ScannerScreen = () => {
  const { go, currentLocationId, locations } = useGame();
  const containerId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const target = locations.find((l) => l.id === currentLocationId);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      const state = s.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await s.stop();
      }
      try { s.clear(); } catch { /* noop */ }
    } catch { /* noop */ }
    scannerRef.current = null;
  };

  useEffect(() => {
    if (!target) {
      setStarting(false);
      return;
    }
    stoppedRef.current = false;

    const start = async () => {
      try {
        const html5Qr = new Html5Qrcode(containerId, /* verbose */ false);
        scannerRef.current = html5Qr;
        await html5Qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (stoppedRef.current) return;
            const value = decoded.trim();
            if (target && value === target.qr_code) {
              stoppedRef.current = true;
              playScan();
              vibrate(80);
              stopScanner().finally(() => go("quiz"));
            } else {
              toast.error("QR errado", { description: "Este não é o código deste local." });
            }
          },
          () => { /* per-frame errors silenced */ },
        );
        setStarting(false);
      } catch {
        setError("Não foi possível aceder à câmara. Verifica as permissões ou usa o botão de simulação.");
        setStarting(false);
      }
    };
    start();

    return () => {
      stoppedRef.current = true;
      stopScanner();
    };
  }, [currentLocationId, go, target]);

  const simulateScan = () => {
    if (!target) {
      toast.error("Sem local ativo", { description: "Volta ao mapa." });
      return;
    }
    stoppedRef.current = true;
    playScan();
    vibrate(80);
    stopScanner().finally(() => go("quiz"));
  };

  return (
    <div className="min-h-screen flex flex-col p-5 pb-32 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => go("map")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">A procurar</div>
          <div className="font-bold truncate">{target?.name ?? "Sem local ativo"}</div>
        </div>
      </div>

      <div className="mt-6 relative aspect-square w-full max-w-md mx-auto rounded-3xl overflow-hidden border border-border bg-black shadow-card">
        <div id={containerId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-2/3 aspect-square">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>
        </div>
        {!target && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/80 gap-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Não tens nenhum local ativo. Volta ao mapa.</p>
          </div>
        )}
        {target && starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-black/60">
            A iniciar câmara…
          </div>
        )}
        {target && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/80 gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <QrCode className="h-4 w-4" /> Aponta a câmara ao QR code do local
      </p>

      <Button
        variant="outline"
        onClick={simulateScan}
        disabled={!target}
        className="mt-4 rounded-full border-primary/40 text-primary"
      >
        <Sparkles className="h-4 w-4 mr-2" /> Simular leitura (demo)
      </Button>
    </div>
  );
};
