# SilentHorizon

Matryca 4 mikrofonów MEMS I2S (np. INMP441) na ESP32 - pomiar poziomu dźwięku
i kierunku jego źródła, plus aplikacja z testami dźwiękowymi na telefon.

```
  M1 (L)  \   /  M2 (P)    para NR1 -> SD = G32
           \ /
           / \
  M3 (L)  /   \  M4 (P)    para NR2 -> SD = G33
```

Wszystkie mikrofony: wspólne zasilanie, masa, SCK = G14, WS = G15.
Mikrofony 9,5 cm od środka (ok. 19 cm po przekątnej).
W terenie matryca stoi **M1 na północ** - podgląd i narzędzia podają azymut geograficzny
(0° = N, 90° = E, ...). Stanowisko testowe: [docs/stanowisko-testowe.md](docs/stanowisko-testowe.md).

## Struktura

| Katalog | Zawartość |
|---|---|
| `app/` | Aplikacja webowa (PWA) z testami dźwiękowymi na telefon |
| `tools/` | Narzędzia PC: odczyt z portu szeregowego, podgląd wyników, generator dźwięków |
| `controllers/` | **Poza repozytorium** (ignorowany przez git): kod wgrywany na kontrolery - firmware C (PlatformIO + ESP-IDF 5.2) w `controllers/firmware/` i prototyp MicroPython w `controllers/micropython/` |
| `docs/` | [Połączenia](docs/polaczenia.md), [stanowisko testowe i kalibracja](docs/stanowisko-testowe.md), [briefing modelu](docs/model-briefing.md) |

## Firmware

```
cd controllers/firmware
pio run -t upload        # budowanie i wgranie
pio device monitor       # podgląd; komendy: l, r, e, t, cal, ?
```

I2S0 (master) taktuje mikrofony i czyta parę NR1, I2S1 (slave) czyta parę NR2
z tego samego zegara. Na starcie firmware wyznacza dokładnie przesunięcie między
strumieniami DMA (chwilowo podając do I2S1 dane z G32) i dalej pracuje na
wyrównanym strumieniu 4-kanałowym, filtrowanym górnoprzepustowo (~30 Hz).

Tryby (litera wysłana przez port szeregowy):

| Tryb | Wiersz | Znaczenie |
|---|---|---|
| `l` poziom | `L <nr> <t> <dB M1..M4>` | Leq każdego mikrofonu co 5 s [dB SPL] |
| `r` odniesienie | `R <t> <Leq dBFS M1..Mn> <szczyt dBFS M1..Mn>` | Leq i szczyt co 1 s, surowe dBFS - do kalibracji |
| `e` zdarzenia | `K <nr> <t> <d12> <d34> <d13> <d24> <szczyt M1..M4 dBFS>` | klaśnięcia: opóźnienia i szczyty |
| `t` śledzenie | `T <t> <d12> <d13> <d14> <d23> <d24> <d34> <dBFS>` | ciągły dźwięk: opóźnienia 6 par co 100 ms |

Łączność: port szeregowy i **Bluetooth LE** jednocześnie (usługa Nordic UART, nazwa
`SH-testowy-XXXX` / `SH-wzorcowy-XXXX`). Te same wiersze i komendy w obu kanałach.

Komendy (zakończone Enterem; litery trybów działają od razu):

| Komenda | Działanie |
|---|---|
| `mark <tekst>` | znacznik w danych: `M <t> <tekst>` |
| `set <klucz> <wartość>` | ustawienie zapisywane w pamięci flash: `mode` (tryb po starcie), `cal` (dB SPL = dBFS + cal), `wifi` (on/off), `wifi_ssid`, `wifi_pass`, `node_id`, `lat`, `lon` (identyfikator i położenie nodu) |
| `cfg` | konfiguracja i stan (Wi-Fi, wolna pamięć); hasło nigdy nie jest odsyłane |
| `cal [<dB>]` | skrót `set cal` / odczyt stałej |
| `log` | historia zmian ustawień: `# log <nr> u<uruchomienie> +<s>s <klucz>=<wartość>`, na końcu `# log koniec <n>/<max>`. Trzymana na partycji `cfglog` (1024 wpisy), bez możliwości kasowania; hasło jako `***` |

Nody nie mają przycisków ani przełączników - wszystko ustawia się przez Bluetooth ze strony
testów (sekcja „Nody” → „Ustawienia”) albo kablem.

**Okno Bluetooth:** po włączeniu zasilania nod ma włączony Bluetooth. Jeśli przez 30 s nikt się z nim
nie połączy, Bluetooth jest wyłączany (zwalnia pamięć), a dopiero wtedy startuje Wi-Fi. Połączony
klient podtrzymuje Bluetooth, a po rozłączeniu okno liczy się od nowa. Nod po przejściu na Wi-Fi
odzywa się już tylko kablem USB - żeby wrócić do Bluetooth, wyłącz i włącz zasilanie.

Po dodaniu partycji `cfglog` trzeba raz wgrać całość (`pio run -t upload` wgrywa też tablicę partycji);
NVS zostaje na swoim miejscu, ustawienia nie giną. Pierwsze uruchomienie zapisuje w historii obecne ustawienia.

Nod wzorcowy (1 mikrofon, SD -> G32): `pio run -e reference -t upload`. Tryby `l`, `r`, `e`
(zdarzenie: `P <nr> <t> <szczyt dBFS>`), bez `t`.

`dXY` - o ile ramek (1/32000 s = 31,25 µs) później dźwięk dotarł do mikrofonu Y niż do X.
Poziom w dB SPL wynika z katalogowej czułości (-26 dBFS przy 94 dB SPL), bez kalibracji.

## Narzędzia PC

```
python3 tools/serial_log.py e | python3 tools/clap_view.py   # kierunek klaśnięć na żywo
python3 tools/serial_log.py t > obejscie.log                 # zapis do kalibracji
```

Wymagają `pyserial`.

## Aplikacja z testami (`app/`)

Statyczna aplikacja webowa (PWA) - Chrome na Androidzie i na komputerze, offline
po pierwszym otwarciu, można ją dodać do ekranu głównego.

- **Testy** (`index.html`): łączy się z nodami przez Bluetooth (kilka naraz), sam przełącza im
  tryby, wysyła znaczniki i zapisuje sesję z ich danymi; ustawienia nodów (Wi-Fi, kalibracja,
  tryb po starcie). Testy: pozycje stałe P1-P8 = N, NE, ... NW (kalibracyjny), seria klaśnięć, prowadzony test 4/8 kierunków, obejście
  z szumem (kalibracja geometrii), ton 1 kHz, przemiatanie częstotliwości.
  Dźwięki generowane w przeglądarce (Web Audio), identyczne na każdym telefonie.
  Każdy test podaje tryb urządzenia i prowadzi dziennik z godzinami.
- **Podgląd** (`viewer.html`): tarcza z kierunkiem klaśnięć i śledzenia, poziomy
  mikrofonów, lista zdarzeń; dla nodu wzorcowego duży odczyt poziomu i zapis stałej
  kalibracji w nodzie. Łączy się przez Bluetooth LE (Chrome na Androidzie i komputerze),
  kablem USB (Web Serial, Chrome/Edge na komputerze) albo wczytuje zapisany dziennik. Kierunek liczony metodą
  najmniejszych kwadratów z położeń mikrofonów (`direction.js`).

Lokalnie: `cd app && python3 -m http.server 8000`, potem `http://localhost:8000`.
Na Linuksie Chrome ma Web Bluetooth wyłączony - `tools/podglad_linux.sh` uruchamia serwer
i osobne okno Chrome z włączonym Bluetooth.
Publikacja: workflow `.github/workflows/pages.yml` wystawia `app/` na GitHub Pages
(Settings -> Pages -> Source: GitHub Actions). Po zmianie plików zwiększ `CACHE`
w `app/sw.js`, żeby telefony pobrały nową wersję.

## Plan

- Tryb sieciowy: wysyłanie ustrukturyzowanych danych przez Wi-Fi według kontraktu
  (Wi-Fi już się łączy i raportuje stan; brakuje kontraktu).
- Surowe dBFS w danych + plik kalibracji stosowany przy analizie.
- Kalibracja geometrii i opóźnień kanałów z testu „obejście z szumem”.
