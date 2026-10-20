// Połączenie z nodami SilentHorizon: Bluetooth LE (Web Bluetooth) albo kabel USB (Web Serial).
// Oba kanały przenoszą te same wiersze tekstu; komendy opisuje README.md (tabela komend).
//
// Użycie:
//   const node = await connectBluetooth({ onLine(node, line) {...}, onClose(node, reason) {...} });
//   await node.send("e");            // litera trybu
//   await node.send("mark P1 start\n");

export const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export const bluetoothAvailable = () => !!navigator.bluetooth;
export const serialAvailable = () => "serial" in navigator;

// Wspólna część: sklejanie kawałków w wiersze i podstawowy stan nodu z jego opisu.
function makeNode(kind, name, handlers) {
  let pending = "";
  const node = {
    kind,
    name,
    role: null,       // "testowy" / "wzorcowy" - z opisu wysyłanego przez nod
    mode: null,       // l, r, e, t
    cfg: {},          // ostatnia konfiguracja (wiersz "# cfg ...")
    wifi: "",         // stan Wi-Fi
    feed(text) {
      pending += text;
      const lines = pending.split("\n");
      pending = lines.pop();
      for (const raw of lines) {
        const line = raw.replace(/\r$/, "");
        if (!line || !"#LRKTPM".includes(line[0])) continue;  // komunikaty rozruchowe ESP-IDF
        track(node, line);
        handlers.onLine?.(node, line);
      }
    },
  };
  return node;
}

const MODE_NAMES = { poziom: "l", odniesienie: "r", zdarzenia: "e", sledzenie: "t" };

function track(node, line) {
  let m;
  if ((m = line.match(/^# SilentHorizon nod (\w+)/))) node.role = m[1];
  else if ((m = line.match(/^# tryb: (\w+)/))) node.mode = MODE_NAMES[m[1]] ?? null;
  else if ((m = line.match(/^# wifi: (.*)/))) node.wifi = m[1];
  else if (line.startsWith("# cfg ")) {
    // "klucz=wartość" oddzielone spacjami; wartość (np. nazwa sieci) może zawierać spacje.
    node.cfg = Object.fromEntries(line.slice(6).split(/ (?=\w+=)/).map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]));
  }
}

export async function connectBluetooth(handlers) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [NUS_SERVICE] }, { namePrefix: "SH-" }],
    optionalServices: [NUS_SERVICE],
  });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(NUS_SERVICE);
  const rx = await service.getCharacteristic(NUS_RX);
  const tx = await service.getCharacteristic(NUS_TX);
  const node = makeNode("ble", device.name, handlers);
  const decoder = new TextDecoder();
  tx.addEventListener("characteristicvaluechanged", (e) => node.feed(decoder.decode(e.target.value, { stream: true })));
  await tx.startNotifications();
  device.addEventListener("gattserverdisconnected", () => handlers.onClose?.(node, "Bluetooth rozłączony"));
  // Zapisy BLE idą po kolei - równoległe wywołania kończą się błędem "GATT operation already in progress".
  let queue = Promise.resolve();
  node.send = (text) => {
    queue = queue.then(() => rx.writeValueWithoutResponse(new TextEncoder().encode(text)));
    return queue;
  };
  node.close = async () => device.gatt.disconnect();
  await node.send("?");  // nod odpowiada opisem, trybem i konfiguracją
  return node;
}

export async function connectSerial(handlers) {
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });  // bez resetu płytki
  const node = makeNode("serial", "USB", handlers);
  const decoder = new TextDecoderStream();
  const piped = port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let closed = false;
  node.port = port;
  node.send = async (text) => {
    const writer = port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(text));
    } finally {
      writer.releaseLock();
    }
  };
  node.reset = async () => {
    await port.setSignals({ requestToSend: true });
    await new Promise((r) => setTimeout(r, 100));
    await port.setSignals({ requestToSend: false });
  };
  node.close = async () => {
    closed = true;
    try {
      await reader.cancel();
      await piped;
      await port.close();
    } catch {
      // port już zamknięty
    }
    handlers.onClose?.(node, "Rozłączono");
  };
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        node.feed(value);
      }
    } catch (err) {
      if (!closed) handlers.onClose?.(node, `Połączenie przerwane: ${err.message}`);
    } finally {
      reader.releaseLock();
    }
  })();
  await node.send("?");
  return node;
}
