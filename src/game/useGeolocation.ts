import { useEffect, useState } from "react";

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

export const useGeolocation = (enabled = true): GeoState => {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setState({ position: null, error: "Geolocalização não suportada", loading: false });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({
          position: null,
          error: err.message || "Não foi possível obter localização",
          loading: false,
        });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
};