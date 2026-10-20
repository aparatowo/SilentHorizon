import { bluetoothAvailable, connectBluetooth, connectSerial, serialAvailable } from "./link.js";
import { TESTS } from "./tests.js";

const $ = (id) => document.getElementById(id);
const views = ["list-view", "test-view", "run-view", "node-view"];

let current = null;   // wybrany test
let run = null;       // trwające odtwarzanie
let audio = null;     // AudioContext (tworzony po geście użytkownika)
let nodes = [];       // połączone nody (link.js)
let editedNode = null;

function show(view) {
  for (const v of views) $(v).hidden = v !== view;
  $("back").hidden = view === "list-view";
  $("title").textContent =
    view === "list-view" ? "SilentHorizon · testy" : view === "node-view" ? editedNode.name : current.title;
}

// --- parametry (pamiętane w przeglądarce) ---------------------------------------

function loadParams(test) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(`params:${test.id}`) || "{}");
  } catch {
    saved = {};
  }
  return Object.fromEntries(test.params.map((p) => [p.key, saved[p.key] ?? p.value]));
}

function saveParams(test, values) {
  try {
    localStorage.setItem(`params:${test.id}`, JSON.stringify(values));
  } catch {
    // pamięć przeglądarki niedostępna - parametry nie zostaną zapamiętane
  }
}

function renderParams(test) {
  const values = loadParams(test);
  const form = $("params");
  form.replaceChildren();
  for (const p of test.params) {
    const label = document.createElement("label");
    label.textContent = p.label;
    let input;
    if (p.options) {
      input = document.createElement("select");
      for (const o of p.options) input.append(new Option(String(o), String(o)));
    } else if (p.type === "text") {
      input = document.createElement("input");
      input.type = "text";
    } else {
      input = document.createElement("input");
      Object.assign(input, { type: "number", min: p.min, max: p.max, step: p.step, inputMode: "decimal" });
    }
    input.name = p.key;
    input.value = String(values[p.key]);
    label.append(input);
    form.append(label);
  }
}

function readParams(test) {
  const values = {};
  for (const p of test.params) {
    const raw = $("params").elements[p.key].value;
    if (p.type === "text") {
      values[p.key] = raw.trim();
      continue;
    }
    const isNumber = !p.options || typeof p.value === "number";
    let v = isNumber ? Number(raw) : raw;
    if (!p.options && Number.isFinite(v)) v = Math.min(p.max, Math.max(p.min, v));
    values[p.key] = Number.isFinite(v) || !isNumber ? v : p.value;
  }
  return values;
}

// --- dziennik sesji ---------------------------------------------------------------
//
// Sesja = wpisy aplikacji (co i kiedy grało) + wszystkie wiersze z połączonych nodów,
// każdy z czasem telefonu. Na ekranie widać wpisy aplikacji, znaczniki i komunikaty
// nodów; pełne dane (np. 10 wierszy/s w trybie śledzenia) są w pobieranym pliku.

const session = [];

function clock(ms) {
  const d = new Date(ms);
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function showLogLine(text) {
  $("log-view").hidden = false;
  $("log").textContent += text + "\n";
  $("log").scrollTop = $("log").scrollHeight;
}

function log(text, when = Date.now()) {
  session.push({ when, source: "APP", text });
  showLogLine(`${clock(when)}  ${text}`);
}

function logNodeLine(node, line) {
  const when = Date.now();
  session.push({ when, source: node.name, text: line });
  if ((line[0] === "#" && !line.startsWith("# log ")) || line[0] === "M") showLogLine(`${clock(when)}  [${node.name}] ${line}`);
  $("session-count").textContent = `${session.length} wpisów w sesji`;
}

function downloadSession() {
  const text = session.map((e) => `${clock(e.when)} ${e.source} ${e.text}`).join("\n") + "\n";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type: "text/plain" })),
    download: `sesja-${stamp}.log`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- nody -----------------------------------------------------------------------

const nodeHandlers = {
  onLine(node, line) {
    logNodeLine(node, line);
    renderNodes();
    if (editedNode === node && line.startsWith("# log ")) {
      $("node-history").textContent += line.slice(6) + "\n";
      $("node-history").scrollTop = $("node-history").scrollHeight;
    } else if (editedNode === node && line[0] === "#") {
      $("node-log").textContent += line + "\n";
      $("node-log").scrollTop = $("node-log").scrollHeight;
      if (line.startsWith("# cfg ")) fillNodeForm(node);
    }
  },
  onClose(node, reason) {
    nodes = nodes.filter((n) => n !== node);
    log(`${node.name}: ${reason}`);
    renderNodes();
    if (editedNode === node) history.back();
  },
};

async function addNode(kind) {
  try {
    const node = await (kind === "ble" ? connectBluetooth(nodeHandlers) : connectSerial(nodeHandlers));
    if (nodes.some((n) => n.name === node.name && n.kind === "ble")) {
      await node.close();
      return;
    }
    nodes.push(node);
    log(`połączono ${node.name}`);
    renderNodes();
  } catch (err) {
    if (err.name !== "NotFoundError") log(`nie udało się połączyć: ${err.message}`);  // NotFoundError = anulowano wybór
  }
}

function renderNodes() {
  const list = $("nodes");
  list.replaceChildren();
  for (const node of nodes) {
    const li = document.createElement("li");
    const info = document.createElement("div");
    const name = Object.assign(document.createElement("b"), { textContent: node.name });
    const state = document.createElement("span");
    state.className = "summary";
    state.textContent = [node.role ?? "?", node.mode ? `tryb ${node.mode}` : "", node.wifi ? `Wi-Fi: ${node.wifi}` : ""]
      .filter(Boolean).join(" · ");
    info.append(name, state);
    const settings = Object.assign(document.createElement("button"), { className: "small", textContent: "Ustawienia" });
    settings.addEventListener("click", () => openNode(node));
    const close = Object.assign(document.createElement("button"), { className: "small", textContent: "Rozłącz" });
    close.addEventListener("click", () => node.close());
    li.append(info, settings, close);
    list.append(li);
  }
  $("nodes-hint").hidden = nodes.length > 0;
  $("run-nodes").textContent = nodes.length
    ? `Nody: ${nodes.map((n) => `${n.name} (${n.mode ?? "?"})`).join(", ")}`
    : "Brak połączonych nodów - dane nie trafią do sesji.";
}

// Ten sam tekst do wszystkich nodów. Nod wzorcowy nie ma trybu śledzenia - dostaje odniesienie.
function broadcast(text) {
  for (const node of nodes) {
    const t = text === "t" && node.role === "wzorcowy" ? "r" : text;
    node.send(t).catch((err) => log(`${node.name}: nie wysłano "${t.trim()}" (${err.message})`));
  }
}

function mark(text) {
  broadcast(`mark ${text.replace(/\s+/g, " ").slice(0, 80)}\n`);
}

// --- ustawienia nodu --------------------------------------------------------------

function openNode(node) {
  editedNode = node;
  $("node-log").textContent = "";
  $("node-history").textContent = "";
  $("node-form").reset();  // bez wartości z poprzednio otwartego nodu
  fillNodeForm(node);
  show("node-view");
  history.pushState({ node: node.name }, "");
  node.send("cfg\nlog\n");
}

function fillNodeForm(node) {
  const f = $("node-form").elements;
  const cfg = node.cfg;
  $("node-info").textContent = `${node.name} · ${node.role ?? "?"} · połączenie: ${node.kind === "ble" ? "Bluetooth" : "USB"}`;
  if (cfg.mode) f.mode.value = cfg.mode;
  if (cfg.cal) f.cal.value = cfg.cal;
  f.wifi.checked = cfg.wifi === "on";
  for (const key of ["node_id", "lat", "lon"]) {
    if (cfg[key] !== undefined && document.activeElement !== f[key]) f[key].value = key === "node_id" && cfg[key] === "0" ? "" : cfg[key];
  }
  if (cfg.wifi_ssid !== undefined && document.activeElement !== f.wifi_ssid) f.wifi_ssid.value = cfg.wifi_ssid;
  f.mode.querySelector('option[value="t"]').disabled = node.role === "wzorcowy";
}

async function saveNode() {
  const node = editedNode;
  const f = $("node-form").elements;
  const cfg = node.cfg;
  const changes = [];
  if (cfg.mode && f.mode.value !== cfg.mode) changes.push(`set mode ${f.mode.value}`);
  const cal = Number(f.cal.value.replace(",", "."));
  const calChanged = cfg.cal && f.cal.value !== "" && Number.isFinite(cal) && cal.toFixed(2) !== cfg.cal;
  if (calChanged) changes.push(`set cal ${cal.toFixed(2)}`);
  if (f.wifi_ssid.value !== (cfg.wifi_ssid ?? "")) changes.push(`set wifi_ssid ${f.wifi_ssid.value}`);
  if (f.wifi_pass.value) changes.push(`set wifi_pass ${f.wifi_pass.value}`);
  // Identyfikator i położenie: pusty formularz = bez zmian; porównanie liczbowe (nod odsyła "60.754000").
  const idText = f.node_id.value.trim();
  if (idText !== "" && cfg.node_id !== undefined && Number(idText) !== Number(cfg.node_id)) changes.push(`set node_id ${idText}`);
  for (const key of ["lat", "lon"]) {
    const text = f[key].value.trim().replace(",", ".");
    if (text !== "" && cfg[key] !== undefined && (cfg[key] === "" || Number(text) !== Number(cfg[key]))) changes.push(`set ${key} ${text}`);
  }
  if (f.wifi.checked !== (cfg.wifi === "on")) changes.push(`set wifi ${f.wifi.checked ? "on" : "off"}`);
  if (!changes.length) {
    $("node-log").textContent += "(bez zmian)\n";
    return;
  }
  if (calChanged) {
    const shift = (cal - Number(cfg.cal)).toFixed(2);
    const ok = confirm(`Zmiana kalibracji ${node.name}: ${cfg.cal} → ${cal.toFixed(2)} dB.\n` +
      `Wszystkie poziomy dB SPL tego nodu przesuną się o ${shift > 0 ? "+" : ""}${shift} dB.\n\nZapisać?`);
    if (!ok) {
      $("node-log").textContent += "(anulowano - nic nie zapisano)\n";
      return;
    }
  }
  for (const c of changes) {
    await node.send(c + "\n");
    log(`${node.name}: ${c.startsWith("set wifi_pass") ? "set wifi_pass ***" : c}`);
  }
  f.wifi_pass.value = "";
  $("node-history").textContent = "";
  await node.send("log\n");  // historia z nowymi wpisami
}

// --- odtwarzanie --------------------------------------------------------------
//
// Test to lista etapów. Etap z `gate` czeka na naciśnięcie przycisku (np. po
// przestawieniu telefonu), potem odtwarza swoje odcinki od początku.

function stagesOf(plan) {
  return plan.length && plan[0].segments ? plan : [{ segments: plan }];
}

function dbfs(x) {
  return x > 0 ? (20 * Math.log10(x)).toFixed(1) : "-inf";
}

// Bufor dźwięku generowany raz na funkcję (np. jedno klaśnięcie dla całej serii).
// Przy pierwszym użyciu poziom sygnału trafia do dziennika - potrzebny do kalibracji.
function bufferFor(sound) {
  let buffer = run.buffers.get(sound);
  if (!buffer) {
    const data = sound(audio.sampleRate);
    buffer = audio.createBuffer(1, data.length, audio.sampleRate);
    buffer.copyToChannel(data, 0);
    run.buffers.set(sound, buffer);
    let sum = 0, peak = 0;
    for (const v of data) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    log(`sygnał ${sound.signal ?? "dźwięk"}: RMS ${dbfs(Math.sqrt(sum / data.length))} dBFS, ` +
      `szczyt ${dbfs(peak)} dBFS, ${(data.length / audio.sampleRate).toFixed(2)} s, ${audio.sampleRate} Hz`);
  }
  return buffer;
}

async function start() {
  const params = readParams(current);
  saveParams(current, params);
  const stages = stagesOf(current.build(params));

  audio ??= new AudioContext({ latencyHint: "playback" });
  await audio.resume();

  let wakeLock = null;
  try {
    wakeLock = await navigator.wakeLock?.request("screen");
  } catch {
    wakeLock = null;  // ekran może się wygasić, dźwięk i tak gra dalej
  }

  run = { stages, stage: -1, buffers: new Map(), sources: [], wakeLock, frame: 0, mode: null };
  log(`START ${current.title} ${JSON.stringify(params)}`);
  mark(`START ${current.id}`);
  renderNodes();
  show("run-view");
  nextStage();
}

function nextStage() {
  run.stage++;
  if (run.stage >= run.stages.length) {
    finish("KONIEC");
    return;
  }
  const stage = run.stages[run.stage];
  $("run-progress").value = run.stage / run.stages.length;
  if (!stage.gate) {
    playStage();
    return;
  }
  $("run-label").textContent = stage.gate.label;
  $("run-detail").textContent = stage.gate.detail;
  $("run-countdown").textContent = "";
  $("run-next").textContent = `Etap ${run.stage + 1} z ${run.stages.length}`;
  $("gate").hidden = false;
  navigator.vibrate?.([200, 100, 200]);
}

function playStage() {
  $("gate").hidden = true;
  const { segments } = run.stages[run.stage];
  const startAt = audio.currentTime + 0.3;
  for (const seg of segments) {
    if (!seg.sound) continue;
    const src = audio.createBufferSource();
    src.buffer = bufferFor(seg.sound);
    src.connect(audio.destination);
    src.start(startAt + seg.t);
    run.sources.push(src);
  }
  Object.assign(run, { segments, startAt, total: Math.max(...segments.map((s) => s.t + s.dur)), index: -1 });
  tick();
}

function segmentStarted(seg, when) {
  log(seg.label, when);
  if (seg.mode && seg.mode !== run.mode) {
    run.mode = seg.mode;
    broadcast(seg.mode);
  }
  mark(seg.label);
  if (!seg.sound) navigator.vibrate?.(200);  // sygnał do zmiany pozycji
}

function tick() {
  if (!run || !run.segments) return;
  const elapsed = audio.currentTime - run.startAt;
  if (elapsed >= run.total) {
    run.segments = null;
    nextStage();
    return;
  }
  const { segments } = run;
  let index = -1;
  for (let i = 0; i < segments.length; i++) if (segments[i].t <= elapsed) index = i;
  if (index !== run.index) {
    run.index = index;
    const seg = segments[Math.max(index, 0)];
    $("run-label").textContent = index >= 0 ? seg.label : "Start za chwilę";
    $("run-detail").textContent = index >= 0 ? seg.detail : "";
    const next = segments[index + 1];
    $("run-next").textContent = next ? `Dalej: ${next.label}` : "";
    if (index >= 0) segmentStarted(seg, Date.now() - (elapsed - seg.t) * 1000);
  }
  const seg = segments[Math.max(index, 0)];
  const remaining = index >= 0 ? seg.t + seg.dur - elapsed : -elapsed;
  $("run-countdown").textContent = Math.max(0, Math.ceil(remaining)).toString();
  $("run-progress").value = (run.stage + Math.max(0, elapsed) / run.total) / run.stages.length;
  run.frame = requestAnimationFrame(tick);
}

function finish(reason) {
  if (!run) return;
  cancelAnimationFrame(run.frame);
  for (const src of run.sources) {
    try {
      src.stop();
    } catch {
      // źródło już zakończone
    }
  }
  run.wakeLock?.release().catch(() => {});
  log(reason);
  mark(reason);
  run = null;
  $("gate").hidden = true;
  show("test-view");
}

// --- nawigacja --------------------------------------------------------------

function openTest(test) {
  current = test;
  $("test-instructions").textContent = test.instructions;
  $("test-mode").textContent = test.mode;
  renderParams(test);
  show("test-view");
  history.pushState({ test: test.id }, "");
}

function renderList() {
  const list = $("tests");
  for (const test of TESTS) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    const badge = Object.assign(document.createElement("span"), { className: "badge", textContent: `tryb ${test.mode}` });
    const name = Object.assign(document.createElement("span"), { className: "name", textContent: test.title });
    const summary = Object.assign(document.createElement("span"), { className: "summary", textContent: test.summary });
    button.append(badge, name, summary);
    button.addEventListener("click", () => openTest(test));
    li.append(button);
    list.append(li);
  }
}

$("start").addEventListener("click", start);
$("gate").addEventListener("click", () => run && playStage());
$("stop").addEventListener("click", () => finish("ZATRZYMANO"));
$("back").addEventListener("click", () => history.back());
$("add-ble").addEventListener("click", () => addNode("ble"));
$("add-usb").addEventListener("click", () => addNode("serial"));
$("add-ble").hidden = !bluetoothAvailable();
$("add-usb").hidden = !serialAvailable();
$("node-save").addEventListener("click", saveNode);
$("save-session").addEventListener("click", downloadSession);
$("copy-log").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("log").textContent);
    $("copy-log").textContent = "Skopiowano";
  } catch {
    $("copy-log").textContent = "Nie udało się skopiować";
  }
  setTimeout(() => ($("copy-log").textContent = "Kopiuj dziennik"), 1500);
});
window.addEventListener("popstate", () => {
  finish("ZATRZYMANO");
  editedNode = null;
  show("list-view");
});

renderList();
renderNodes();
show("list-view");
if (!bluetoothAvailable() && !serialAvailable()) {
  $("nodes-hint").textContent = "Ta przeglądarka nie łączy się z nodami (Bluetooth: Chrome na Androidzie). Testy działają bez nodów.";
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
