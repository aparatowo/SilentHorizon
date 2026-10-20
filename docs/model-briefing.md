# Briefing: model wykrywania dronów na ESP32-S3

Stan na 2026-10-15. Dokument zbiera, co trzeba przygotować, zanim zacznie się
budowa modelu, i w jakiej kolejności. Nic z tego nie jest jeszcze zrobione.

## 1. Cel

- Wykrywanie drona po dźwięku silników, lokalnie na urządzeniu, bez sieci.
- Wynik: „dron / nie-dron” z pewnością, docelowo także typ lub klasa drona.
- Połączenie z kierunkiem: model mówi *co*, opóźnienia między mikrofonami (już
  działające) mówią *skąd*.
- Wynik trafia tym samym kanałem co reszta danych: port szeregowy, BLE (tryb
  terenowy), sieć według kontraktu (tryb sieciowy).

## 2. Co już mamy

| Element | Stan |
|---|---|
| Matryca 4 mikrofonów INMP441, płytka rozwojowa ESP32 | działa |
| Firmware C (ESP-IDF): synchroniczny, wyrównany strumień 4-kanałowy 32 kHz, filtr górnoprzepustowy 30 Hz | działa |
| Wyznaczanie kierunku (opóźnienia między mikrofonami) | działa; wymaga kalibracji geometrii |
| Aplikacja testowa (PWA) i podgląd w przeglądarce | działa |
| Karta SD: nagrywanie i odtwarzanie nagrań zamiast mikrofonów | do zrobienia |
| Wspólny format danych (JSON po jednym rekordzie w linii) | do zrobienia |
| BLE do telefonu | do zrobienia |

## 3. Dane

### 3.1 Baza nagrań silników dronów (zewnętrzna)

Do ustalenia przed startem:

- nazwa i źródło bazy, **licencja** (czy wolno trenować, czy wolno udostępniać testerom);
- format plików (WAV/FLAC/MP3), częstotliwość próbkowania, liczba kanałów;
- opis nagrań: typ drona, odległość, warunki, czy są fragmenty bez drona;
- rozmiar (GB / godziny).

Nagrania **nie trafiają do repozytorium gita** (rozmiar, licencje). W repo zostają
narzędzia i opis, skąd pobrać dane.

### 3.2 Klasa „nie-dron” - równie ważna jak drony

Bez niej model będzie dawał fałszywe alarmy. Potrzebne nagrania co najmniej:
wiatr (także w mikrofon), ruch uliczny, motocykle, kosiarki i sprzęt ogrodowy,
owady (zwłaszcza bzyczenie blisko mikrofonu), ptaki, głosy, deszcz, samoloty
i śmigłowce (wysoko), wentylatory i klimatyzatory.

### 3.3 Własne nagrania z naszej matrycy

Baza była nagrana innymi mikrofonami, w innych warunkach. Model trenowany tylko
na niej gorzej działa na naszym sprzęcie. Potrzebne są więc własne nagrania:

- z tej samej matrycy (najlepiej już z docelowej płytki S3 i z osłonami przeciwwietrznymi);
- dron w różnych odległościach (np. 10, 25, 50, 100 m), wysokościach i kierunkach;
- różne warunki: cisza, wiatr, tło miejskie;
- osobne sesje samego tła (bez drona) w tych samych miejscach.

Narzędzie: tryb nagrywania na kartę SD (WAV 4-kanałowy + opis sesji).

### 3.4 Podział na zbiory

Uczący / walidacyjny / testowy **według sesji i egzemplarzy dronów**, nie według
losowych fragmentów. Fragmenty jednego nagrania w obu zbiorach zawyżają wyniki.
Zbiór testowy powinien zawierać sesje nagrane naszą matrycą.

## 4. Przygotowanie materiałów (PC)

Planowane narzędzie `tools/prepare_sd.py`:

1. Ujednolicenie: przepróbkowanie, jeden format 4-kanałowego WAV czytanego przez firmware.
2. Rozłożenie przestrzenne: jednokanałowe nagranie -> 4 kanały z opóźnieniami jak
   dla źródła pod zadanym kątem (stałym lub zmiennym - przelot), z geometrią matrycy.
3. Domieszanie tła w zadanym stosunku sygnału do szumu (SNR).
4. Plik opisu do każdego nagrania: etykieta, kąt w czasie, SNR - „prawda” do
   porównania z wynikami urządzenia.

Te same pliki służą do powtarzalnych testów firmware (odtwarzanie z karty zamiast mikrofonów).

## 5. Cechy i model (punkt wyjścia)

| Decyzja | Propozycja | Uzasadnienie |
|---|---|---|
| Próbkowanie dla modelu | 16 kHz (decymacja z 32 kHz) | tony śmigieł ok. 100-400 Hz + harmoniczne do kilku kHz |
| Wejście | suma 4 kanałów wyrównana na kierunek źródła (prosty beamforming) | ok. +6 dB SNR względem jednego mikrofonu; model jednokanałowy |
| Okno | 1 s, krok 0,5 s | kompromis: rozdzielczość harmonicznych vs opóźnienie decyzji |
| Cechy | log-mel 40-64 pasm, ramka 25 ms, krok 10 ms | standard dla klasyfikacji dźwięków; FFT z ESP-DSP |
| Model | mała sieć konwolucyjna (np. DS-CNN), int8 | 20-200 KB wag; mieści się w RAM S3 z zapasem |
| Uczenie | TensorFlow/Keras -> TFLite int8 | sprawdzona ścieżka na mikrokontrolery |
| Wdrożenie | `esp-tflite-micro` lub ESP-DL (przyspieszenie na S3) | oba integrują się z ESP-IDF |
| Szybka ścieżka do prototypu | Edge Impulse | gotowy potok dane -> model -> biblioteka C++; mniej kontroli |

Augmentacja: mieszanie z tłem przy różnym SNR, zmiana wzmocnienia, przesunięcie
w czasie, lekka zmiana wysokości tonu (inne obroty silników), symulacja wiatru.

Później do rozważenia: wejście wielokanałowe (model sam korzysta z różnic między
mikrofonami), śledzenie kilku źródeł naraz.

## 6. Jak oceniać

- Skuteczność wykrycia w funkcji odległości i SNR (krzywa, nie jedna liczba).
- Fałszywe alarmy na godzinę na nagraniach samego tła - kluczowe w terenie.
- Opóźnienie od pojawienia się dźwięku do decyzji.
- Zasoby na urządzeniu: czas wnioskowania, RAM, zużycie energii.
- Zgodność kierunku z „prawdą” z plików opisu (błąd kąta).

## 7. Integracja w firmware

- Model jako kolejny odbiorca wyrównanego strumienia (obok poziomu, zdarzeń, śledzenia).
- Cechy i wnioskowanie na rdzeniu 0, pomiar zostaje na rdzeniu 1.
- Bufor ostatnich kilku sekund w PSRAM - pozwala zapisać na kartę fragment sprzed wykrycia.
- Rekord wyniku w formacie JSON, np.
  `{"type":"detection","t":12.5,"class":"drone","confidence":0.93,"azimuth":214}`
  - ten sam w kontrakcie sieciowym, przez BLE i port szeregowy.

## 8. Sprzęt docelowy

- ESP32-S3-WROOM-1 **N16R8** (16 MB flash, 8 MB PSRAM). GPIO 35-37 zajęte przez PSRAM.
- Karta microSD w trybie SDMMC 4-bit (na S3 dowolne piny).
- Osłony przeciwwietrzne na mikrofony - wiatr to główne źródło fałszywych alarmów.
- Sztywne mocowanie matrycy (geometria znana z dokładnością ~1 mm).
- Do rozważenia: mikrofony TDM (np. ICS-52000) - wszystkie na jednej linii danych.

## 9. Kolejność kroków

1. Wspólny format JSON + BLE (w toku planowania).
2. Czytnik SD na płytce rozwojowej (SPI: CLK G18, MISO G19, MOSI G23, CS G5):
   nagrywanie i odtwarzanie z karty.
3. Informacje o bazie (sekcja 3.1) -> `tools/prepare_sd.py`.
4. Kalibracja geometrii matrycy (test „obejście z szumem”).
5. Prototyp modelu na PC na bazie + klasie „nie-dron”; ocena według sekcji 6.
6. Płytka S3 N16R8; własne nagrania terenowe (sekcja 3.3).
7. Douczenie na własnych nagraniach, wdrożenie int8 na S3, testy z odtwarzaniem z karty i w terenie.

## 10. Otwarte decyzje

- Klasy wyjściowe: tylko dron/nie-dron czy także typy dronów?
- Wymagany zasięg wykrycia i dopuszczalna liczba fałszywych alarmów.
- Ścieżka uczenia: własny potok (TensorFlow) czy Edge Impulse.
- Kto i gdzie przechowuje bazę nagrań oraz własne nagrania (dostęp dla testerów).
