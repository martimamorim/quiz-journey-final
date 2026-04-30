import { useEffect, useRef, useState } from "react";

export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeoState = {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
};

// Filtro de Kalman 1D simples para suavizar e melhorar precisão do GPS.
// Mantemos um estado por dimensão (lat, lng) e combinamos com a accuracy reportada.
class Kalman1D {
  private value: number | null = null;
  private variance = -1; // -1 = não inicializado
  // Quanto maior Q, mais reativo a movimento; pequeno = mais suave
  constructor(private processNoise = 0.0000005) {}

  update(measurement: number, measurementVariance: number) {
    if (this.value === null || this.variance < 0) {
      this.value = measurement;
      this.variance = measurementVariance;
    } else {
      this.variance += this.processNoise;
      const k = this.variance / (this.variance + measurementVariance);
      this.value = this.value + k * (measurement - this.value);
      this.variance = (1 - k) * this.variance;
    }
    return this.value;
  }

  reset() {
    this.value = null;
    this.variance = -1;
  }
}

const distance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

const MIN_DELTA_METERS = 1.5;
const MIN_INTERVAL_MS = 800;
const MAX_ACCEPTED_ACCURACY = 80; // descarta leituras muito imprecisas

export const useGeolocation = (enabled = true): GeoState => {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    loading: enabled,
  });
  const lastRef = useRef<{ pos: GeoPosition; t: number } | null>(null);
  const kLat = useRef(new Kalman1D(0.0000005));
  const kLng = useRef(new Kalman1D(0.0000005));

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setState({ position: null, error: "Geolocalização não suportada", loading: false });
      return;
    }

    kLat.current.reset();
    kLng.current.reset();

    const onPos = (pos: GeolocationPosition) => {
      const rawAcc = pos.coords.accuracy || 50;
      // Ignora leituras com precisão má quando já temos uma boa
      if (lastRef.current && rawAcc > MAX_ACCEPTED_ACCURACY && lastRef.current.pos.accuracy < rawAcc) {
        return;
      }
      // Variância da medida (m² aprox.) — converte metros para deg²
      const metersPerDegLat = 111_320;
      const metersPerDegLng = 111_320 * Math.cos((pos.coords.latitude * Math.PI) / 180);
      const varLat = (rawAcc / metersPerDegLat) ** 2;
      const varLng = (rawAcc / metersPerDegLng) ** 2;

      const smoothLat = kLat.current.update(pos.coords.latitude, varLat);
      const smoothLng = kLng.current.update(pos.coords.longitude, varLng);

      const next: GeoPosition = {
        lat: smoothLat,
        lng: smoothLng,
        accuracy: Math.max(3, rawAcc * 0.6), // accuracy efetiva melhora após filtro
      };

      const now = Date.now();
      const last = lastRef.current;
      if (last) {
        const moved = distance(last.pos, next);
        const elapsed = now - last.t;
        if (moved < MIN_DELTA_METERS && elapsed < MIN_INTERVAL_MS) return;
      }
      lastRef.current = { pos: next, t: now };
      setState({ position: next, error: null, loading: false });
    };

    const onErr = (err: GeolocationPositionError) => {
      setState((prev) => ({
        position: prev.position,
        error: err.message || "Não foi possível obter localização",
        loading: false,
      }));
    };

    const id = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 25000,
    });

    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
};
