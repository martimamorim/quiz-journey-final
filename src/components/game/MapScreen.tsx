import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { useGame } from "@/game/GameContext";
import { useGeolocation } from "@/game/useGeolocation";
import { ProgressBar } from "./ProgressBar";
import { Crosshair, Loader2, MapPin, QrCode, AlertTriangle, Trophy, School } from "lucide-react";

// Escola Profissional Oficina – Santo Tirso
const SCHOOL: [number, number] = [41.3438, -8.4782];

const makeIcon = (html: string, size = 36) =>
  L.divIcon({ className: "th-marker", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const userIcon = makeIcon(
  `<div style="width:22px;height:22px;border-radius:9999px;background:hsl(210 100% 56%);border:3px solid white;box-shadow:0 0 0 4px hsl(210 100% 56% / 0.35), 0 0 20px hsl(210 100% 56% / 0.7);"></div>`,
);

const schoolIcon = makeIcon(
  `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:hsl(45 100% 60%);border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,.5);color:hsl(222 47% 6%);font-weight:900;font-size:18px;">🏫</div>`,
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
  const glyph = variant === "done" ? "✓" : "★";
  return makeIcon(
    `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${bg};border:3px solid white;${pulse}color:white;font-weight:700;font-size:14px;">${glyph}</div>`,
  );
};

const MapBridge = ({
  onReady,
  onUserInteract,
}: {
  onReady: (m: L.Map) => void;
  onUserInteract: () => void;
}) => {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    // Force a relayout in case the container size changed.
    setTimeout(() => map.invalidateSize(), 100);
  }, [map, onReady]);
  useMapEvents({
    dragstart: onUserInteract,
    zoomstart: (e) => {
      // Only count user-driven zooms.
      // @ts-expect-error leaflet event has originalEvent on user gestures
      if (e.originalEvent) onUserInteract();
    },
  });
  return null;
};

export const MapScreen = () => {
  const { go, completedLocationIds, currentLocationId, locations } = useGame();
  const { position, error, loading } = useGeolocation(true);
  const next = locations.find((l) => l.id === currentLocationId);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const didInitialFitRef = useRef(false);

  const handleUserInteract = useCallback(() => setAutoFollow(false), []);

  // Initial fit: include school + all locations once the map is ready.
  useEffect(() => {
    if (!mapInstance || didInitialFitRef.current) return;
    const points: L.LatLngExpression[] = [SCHOOL, ...locations.map((l) => [l.lat, l.lng] as [number, number])];
    if (points.length > 1) {
      mapInstance.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 19 });
    } else {
      mapInstance.setView(SCHOOL, 18);
    }
    didInitialFitRef.current = true;
  }, [mapInstance, locations]);

  // Follow GPS when enabled.
  useEffect(() => {
    if (!mapInstance || !position || !autoFollow) return;
    mapInstance.setView([position.lat, position.lng], Math.max(mapInstance.getZoom(), 18), { animate: true });
  }, [mapInstance, position, autoFollow]);

  const recenter = () => {
    if (!mapInstance) return;
    setAutoFollow(true);
    if (position) {
      mapInstance.setView([position.lat, position.lng], 19, { animate: true });
    } else {
      mapInstance.setView(SCHOOL, 18, { animate: true });
    }
  };

  const headerStatus = useMemo(() => {
    if (loading && !position) {
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> A obter GPS…
        </>
      );
    }
    if (error && !position) {
      return (
        <>
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> GPS indisponível
        </>
      );
    }
    if (position) {
      return (
        <>
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          GPS ativo · ±{Math.round(position.accuracy)}m
        </>
      );
    }
    return null;
  }, [loading, error, position]);

  return (
    <div className="min-h-screen pb-32 flex flex-col gap-4 animate-fade-in">
      <header className="px-5 pt-5">
        <h2 className="text-2xl font-black">Mapa da Escola</h2>
        <p className="text-sm text-muted-foreground">Escola Profissional Oficina · Santo Tirso</p>
      </header>

      <div className="px-5"><ProgressBar /></div>

      <div className="px-5">
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-card bg-card h-[55vh] min-h-[340px]">
          <MapContainer
            center={SCHOOL}
            zoom={18}
            scrollWheelZoom
            className="h-full w-full"
            zoomControl={false}
            preferCanvas
          >
            <MapBridge onReady={setMapInstance} onUserInteract={handleUserInteract} />
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
              url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              subdomains={["mt0", "mt1", "mt2", "mt3"]}
              maxZoom={21}
            />

            <Marker position={SCHOOL} icon={schoolIcon}>
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">Escola Profissional Oficina</div>
                  <div className="text-xs opacity-70">Santo Tirso</div>
                </div>
              </Popup>
            </Marker>

            {position && (
              <>
                <Marker position={[position.lat, position.lng]} icon={userIcon}>
                  <Popup>Tu estás aqui</Popup>
                </Marker>
                <Circle
                  center={[position.lat, position.lng]}
                  radius={Math.min(position.accuracy, 80)}
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
                      {loc.hint && <div className="text-xs opacity-70">{loc.hint}</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="absolute top-3 left-3 z-[400] rounded-full bg-card/90 backdrop-blur px-3 py-1.5 text-xs flex items-center gap-2 border border-border shadow-card">
            {headerStatus}
          </div>

          <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-2">
            <button
              onClick={() => {
                if (!mapInstance) return;
                setAutoFollow(false);
                mapInstance.setView(SCHOOL, 18, { animate: true });
              }}
              className="h-11 w-11 rounded-full bg-card/95 backdrop-blur border border-border shadow-card flex items-center justify-center text-accent active:scale-95 transition"
              aria-label="Centrar na escola"
              title="Centrar na escola"
            >
              <School className="h-5 w-5" />
            </button>
            <button
              onClick={recenter}
              className="h-11 w-11 rounded-full bg-card/95 backdrop-blur border border-border shadow-card flex items-center justify-center text-primary active:scale-95 transition"
              aria-label="Centrar em mim"
              title="Centrar em mim"
            >
              <Crosshair className="h-5 w-5" />
            </button>
          </div>
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
