# Połączenia

Nody nie mają przycisków ani przełączników: sterowanie i ustawienia przez Bluetooth
(strona testów) albo kabel USB.

Trzy płytki:

- **ESP32 (obecna płytka rozwojowa)** - nod testowy z 4 mikrofonami.
- **ESP32-S3 (docelowa)** - nod testowy z 4 mikrofonami, karta SD w szybkim trybie.
- **ESP32 (nod wzorcowy)** - 1 mikrofon, Bluetooth LE do kontroli w terenie.

Mikrofony: INMP441. Wszystkie zasilane z **3,3 V** (nigdy z 5 V).

## Mikrofon INMP441 - wyprowadzenia

| Pin | Znaczenie |
|---|---|
| VDD | zasilanie 3,3 V |
| GND | masa |
| SCK | zegar bitowy (z płytki) |
| WS | wybór kanału (z płytki) |
| SD | dane (do płytki) |
| L/R | wybór kanału: **GND = lewy**, **3,3 V = prawy** |

Dwa mikrofony mogą dzielić jedną linię SD, jeśli jeden ma L/R = GND, a drugi L/R = 3,3 V.
Tak powstaje para.

## Zasady ogólne

1. Przewody SCK, WS i SD jak najkrótsze (do 20 cm). Dłuższe - skręcone z przewodem masy.
2. Przy każdym mikrofonie kondensator 100 nF między VDD a GND.
3. Przy płytce: rezystor 33 Ω szeregowo w liniach SCK i WS (tłumi zakłócenia przy 4 mikrofonach na jednej linii).
4. Nod nie ma przycisków ani przełączników - tryb, znaczniki i ustawienia (także Wi-Fi) zmienia się
   przez Bluetooth ze strony testów albo kablem USB. Ustawienia zostają w pamięci flash nodu.

## Kolory przewodów

Każda para ma własny komplet kolorów - od razu widać, który przewód należy do której pary.

| Sygnał | Para NR1 (M1, M2) | Para NR2 (M3, M4) | ESP32 | ESP32-S3 |
|---|---|---|---|---|
| VCC (3,3 V) | 🟥 czerwony | 🟫 brązowy | 3V3 | 3V3 |
| GND | 🟦 niebieski | ⬛ czarny | GND | GND |
| SD (dane) | 🟧 pomarańczowy | ⬜ biały | G32 (NR1) / G33 (NR2) | G6 (NR1) / G7 (NR2) |
| SCK (zegar) | 🟨 żółty | 🟪 fioletowy | G14 | G4 |
| WS (kanał) | 🟩 zielony | ◻️ szary | G15 | G5 |

- **SCK i WS obu par idą do tych samych pinów płytki**: żółty i fioletowy razem do pinu SCK,
  zielony i szary razem do pinu WS. Różne kolory są tylko po to, żeby odróżnić pary.
- **SD obu par idą do różnych pinów** - pomarańczowy do pinu pary NR1, biały do pinu pary NR2.
- **L/R nie ma osobnego przewodu**: łączy się na module mikrofonu - w M1 i M3 z GND
  (niebieski / czarny), w M2 i M4 z VCC (czerwony / brązowy).

Przykład dla M3 (para NR2, kanał lewy) na ESP32: brązowy → 3V3, czarny → GND, biały → G33,
fioletowy → G14, szary → G15, L/R na module zwarty z GND.

---

## 1. ESP32 - obecna płytka rozwojowa (nod testowy)

### Mikrofony

```
  wspólne dla M1, M2, M3, M4:   VDD -> 3V3    GND -> GND    SCK -> G14    WS -> G15

      M1  (L/R -> GND)                M2  (L/R -> 3V3)
         SD ─────────────┬──────────────── SD
                         └────────────────────────► G32    para NR1 (góra)

      M3  (L/R -> GND)                M4  (L/R -> 3V3)
         SD ─────────────┬──────────────── SD
                         └────────────────────────► G33    para NR2 (dół)
```

Kolory przewodów: tabela „Kolory przewodów” wyżej.

| Mikrofon | VDD | GND | SCK | WS | SD | L/R |
|---|---|---|---|---|---|---|
| M1 (lewy górny) | 3V3 | GND | G14 | G15 | G32 | GND |
| M2 (prawy górny) | 3V3 | GND | G14 | G15 | G32 | 3V3 |
| M3 (lewy dolny) | 3V3 | GND | G14 | G15 | G33 | GND |
| M4 (prawy dolny) | 3V3 | GND | G14 | G15 | G33 | 3V3 |

### Dioda

G2 - dioda na płytce (stan urządzenia). Nic więcej nie trzeba podłączać.

### Karta microSD (moduł SPI, 3,3 V)

| Moduł SD | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| CLK / SCK | G18 |
| MISO / DO | G19 |
| MOSI / DI | G23 |
| CS | G5 |

Szybki tryb karty (SDMMC) na tej płytce jest niedostępny - jego piny to G14 i G15, zajęte przez mikrofony.

### Pinów nie używaj

G0, G2, G5, G12, G15 jako wejść (wpływają na start płytki; G15 i G5 są już bezpiecznie użyte),
G6-G11 (pamięć flash), G34-G39 tylko jako wejścia bez podciągania.

---

## 2. ESP32-S3 - płytka docelowa (nod testowy)

Moduł **ESP32-S3-WROOM-1 N16R8** (16 MB flash, 8 MB PSRAM).

### Mikrofony

```
  wspólne dla M1, M2, M3, M4:   VDD -> 3V3    GND -> GND    SCK -> G4    WS -> G5

      M1  (L/R -> GND)                M2  (L/R -> 3V3)
         SD ─────────────┬──────────────── SD
                         └────────────────────────► G6     para NR1 (góra)

      M3  (L/R -> GND)                M4  (L/R -> 3V3)
         SD ─────────────┬──────────────── SD
                         └────────────────────────► G7     para NR2 (dół)
```

Kolory przewodów: tabela „Kolory przewodów” wyżej (te same co na ESP32, inne piny).

| Mikrofon | VDD | GND | SCK | WS | SD | L/R |
|---|---|---|---|---|---|---|
| M1 | 3V3 | GND | G4 | G5 | G6 | GND |
| M2 | 3V3 | GND | G4 | G5 | G6 | 3V3 |
| M3 | 3V3 | GND | G4 | G5 | G7 | GND |
| M4 | 3V3 | GND | G4 | G5 | G7 | 3V3 |

### Dioda

Dioda RGB na płytce DevKitC-1: G48 (wersja 1.0) albo G38 (wersja 1.1) - nie używaj tych pinów
do innych celów.

### Karta microSD (tryb SDMMC 4-bit, szybki)

| Moduł SD | ESP32-S3 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| CLK | G12 |
| CMD | G11 |
| D0 | G13 |
| D1 | G14 |
| D2 | G9 |
| D3 | G10 |

Potrzebny moduł z wyprowadzonymi D0-D3 (nie sam SPI). Linie CMD i D0-D3 z rezystorami
10 kΩ do 3,3 V (wiele modułów ma je na płytce).

### Pinów nie używaj

G0, G3, G45, G46 (start płytki), G19, G20 (USB), G26-G37 (flash i PSRAM), G43, G44 (port szeregowy).

---

## 3. Nod wzorcowy - ESP32

Ten sam kod co nod testowy, Bluetooth LE do kontroli w terenie. Może to być obecna płytka
rozwojowa po przejściu nodu testowego na S3.

```
   INMP441 (wzorcowy)              ESP32
   VDD  ─────────────────────────  3V3
   GND  ─────────────────────────  GND
   SCK  ─────────────────────────  G14
   WS   ─────────────────────────  G15
   SD   ─────────────────────────  G32
   L/R  ─────────────────────────  GND

   G2  - dioda na płytce
```

Nod wzorcowy ma jednocześnie port szeregowy i Bluetooth LE (nazwa `SH-wzorcowy-XXXX`).

**Zasilanie:** przy starcie radia płytka chwilowo pobiera dużo prądu. Słaby port USB albo
cienki kabel powoduje reset („Brownout detector was triggered”). Używaj dobrego kabla i portu
z pełnym prądem; zalecany kondensator 100-470 µF między 3V3 a GND.

ESP8266 rozważany i odrzucony: nie ma Bluetooth LE, więc w terenie działałby tylko z laptopem.
