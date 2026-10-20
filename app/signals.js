// Generatory sygnałów testowych. Każda funkcja zwraca Float32Array dla danej
// częstotliwości próbkowania; wartości w zakresie -1..1.

// Deterministyczny generator liczb pseudolosowych (mulberry32) - ten sam sygnał
// na każdym telefonie i przy każdym odtworzeniu.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Filtr pasmowy (RBJ audio EQ cookbook), w miejscu.
function bandpass(x, sampleRate, f0, q) {
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0, b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
}

function normalize(x, peak) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / max;
  return x;
}

// Łagodne wejście i wyjście, żeby nie było trzasków na brzegach.
function fade(x, sampleRate, seconds) {
  const n = Math.min(Math.floor(sampleRate * seconds), Math.floor(x.length / 2));
  for (let i = 0; i < n; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}

// Syntetyczne klaśnięcie: szum w paśmie ~0.8-4 kHz, narastanie 0.5 ms, zanik 6 ms.
// Ten sam kształt co w tools/make_clap_series.py (inny generator szumu).
export function clap(sampleRate) {
  const n = Math.floor((sampleRate * 30) / 1000);
  const rnd = prng(1234);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rnd() * 2 - 1;
  bandpass(x, sampleRate, 1800, 0.7);
  bandpass(x, sampleRate, 1800, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    x[i] *= Math.min(t / 0.0005, 1) * Math.exp(-t / 0.006);
  }
  return normalize(x, 0.9);
}

// Szum biały lub różowy (filtr Paula Kelleta), znormalizowany do szczytu 0.9.
export function noise(sampleRate, seconds, kind) {
  const n = Math.floor(sampleRate * seconds);
  const rnd = prng(42);
  const x = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    if (kind === "pink") {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else {
      x[i] = w;
    }
  }
  return fade(normalize(x, 0.9), sampleRate, 0.05);
}

export function tone(sampleRate, frequency, seconds) {
  const n = Math.floor(sampleRate * seconds);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = 0.9 * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  return fade(x, sampleRate, 0.02);
}

// Przemiatanie logarytmiczne f0 -> f1.
export function sweep(sampleRate, f0, f1, seconds) {
  const n = Math.floor(sampleRate * seconds);
  const x = new Float32Array(n);
  const k = Math.log(f1 / f0);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const phase = ((2 * Math.PI * f0 * seconds) / k) * (Math.exp((t / seconds) * k) - 1);
    x[i] = 0.9 * Math.sin(phase);
  }
  return fade(x, sampleRate, 0.02);
}
