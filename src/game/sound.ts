// Tiny WebAudio sound helpers — no assets required.
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

const tone = (freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) => {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.stop(c.currentTime + duration);
};

export const playCorrect = () => {
  tone(523.25, 0.15, "triangle"); // C5
  setTimeout(() => tone(659.25, 0.15, "triangle"), 120); // E5
  setTimeout(() => tone(783.99, 0.25, "triangle"), 240); // G5
};

export const playWrong = () => {
  tone(220, 0.2, "sawtooth", 0.1);
  setTimeout(() => tone(165, 0.3, "sawtooth", 0.1), 150);
};

export const playScan = () => {
  tone(880, 0.08, "square", 0.08);
};

export const playWin = () => {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.2, "triangle"), i * 130));
};

export const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};