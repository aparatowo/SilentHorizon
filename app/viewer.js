// Podgląd wyników z urządzenia: połączenie przez Web Serial albo wczytany dziennik.

import { MIC_POSITIONS, MOUNT_ROTATION_DEG, SAMPLE_RATE, solveDirection } from "./direction.js";
import { FIXED_POSITIONS } from "./tests.js";
import { bluetoothAvailable, connectBluetooth, connectSerial, serialAvailable } from "./link.js";

const $ = (id) => document.getElementById(id);
const FRAME_US = 1e6 / SAMPLE_RATE;
const DBFS_TO_DB_SPL = 120;
const EVENT_PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3]];                 // kolejność w wierszu K
const TRACK_PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]; // kolejność w wierszu T
const SHOWN_EVENTS = 12;
const TRACK_TRAIL_S = 3;
const MODE_NAMES = { poziom: "l", odniesienie: "r", zdarzenia: "e", sledzenie: "t" };

const state = {
  events: [],
  track: [],          // ostatnie odczyty śledzenia {t, dir, level}
  levels: null,       // dB SPL M1..M4
  levelsLabel: "",
  mode: null,
  raw: [],            // odebrane wiersze (do zapisu dziennika)
  node: null,         // "testowy" albo "wzorcowy" (z opisu wysyłanego przez nod)
  cal: null,          // stała kalibracji nodu: dB SPL = dBFS + cal
  ref: null,          // nod wzorcowy: ostatni odczyt {t, leq, peak} [dBFS] albo {t, spl}
  refEvent: null,     // nod wzorcowy: ostatnie zdarzenie {n, t, peak} [dBFS]
};

// --- parsowanie wierszy z firmware ----------------------------------------------

// Dziennik sesji z aplikacji testów ma wiersze "hh:mm:ss.mmm <źródło> <wiersz>" -
// wiersze nodów są z niego wyłuskiwane, wpisy aplikacji pomijane.
const SESSION_LINE = /^\d\d:\d\d:\d\d\.\d{3}\s+(SH-\S+|USB)\s+(.*)$/;

function handleLine(line) {
  line = line.replace(/\r$/, "");
  const session = line.match(SESSION_LINE);
  if (session) line = session[2];
  if (!line || !"#LRKTPM".includes(line[0])) return;  // pomija komunikaty rozruchowe ESP-IDF
  state.raw.push(line);
  const f = line.split(/\s+/);
  if (f[0] === "#") {
    const m = line.match(/# tryb: (\w+)/);
    if (m) state.mode = MODE_NAMES[m[1]] ?? null;
    const node = line.match(/nod (testowy|wzorcowy)/);
    if (node) state.node = node[1];
    const cal = line.match(/dB SPL = dBFS \+ (-?[\d.]+)/) ?? line.match(/^# cfg .*\bcal=(-?[\d.]+)/);
    if (cal) {
      state.cal = Number(cal[1]);
      if (document.activeElement !== $("cal-value")) $("cal-value").value = state.cal.toFixed(2);
    }
    if (line.includes("przesuniecie") || line.includes("przepelnienie")) setStatus(line.slice(2));
  } else if (f[0] === "M" && f.length >= 3) {
    addMarker(Number(f[1]), f.slice(2).join(" "));
  } else if (f[0] === "L" && f.length === 4) {
    state.ref = { t: Number(f[2]), spl: Number(f[3]) };
  } else if (f[0] === "P" && f.length >= 4) {
    state.refEvent = { n: Number(f[1]), t: Number(f[2]), peak: Number(f[3]) };
  } else if (f[0] === "L" && f.length >= 7) {
    state.levels = f.slice(3, 7).map(Number);
    state.levelsLabel = `Leq, t = ${Number(f[2]).toFixed(0)} s`;
  } else if (f[0] === "R" && f.length >= 4) {
    const n = (f.length - 2) / 2;  // R <t> <Leq dBFS x n> <szczyt dBFS x n>
    if (n === 1) state.ref = { t: Number(f[1]), leq: Number(f[2]), peak: Number(f[3]) };
    if (n === 4) {
      state.levels = f.slice(2, 6).map((v) => Number(v) + DBFS_TO_DB_SPL);
      state.levelsLabel = `Leq 1 s, t = ${Number(f[1]).toFixed(0)} s (nieskalibrowane)`;
    }
  } else if (f[0] === "K" && f.length >= 11) {
    const d = f.slice(3, 7).map(Number);
    const peaks = f.slice(7, 11).map((v) => Number(v) + DBFS_TO_DB_SPL);
    const dir = solveDirection(EVENT_PAIRS.map(([i, j], k) => [i, j, d[k]]));
    const [d12, d34, d13, d24] = d;
    const arrival = [0, d12, d13, (d12 + d24 + d13 + d34) / 2];
    const first = Math.min(...arrival);
    state.events.push({
      n: Number(f[1]),
      t: Number(f[2]),
      dir,
      arrival: arrival.map((a) => (a - first) * FRAME_US),
      peaks,
    });
    state.levels = peaks;
    state.levelsLabel = `szczyt zdarzenia #${f[1]}`;
    addEventItem(state.events.at(-1));
  } else if (f[0] === "T" && f.length >= 9) {
    const d = f.slice(2, 8).map(Number);
    const t = Number(f[1]);
    state.track.push({ t, dir: solveDirection(TRACK_PAIRS.map(([i, j], k) => [i, j, d[k]])), level: Number(f[8]) });
    while (state.track.length && state.track[0].t < t - TRACK_TRAIL_S) state.track.shift();
  }
  requestDraw();
}

// --- lista zdarzeń ----------------------------------------------------------------

function addMarker(t, text) {
  const li = document.createElement("li");
  li.className = "marker";
  li.textContent = `▸ ${text}  (t = ${t.toFixed(2)} s)`;
  $("events").prepend(li);
}

function addEventItem(ev) {
  const li = document.createElement("li");
  li.value = ev.n;
  const dir = ev.dir;
  const head = document.createElement("div");
  head.className = "head";
  head.dataset.n = ev.n;
  head.textContent = dir
    ? `${dir.azimuth.toFixed(0)}° ${dir.sector}` + (dir.reliable ? "" : " · niewiarygodny")
    : "brak kierunku";
  if (!dir?.reliable) li.classList.add("unreliable");
  const order = [0, 1, 2, 3].sort((a, b) => ev.arrival[a] - ev.arrival[b]).map((m) => `M${m + 1}`).join(" › ");
  const body = document.createElement("div");
  body.className = "body";
  body.textContent =
    `t = ${ev.t.toFixed(2)} s · kolejność ${order}\n` +
    `dotarcie [µs]: ${ev.arrival.map((a, m) => `M${m + 1} +${a.toFixed(0)}`).join("  ")}\n` +
    `szczyt [dB SPL]: ${ev.peaks.map((p, m) => `M${m + 1} ${p.toFixed(1)}`).join("  ")}`;
  li.append(head, body);
  $("events").prepend(li);
  while ($("events").children.length > 200) $("events").lastChild.remove();
}

// --- rysowanie tarczy -------------------------------------------------------------

let drawPending = false;

function requestDraw() {
  if (!drawPending) {
    drawPending = true;
    requestAnimationFrame(draw);
  }
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function draw() {
  drawPending = false;
  const canvas = $("dial");
  const size = Math.min(canvas.parentElement.clientWidth, 560);
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = `${size}px`;
  }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, size, size);

  const c = size / 2;
  const R = c - 34;
  if (state.node === "wzorcowy") {
    drawReference(g, c, R);
    updateReadout();
    return;
  }
  const colors = { text: css("--text"), muted: css("--muted"), border: css("--border"), accent: css("--accent"), track: css("--track"), danger: css("--danger") };
  const at = (az, r) => [c + r * Math.sin((az * Math.PI) / 180), c - r * Math.cos((az * Math.PI) / 180)];

  // Tarcza: okrąg, podziałka co 15°, opisy kierunków.
  g.lineWidth = 1;
  g.strokeStyle = colors.border;
  g.beginPath();
  g.arc(c, c, R, 0, 2 * Math.PI);
  g.stroke();
  for (let az = 0; az < 360; az += 15) {
    const [x1, y1] = at(az, R);
    const [x2, y2] = at(az, R - (az % 45 === 0 ? 12 : 6));
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  g.fillStyle = colors.muted;
  g.font = "13px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const [az, name] of [[0, "N 0°"], [90, "E 90°"], [180, "S 180°"], [270, "W 270°"]]) {
    const [x, y] = at(az, R + 18);
    g.save();
    g.translate(x, y);
    if (az === 90 || az === 270) g.rotate(((az === 90 ? 90 : -90) * Math.PI) / 180);
    g.fillText(name, 0, 0);
    g.restore();
  }

  // Stałe pozycje testowe P1-P8.
  g.font = "bold 11px system-ui, sans-serif";
  for (const [id, , az] of FIXED_POSITIONS) {
    const [x, y] = at(az, R - 24);
    g.fillStyle = colors.muted;
    g.fillText(id, x, y);
  }

  // Zdarzenia: najnowsze wyraźne, starsze coraz bledsze; niewiarygodne przerywane.
  const shown = state.events.slice(-SHOWN_EVENTS);
  shown.forEach((ev, k) => {
    if (!ev.dir) return;
    const age = shown.length - 1 - k;
    const latest = age === 0;
    g.globalAlpha = latest ? 1 : Math.max(0.12, 0.6 - age * 0.05);
    g.strokeStyle = ev.dir.reliable ? colors.accent : colors.muted;
    g.setLineDash(ev.dir.reliable ? [] : [6, 6]);
    g.lineWidth = latest ? 4 : 2;
    const [x0, y0] = at(ev.dir.azimuth, R * 0.3);
    const [x1, y1] = at(ev.dir.azimuth, R - 4);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = g.strokeStyle;
    g.beginPath();
    g.arc(x1, y1, latest ? 7 : 4, 0, 2 * Math.PI);
    g.fill();
  });
  g.globalAlpha = 1;

  // Śledzenie: ślad z ostatnich sekund i bieżący kierunek.
  const last = state.track.at(-1);
  state.track.forEach((p) => {
    if (!p.dir?.reliable) return;
    g.globalAlpha = Math.max(0.1, 1 - (last.t - p.t) / TRACK_TRAIL_S);
    g.fillStyle = colors.track;
    const [x, y] = at(p.dir.azimuth, R - 4);
    g.beginPath();
    g.arc(x, y, 5, 0, 2 * Math.PI);
    g.fill();
  });
  g.globalAlpha = 1;
  if (last?.dir?.reliable) {
    g.strokeStyle = colors.track;
    g.lineWidth = 5;
    const [x0, y0] = at(last.dir.azimuth, R * 0.3);
    const [x1, y1] = at(last.dir.azimuth, R - 4);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }

  drawArray(g, c, R * 0.2, colors);
  updateReadout();
}

// Nod wzorcowy: jeden mikrofon - zamiast tarczy kierunku duży odczyt poziomu.
function drawReference(g, c, R) {
  const cal = state.cal ?? DBFS_TO_DB_SPL;
  const ref = state.ref;
  const spl = ref ? (ref.spl ?? ref.leq + cal) : null;
  g.strokeStyle = css("--border");
  g.lineWidth = 1;
  g.beginPath();
  g.arc(c, c, R, 0, 2 * Math.PI);
  g.stroke();
  // Łuk poziomu: 30-120 dB SPL.
  if (spl != null) {
    const frac = Math.min(1, Math.max(0, (spl - 30) / 90));
    g.strokeStyle = css("--accent");
    g.lineWidth = 14;
    g.lineCap = "round";
    g.beginPath();
    g.arc(c, c, R - 16, -Math.PI / 2, -Math.PI / 2 + frac * 2 * Math.PI);
    g.stroke();
    g.lineCap = "butt";
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = css("--text");
  g.font = `bold ${Math.round(R / 3)}px system-ui, sans-serif`;
  g.fillText(spl != null ? spl.toFixed(1) : "-", c, c - R * 0.08);
  g.fillStyle = css("--muted");
  g.font = `${Math.round(R / 10)}px system-ui, sans-serif`;
  g.fillText(ref?.leq != null ? "dB SPL · Leq 1 s" : "dB SPL · Leq 5 s", c, c + R * 0.22);
  if (ref?.leq != null) {
    g.fillText(`${ref.leq.toFixed(2)} dBFS · szczyt ${ref.peak.toFixed(1)} dBFS`, c, c + R * 0.38);
  }
}

// Matryca narysowana tak, jak stoi w terenie (obrót o MOUNT_ROTATION_DEG: M1 na północ).
function drawArray(g, c, half, colors) {
  const rot = (MOUNT_ROTATION_DEG * Math.PI) / 180;
  const turned = MIC_POSITIONS.map(([x, y]) => [x * Math.cos(rot) + y * Math.sin(rot), -x * Math.sin(rot) + y * Math.cos(rot)]);
  const scale = half / Math.max(...turned.map(([x, y]) => Math.hypot(x, y)));
  const pts = turned.map(([x, y]) => [c + x * scale, c - y * scale]);
  g.strokeStyle = colors.muted;
  g.lineWidth = 2;
  for (const [a, b] of [[0, 3], [1, 2]]) {
    g.beginPath();
    g.moveTo(...pts[a]);
    g.lineTo(...pts[b]);
    g.stroke();
  }
  const levels = state.levels;
  const lo = levels ? Math.min(...levels) : 0;
  const hi = levels ? Math.max(...levels) : 0;
  pts.forEach(([x, y], m) => {
    // Jasność: względny poziom mikrofonu wśród czterech (najgłośniejszy najjaśniejszy).
    const rel = levels && hi > lo ? (levels[m] - lo) / (hi - lo) : 0.5;
    g.fillStyle = colors.accent;
    g.globalAlpha = levels ? 0.25 + 0.75 * rel : 0.25;
    g.beginPath();
    g.arc(x, y, 14, 0, 2 * Math.PI);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = colors.text;
    g.font = "bold 12px system-ui, sans-serif";
    g.fillText(`M${m + 1}`, x, y);
    if (levels) {
      g.font = "11px system-ui, sans-serif";
      g.fillStyle = colors.muted;
      g.fillText(`${levels[m].toFixed(1)} dB`, x, y + (y < c ? -24 : 24));
    }
  });
}

function updateReadout() {
  const parts = [];
  $("events-panel").hidden = state.node === "wzorcowy";
  document.querySelector('[data-mode="t"]').hidden = state.node === "wzorcowy";
  if (state.node === "wzorcowy") {
    parts.push(`Nod wzorcowy · stała kalibracji ${state.cal != null ? state.cal.toFixed(2) : "?"} dB` +
      (state.mode !== "r" ? " · do kalibracji wybierz tryb „Odniesienie”" : ""));
    const ev = state.refEvent;
    if (ev) {
      parts.push(`Zdarzenie #${ev.n}: szczyt ${(ev.peak + (state.cal ?? DBFS_TO_DB_SPL)).toFixed(1)} dB SPL ` +
        `(${ev.peak.toFixed(1)} dBFS), t = ${ev.t.toFixed(2)} s`);
    }
    $("readout").innerHTML = parts.join("<br>");
    document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
    return;
  }
  const ev = state.events.at(-1);
  const tr = state.track.at(-1);
  if (state.mode === "t" && tr?.dir) {
    parts.push(`Śledzenie: <b>${tr.dir.azimuth.toFixed(0)}° (${tr.dir.sector})</b> · ${tr.level.toFixed(1)} dBFS` +
      ` · zgodność ${tr.dir.residual.toFixed(2)} ramki` +
      (tr.dir.rejected ? ` · pominięte pary: ${tr.dir.rejected}` : "") + (tr.dir.reliable ? "" : " · niewiarygodny"));
  } else if (ev?.dir) {
    parts.push(`Zdarzenie #${ev.n}: <b>${ev.dir.azimuth.toFixed(0)}° (${ev.dir.sector})</b>` +
      ` · ~${ev.dir.elevation.toFixed(0)}° poza płaszczyzną · zgodność ${ev.dir.residual.toFixed(2)} ramki` +
      (ev.dir.reliable ? "" : " · <span class=\"warn\">niewiarygodny</span>"));
  }
  if (state.levels) parts.push(`Poziomy: ${state.levelsLabel}`);
  $("readout").innerHTML = parts.join("<br>") || "Brak danych.";
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
}

// --- połączenie (link.js: Bluetooth LE albo kabel USB) ------------------------------

let link = null;

function setStatus(text) {
  $("status").textContent = text;
}

function setConnected(kind) {
  document.querySelectorAll("[data-mode], #cal-save").forEach((b) => (b.disabled = !kind));
  $("reset").disabled = kind !== "serial";
  $("connect").textContent = kind === "serial" ? "Rozłącz kabel" : "Połącz kablem (USB)";
  $("connect-ble").textContent = kind === "ble" ? "Rozłącz Bluetooth" : "Połącz przez Bluetooth";
  $("connect").disabled = kind === "ble";
  $("connect-ble").disabled = kind === "serial";
}

const handlers = {
  onLine: (node, line) => handleLine(line),
  onClose: (node, reason) => {
    if (link !== node) return;
    link = null;
    setConnected(null);
    setStatus(`${reason}.`);
  },
};

async function connectWith(kind) {
  if (link) {
    await link.close();
    return;
  }
  const available = kind === "ble" ? bluetoothAvailable() : serialAvailable();
  if (!available) {
    setStatus(kind === "ble"
      ? "Ta przeglądarka nie obsługuje Web Bluetooth - użyj Chrome na Androidzie lub komputerze (Linux: tools/podglad_linux.sh)."
      : "Ta przeglądarka nie obsługuje Web Serial - połącz przez Bluetooth albo wczytaj dziennik.");
    return;
  }
  try {
    setStatus("Łączenie...");
    link = await (kind === "ble" ? connectBluetooth(handlers) : connectSerial(handlers));
  } catch (err) {
    link = null;
    setStatus(`Nie udało się połączyć: ${err.message}`);
    return;
  }
  setConnected(link.kind);
  setStatus(`Połączono: ${link.name}.`);
}

async function send(text) {
  try {
    await link?.send(text);
  } catch (err) {
    setStatus(`Nie udało się wysłać komendy: ${err.message}`);
  }
}

async function resetBoard() {
  if (!link?.reset) return;
  await link.reset();
  clearAll();
  setStatus("Restart płytki - synchronizacja mikrofonów trwa ok. 2 s.");
}

async function saveCalibration() {
  const value = Number($("cal-value").value.replace(",", "."));
  if (!Number.isFinite(value) || value < 80 || value > 160) {
    setStatus("Stała kalibracji powinna być liczbą z zakresu 80-160 dB.");
    return;
  }
  await send(`set cal ${value.toFixed(2)}\n`);
}

// --- dziennik ------------------------------------------------------------------------

function clearAll() {
  state.events = [];
  state.track = [];
  state.levels = null;
  state.ref = null;
  state.refEvent = null;
  $("events").replaceChildren();
  requestDraw();
}

function saveLog() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = new Blob([state.raw.join("\n") + "\n"], { type: "text/plain" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `silenthorizon-${stamp}.log` });
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadLog(file) {
  clearAll();
  state.raw = [];
  (await file.text()).split("\n").forEach(handleLine);
  setStatus(`Wczytano ${file.name}: ${state.events.length} zdarzeń, ${state.track.length ? "śledzenie" : "bez śledzenia"}.`);
}

$("connect").addEventListener("click", () => connectWith("serial"));
$("connect-ble").addEventListener("click", () => connectWith("ble"));
$("reset").addEventListener("click", resetBoard);
$("cal-save").addEventListener("click", saveCalibration);
$("clear").addEventListener("click", clearAll);
$("save").addEventListener("click", saveLog);
$("file").addEventListener("change", (e) => e.target.files[0] && loadLog(e.target.files[0]));
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => send(b.dataset.mode)));
navigator.serial?.addEventListener("disconnect", (e) => link?.port === e.target && handlers.onClose(link, "Kabel odłączony"));
window.addEventListener("resize", requestDraw);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", requestDraw);

requestDraw();
