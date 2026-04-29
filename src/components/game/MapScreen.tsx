import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { useGeolocation } from "@/game/useGeolocation";
import { ProgressBar } from "./ProgressBar";
import { Crosshair, Loader2, MapPin, QrCode, AlertTriangle, Trophy } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [41.3736, -8.2956]; // Vizela, Portugal

const makeIcon = (html: string) =>
  L.divIcon({ className: "th-marker", html, iconSize: [36, 36], iconAnchor: [18, 18] });

const userIcon = makeIcon(
  `<div style="width:22px;height:22px;border-radius:9999px;background:hsl(210 100% 56%);border:3px solid white;box-shadow:0 0 0 4px hsl(210 100% 56% / 0.35), 0 0 20px hsl(210 100% 56% / 0.7);"></div>`,
);

const locIcon = (variant: "current" | "done" | "locked") => {
  const bg =
    variant === "current"
      ? "linear-gradient(135deg,hsl(210 100% 56%),hsl(195 100% 60%))"
      : variant === "done"
      ? "hsl(142 76% 50%)"
      : "hsl(217 33% 30%)";
  const pulse =
    variant === "current"
      ? "box-shadow:0 0 0 6px hsl(210 100% 56% / 0.25), 0 0 25px hsl(195 100% 60% / 0.7);"
      : "box-shadow:0 4px 12px rgba(0,0,0,.4);";
  return makeIcon(
    `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${bg};border:3px solid white;${pulse}color:white;font-weight:700;font-size:14px;">★</div>`,
  );
};

const MapRefBridge = ({ onReady }: { onReady: (m: L.Map) => void }) => {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
};

export const MapScreen = () => {
  const { go, completedLocationIds, currentLocationId, locations } = useGame();
  const { position, error, loading } = useGeolocation(true);
  const next = locations.find((l) => l.id === currentLocationId);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  // Sempre arrancar centrado em Vizela; o auto-follow move depois para o GPS.
  const center = DEFAULT_CENTER;

  useEffect(() => {
    if (!mapInstance || !position || !autoFollow) return;
    mapInstance.setView([position.lat, position.lng], mapInstance.getZoom() || 18, { animate: true });
  }, [mapInstance, position, autoFollow]);

  return (
    <div className="min-h-screen pb-32 flex flex-col gap-4 animate-fade-in">
      <header className="px-5 pt-5">
        <h2 className="text-2xl font-black">Mapa da Escola</h2>
        <p className="text-sm text-muted-foreground">Localização em tempo real e pontos do tesouro</p>
      </header>

      <div className="px-5"><ProgressBar /></div>

      <div className="px-5">
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-card bg-card h-[55vh] min-h-[340px]">
          <MapContainer center={center} zoom={18} scrollWheelZoom className="h-full w-full" zoomControl={false}>
            <MapRefBridge onReady={setMapInstance} />
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
            {position && (
              <>
                <Marker position={[position.lat, position.lng]} icon={userIcon}>
                  <Popup>Tu estás aqui</Popup>
                </Marker>
                <Circle
                  center={[position.lat, position.lng]}
                  radius={position.accuracy}
                  pathOptions={{ color: "hsl(210 100% 56%)", fillColor: "hsl(210 100% 56%)", fillOpacity: 0.1, weight: 1 }}
                />
              </>
            )}
            {locations.map((loc) => {
              const isDone = completedLocationIds.includes(loc.id);
              const isCurrent = loc.id === currentLocationId;
              const variant = isCurrent ? "current" : isDone ? "done" : "locked";
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={locIcon(variant)}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold">{loc.name}</div>
                      <div className="text-xs opacity-70">{loc.hint}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="absolute top-3 left-3 z-[400] rounded-full bg-card/90 backdrop-blur px-3 py-1.5 text-xs flex items-center gap-2 border border-border shadow-card">
            {loading && !position ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> A obter GPS…</>
            ) : error ? (
              <><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> GPS indisponível</>
            ) : position ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                GPS ativo · ±{Math.round(position.accuracy)}m
              </>
            ) : null}
          </div>

          {position && mapInstance && (
            <button
              onClick={() => {
                setAutoFollow(true);
                mapInstance.setView([position.lat, position.lng], 19, { animate: true });
              }}
              className="absolute bottom-3 right-3 z-[400] h-11 w-11 rounded-full bg-card/95 backdrop-blur border border-border shadow-card flex items-center justify-center text-primary active:scale-95 transition"
              aria-label="Centrar"
            >
              <Crosshair className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {next ? (
        <div className="mx-5 rounded-2xl bg-card border border-border p-5 shadow-card animate-scale-in">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Próximo destino
          </div>
          <div className="mt-1 text-xl font-bold">{next.name}</div>
          {next.hint && <p className="mt-2 text-sm text-muted-foreground">{next.hint}</p>}
          <Button
            size="lg"
            onClick={() => go("scanner")}
            className="mt-4 w-full h-14 rounded-full bg-gradient-primary text-primary-foreground font-bold shadow-glow"
          >
            <QrCode className="mr-2 h-5 w-5" /> Digitalizar QR Code
          </Button>
        </div>
      ) : locations.length > 0 ? (
        <div className="mx-5 rounded-2xl bg-card border border-success/40 p-5 shadow-card text-center">
          <Trophy className="h-10 w-10 text-success mx-auto" />
          <div className="mt-2 font-bold">Completaste todos os locais!</div>
          <Button onClick={() => go("final")} className="mt-3 rounded-full bg-gradient-primary text-primary-foreground">
            Ver tesouro
          </Button>
        </div>
      ) : (
        <div className="mx-5 rounded-2xl bg-card border border-border p-5 text-center text-muted-foreground text-sm">
          Esta turma ainda não tem locais. Pede ao professor para os adicionar.
        </div>
      )}
    </div>
  );
};
