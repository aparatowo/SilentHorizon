// Kierunek źródła z opóźnień między mikrofonami (model fali płaskiej).
// Układ współrzędnych matrycy (budowa): x w prawo (strona M2/M4), y w górę (strona M1/M2).
// Wynik: azymut geograficzny (0 = północ, 90 = wschód, ...), z uwzględnieniem
// ustawienia matrycy w terenie (MOUNT_ROTATION_DEG).

export const SAMPLE_RATE = 32000;
export const SOUND_MPS = 343;

// Położenia M1..M4 [m]; domyślnie kwadrat o przekątnej 19 cm.
// Po kalibracji geometrii wystarczy podmienić tę tablicę.
const HALF = 0.19 / Math.SQRT2 / 2;
export const MIC_POSITIONS = [
  [-HALF, HALF],
  [HALF, HALF],
  [-HALF, -HALF],
  [HALF, -HALF],
];

// Ustawienie w terenie: M1 skierowany na północ. Kierunek M1 w układzie matrycy to 315°,
// więc azymut geograficzny = azymut w układzie matrycy + 45°.
export const MOUNT_ROTATION_DEG = 45;

const SECTORS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function sectorName(azimuth) {
  return SECTORS[Math.floor((azimuth + 22.5) / 45) % 8];
}

// pairs: [[i, j, d]] - dźwięk dotarł do mikrofonu j o d ramek później niż do i.
// Dla fali z kierunku u: d * c / fs = -(p_j - p_i) · u  ->  najmniejsze kwadraty po u.
// Pary z opóźnieniem większym niż fizycznie możliwe (+2 ramki zapasu) są pomijane -
// zwykle to korelacja zmylona odbiciem albo wynik na granicy zakresu poszukiwań.
export function solveDirection(allPairs, positions = MIC_POSITIONS) {
  const limit = ([i, j]) =>
    Math.hypot(positions[j][0] - positions[i][0], positions[j][1] - positions[i][1]) * SAMPLE_RATE / SOUND_MPS + 2;
  const pairs = allPairs.filter((p) => Number.isFinite(p[2]) && Math.abs(p[2]) <= limit(p));
  const rejected = allPairs.length - pairs.length;
  if (pairs.length < 3) return null;
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
  const rows = pairs.map(([i, j, d]) => {
    const ax = -(positions[j][0] - positions[i][0]);
    const ay = -(positions[j][1] - positions[i][1]);
    const b = (d * SOUND_MPS) / SAMPLE_RATE;
    a11 += ax * ax; a12 += ax * ay; a22 += ay * ay;
    b1 += ax * b; b2 += ay * b;
    return [ax, ay, b];
  });
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-12) return null;
  const ux = (a22 * b1 - a12 * b2) / det;
  const uy = (a11 * b2 - a12 * b1) / det;

  // Średni błąd dopasowania w ramkach - miara spójności opóźnień.
  const residual = Math.sqrt(
    rows.reduce((s, [ax, ay, b]) => s + ((ax * ux + ay * uy - b) * SAMPLE_RATE / SOUND_MPS) ** 2, 0) / rows.length
  );
  const inPlane = Math.hypot(ux, uy);
  const azimuth = ((Math.atan2(ux, uy) * 180) / Math.PI + MOUNT_ROTATION_DEG + 720) % 360;
  return {
    azimuth,
    sector: sectorName(azimuth),
    elevation: (Math.acos(Math.min(inPlane, 1)) * 180) / Math.PI,
    residual,
    rejected,
    reliable: residual < 0.75 && rejected <= 1,
  };
}
