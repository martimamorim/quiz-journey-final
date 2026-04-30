// Música de fundo (loop) — faixa cinemática suave servida em CDN livre (Pixabay).
// Single audio element partilhado por toda a app.

const TRACK_URL =
  "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3"; // "Cinematic Documentary" — calma, ambiente

let audio: HTMLAudioElement | null = null;
let userEnabled = true;

const ensure = () => {
  if (audio) return audio;
  audio = new Audio(TRACK_URL);
  audio.loop = true;
  audio.volume = 0.25;
  audio.preload = "auto";
  return audio;
};

export const startMusic = async () => {
  if (!userEnabled) return;
  const a = ensure();
  try {
    await a.play();
  } catch {
    // navegadores exigem gesto do utilizador — ignora silenciosamente
  }
};

export const stopMusic = () => {
  if (!audio) return;
  audio.pause();
};

export const toggleMusic = async () => {
  userEnabled = !userEnabled;
  if (userEnabled) await startMusic();
  else stopMusic();
  return userEnabled;
};

export const isMusicEnabled = () => userEnabled;

export const setVolume = (v: number) => {
  ensure().volume = Math.max(0, Math.min(1, v));
};
