// Zestaw testów. Każdy test buduje oś czasu: listę odcinków {t, dur, label, detail, sound?},
// gdzie `sound` to funkcja (sampleRate) => Float32Array odtwarzana na początku odcinka.
// Test może też zwrócić listę etapów {gate: {label, detail}, segments}: przed każdym
// etapem aplikacja czeka, aż użytkownik naciśnie "Start" (np. po przestawieniu telefonu).
// `mode` odcinka (l, r, e, t) to tryb, na który aplikacja przełącza połączone nody na jego
// początku. Odcinki przygotowania mają już tryb następnego dźwięku - wykrywanie klaśnięć
// potrzebuje ok. 0,5 s na ustalenie poziomu tła.

import { clap as clapSignal, noise, sweep, tone } from "./signals.js";

const clap = Object.assign((sr) => clapSignal(sr), { signal: "klaśnięcie" });


function leadIn(segments, seconds, detail, mode) {
  segments.push({ t: 0, dur: seconds, label: "Przygotuj się", detail, mode });
  return seconds;
}

function clapSeries(segments, t, count, interval, labelPrefix, detail) {
  for (let k = 0; k < count; k++) {
    segments.push({
      t,
      dur: interval,
      label: `${labelPrefix}klaśnięcie ${k + 1}/${count}`,
      detail,
      sound: clap,
      mode: "e",
    });
    t += interval;
  }
  return t;
}

// Stałe pozycje testowe (docs/stanowisko-testowe.md). Matryca ustawiona M1 na północ;
// pozycje od M1 zgodnie z ruchem wskazówek zegara patrząc z góry, azymut geograficzny.
// Przed mikrofonem: 1 m od jego otworu = 1,095 m od środka.
export const FIXED_POSITIONS = [
  ["P1", "N, przed M1", 0, 1.095],
  ["P2", "NE, między M1 i M2", 45, 1.0],
  ["P3", "E, przed M2", 90, 1.095],
  ["P4", "SE, między M2 i M4", 135, 1.0],
  ["P5", "S, przed M4", 180, 1.095],
  ["P6", "SW, między M4 i M3", 225, 1.0],
  ["P7", "W, przed M3", 270, 1.095],
  ["P8", "NW, między M3 i M1", 315, 1.0],
];

const pinkNoise = (seconds) => Object.assign((sr) => noise(sr, seconds, "pink"), { signal: "szum różowy" });
const tone1k = (seconds) => Object.assign((sr) => tone(sr, 1000, seconds), { signal: "ton 1 kHz" });

export const TESTS = [
  {
    id: "fixed",
    title: "Pozycje stałe P1-P8 (kalibracyjny)",
    mode: "e + r",
    summary: "Klaśnięcia, szum różowy i ton z 8 wyznaczonych pozycji - podstawa kalibracji.",
    instructions:
      "Pozycje wyznaczone miarą laserową (docs/stanowisko-testowe.md). Telefon na statywie, " +
      "głośnik nad znacznikiem, na wysokości matrycy, skierowany w jej środek. Przed każdą " +
      "pozycją aplikacja czeka na „Start pozycji”. Wpisz model telefonu i głośność - trafią do dziennika.",
    params: [
      { key: "phone", label: "Model telefonu", value: "", type: "text" },
      { key: "volume", label: "Głośność multimediów [%]", value: 100, min: 0, max: 100, step: 1 },
      { key: "claps", label: "Klaśnięć na pozycję", value: 3, min: 0, max: 20, step: 1 },
      { key: "interval", label: "Odstęp klaśnięć [s]", value: 3, min: 1, max: 30, step: 0.5 },
      { key: "noise", label: "Szum różowy [s]", value: 10, min: 0, max: 120, step: 1 },
      { key: "tone", label: "Ton 1 kHz [s]", value: 5, min: 0, max: 120, step: 1 },
      { key: "lead", label: "Czas na odejście od telefonu [s]", value: 5, min: 0, max: 60, step: 1 },
    ],
    build(p) {
      const noiseSound = pinkNoise(p.noise);
      const toneSound = tone1k(p.tone);
      return FIXED_POSITIONS.map(([id, where, azimuth, distance]) => {
        const segments = [];
        const place = `${id} · ${where} · ${azimuth}° · ${distance.toFixed(3).replace(".", ",")} m od środka`;
        let t = 0;
        if (p.lead > 0) {
          segments.push({ t, dur: p.lead, label: "Odsuń się za telefon", detail: place, mode: p.claps > 0 ? "e" : "r" });
          t += p.lead;
        }
        t = clapSeries(segments, t, p.claps, p.interval, `${id}: `, place);
        if (p.noise > 0) {
          segments.push({ t, dur: p.noise + 2, label: `${id}: szum różowy`, detail: place, sound: noiseSound, mode: "r" });
          t += p.noise + 2;
        }
        if (p.tone > 0) {
          segments.push({ t, dur: p.tone + 2, label: `${id}: ton 1 kHz`, detail: place, sound: toneSound, mode: "r" });
        }
        return { gate: { label: `Ustaw telefon na ${id}`, detail: place }, segments };
      });
    },
  },
  {
    id: "claps",
    title: "Seria klaśnięć",
    mode: "e",
    summary: "Powtarzalne syntetyczne klaśnięcia z jednej pozycji.",
    instructions:
      "Stań w wybranym miejscu, telefon na wysokości matrycy, głośnikiem do jej środka. " +
      "Każde klaśnięcie jest identyczne, więc wyniki z jednej pozycji powinny się pokrywać.",
    params: [
      { key: "count", label: "Liczba klaśnięć", value: 6, min: 1, max: 50, step: 1 },
      { key: "interval", label: "Odstęp [s]", value: 3, min: 1, max: 30, step: 0.5 },
      { key: "lead", label: "Czas na przygotowanie [s]", value: 5, min: 0, max: 60, step: 1 },
    ],
    build(p) {
      const segments = [];
      const t = leadIn(segments, p.lead, "Ustaw telefon na pozycji.", "e");
      clapSeries(segments, t, p.count, p.interval, "", "");
      return segments;
    },
  },
  {
    id: "directions",
    title: "Kierunki (prowadzony)",
    mode: "e",
    summary: "Klaśnięcia kolejno z 4 lub 8 kierunków wokół matrycy.",
    instructions:
      "Matryca ustawiona M1 na północ. Aplikacja poda, na którą pozycję (P1-P8, kierunki " +
      "świata) przejść, i odczeka czas na przejście. 4 kierunki = N, E, S, W (przed mikrofonami).",
    params: [
      { key: "positions", label: "Liczba kierunków", value: 8, options: [4, 8] },
      { key: "count", label: "Klaśnięć na pozycję", value: 3, min: 1, max: 20, step: 1 },
      { key: "interval", label: "Odstęp [s]", value: 3, min: 1, max: 30, step: 0.5 },
      { key: "move", label: "Czas na przejście [s]", value: 15, min: 3, max: 120, step: 1 },
    ],
    build(p) {
      const segments = [];
      const dirs = p.positions === 4 ? FIXED_POSITIONS.filter((_, i) => i % 2 === 0) : FIXED_POSITIONS;
      let t = 0;
      dirs.forEach(([id, where, angle], i) => {
        const pos = `Pozycja ${i + 1}/${dirs.length}: ${id} (${angle}°)`;
        segments.push({ t, dur: p.move, label: `Przejdź: ${id} (${angle}°)`, detail: where, mode: "e" });
        t += p.move;
        t = clapSeries(segments, t, p.count, p.interval, `${id}: `, pos);
      });
      return segments;
    },
  },
  {
    id: "walk",
    title: "Obejście z szumem (kalibracja)",
    mode: "t",
    summary: "Ciągły szum podczas powolnego obchodzenia matrycy - kalibracja geometrii.",
    instructions:
      "Zacznij od północy (strona M1), 2-3 m od matrycy. Idź powoli i równo dookoła zgodnie " +
      "z ruchem wskazówek zegara, trzymając telefon przed sobą na wysokości matrycy.",
    params: [
      { key: "laps", label: "Liczba okrążeń", value: 2, min: 1, max: 5, step: 1 },
      { key: "lap", label: "Czas okrążenia [s]", value: 60, min: 20, max: 240, step: 5 },
      { key: "kind", label: "Rodzaj szumu", value: "pink", options: ["pink", "white"] },
      { key: "lead", label: "Czas na przygotowanie [s]", value: 10, min: 0, max: 60, step: 1 },
    ],
    build(p) {
      const segments = [];
      let t = leadIn(segments, p.lead, "Stań na północy (strona M1), 2-3 m od matrycy.", "t");
      const total = p.laps * p.lap;
      const quarter = p.lap / 4;
      const names = ["N → E", "E → S", "S → W", "W → N"];
      for (let q = 0; q < p.laps * 4; q++) {
        segments.push({
          t,
          dur: quarter,
          label: `Idź: ${names[q % 4]}`,
          detail: `Okrążenie ${Math.floor(q / 4) + 1}/${p.laps}`,
          mode: "t",
          // Jeden ciągły szum na całe obejście, startujący z pierwszym odcinkiem.
          sound: q === 0 ? (sr) => noise(sr, total, p.kind) : undefined,
        });
        t += quarter;
      }
      return segments;
    },
  },
  {
    id: "tone",
    title: "Ton 1 kHz (poziom)",
    mode: "r",
    summary: "Stały ton do porównania poziomu z miernikiem dźwięku.",
    instructions:
      "Ustaw telefon w stałej odległości od matrycy. Jeśli masz miernik poziomu dźwięku, " +
      "zmierz nim poziom przy matrycy i porównaj z odczytem urządzenia (tryb r).",
    params: [
      { key: "freq", label: "Częstotliwość [Hz]", value: 1000, min: 100, max: 10000, step: 10 },
      { key: "duration", label: "Czas trwania [s]", value: 20, min: 1, max: 300, step: 1 },
      { key: "lead", label: "Czas na przygotowanie [s]", value: 5, min: 0, max: 60, step: 1 },
    ],
    build(p) {
      const segments = [];
      const t = leadIn(segments, p.lead, "Ustaw telefon na pozycji.", "r");
      segments.push({
        t,
        dur: p.duration,
        label: `Ton ${p.freq} Hz`,
        detail: "",
        mode: "r",
        sound: (sr) => tone(sr, p.freq, p.duration),
      });
      return segments;
    },
  },
  {
    id: "sweep",
    title: "Przemiatanie częstotliwości",
    mode: "r",
    summary: "Ton przesuwający się od niskich do wysokich częstotliwości.",
    instructions:
      "Do sprawdzenia, jak mikrofony (i głośnik telefonu) przenoszą różne częstotliwości.",
    params: [
      { key: "f0", label: "Od [Hz]", value: 100, min: 20, max: 5000, step: 10 },
      { key: "f1", label: "Do [Hz]", value: 12000, min: 500, max: 20000, step: 100 },
      { key: "duration", label: "Czas przemiatania [s]", value: 10, min: 1, max: 60, step: 1 },
      { key: "repeats", label: "Powtórzenia", value: 3, min: 1, max: 20, step: 1 },
      { key: "gap", label: "Przerwa [s]", value: 2, min: 0, max: 30, step: 0.5 },
      { key: "lead", label: "Czas na przygotowanie [s]", value: 5, min: 0, max: 60, step: 1 },
    ],
    build(p) {
      const segments = [];
      let t = leadIn(segments, p.lead, "Ustaw telefon na pozycji.", "r");
      for (let k = 0; k < p.repeats; k++) {
        segments.push({
          t,
          dur: p.duration + p.gap,
          label: `Przemiatanie ${k + 1}/${p.repeats}`,
          detail: `${p.f0} → ${p.f1} Hz`,
          mode: "r",
          sound: (sr) => sweep(sr, p.f0, p.f1, p.duration),
        });
        t += p.duration + p.gap;
      }
      return segments;
    },
  },
];
