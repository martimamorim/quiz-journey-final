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

// Only update state if the position changed meaningfully — avoids re-renders
// on every tiny GPS jitter (which makes the map and markers flicker).
const MIN_DELTA_METERS = 2;
const MIN_INTERVAL_MS = 1500;

const distance = (a: GeoPosition, b: { lat: number; lng: number }) => {
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

export const useGeolocation = (enabled = true): GeoState => {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    loading: enabled,
  });
  const lastRef = useRef<{ pos: GeoPosition; t: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setState({ position: null, error: "Geolocalização não suportada", loading: false });
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      const next: GeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      const now = Date.now();
      const last = lastRef.current;
      if (last) {
        const moved = distance(last.pos, next);
        const elapsed = now - last.t;
        const accuracyChanged = Math.abs(last.pos.accuracy - next.accuracy) > 5;
        if (moved < MIN_DELTA_METERS && elapsed < MIN_INTERVAL_MS && !accuracyChanged) return;
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
      maximumAge: 5000,
      timeout: 20000,
    });

    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
};
