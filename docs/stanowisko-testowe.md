# Stanowisko testowe

Instrukcja krok po kroku: budowa matrycy, wyznaczenie 8 pozycji, nod wzorcowy,
przebieg testu i kalibracja. Połączenia elektryczne: [polaczenia.md](polaczenia.md).

## 1. Matryca mikrofonów

### Wymiary

```
          (widok konstrukcyjny; w terenie M1 wskazuje północ)
          M1 ●───────────────● M2
              \             /
               \  134 mm   /
                \         /
                 \       /         M1-M2, M2-M4, M4-M3, M3-M1 = 134,4 mm (boki)
                  \     /          M1-M4, M2-M3             = 190,0 mm (przekątne)
                   \   /           każdy mikrofon            =  95,0 mm od środka
                     ✚  środek (tu nod wzorcowy)
                   /   \
                  /     \
                 /       \
                /         \
               /           \
          M3 ●───────────────● M4
```

Mierzymy zawsze **do środka otworu akustycznego** mikrofonu, nie do krawędzi modułu.
W INMP441 otwór jest w płytce modułu - po stronie przeciwnej do kostki mikrofonu.

### Jak zbudować

1. Weź sztywną płytę (sklejka, plexi, płytka drukowana) - nie może się wyginać.
2. Zaznacz środek. Narysuj przez niego dwie linie **prostopadłe do siebie** (ramiona X).
3. Na każdej linii odmierz **95,0 mm** od środka w obie strony - to miejsca otworów.
4. Przykręć lub przyklej moduły tak, żeby otwór leżał dokładnie na znaczniku.
   **Wszystkie otwory skierowane w tę samą stronę** (np. w górę).
5. Sprawdź suwmiarką lub linijką:
   - cztery boki po **134,4 mm**,
   - dwie przekątne po **190,0 mm**.
   Równe przekątne = kąt prosty. Tolerancja: **±1 mm**.
6. Zapisz zmierzone wartości (wszystkie 6) - trafią do pliku geometrii.
7. Narysuj na płycie strzałkę **„N”** od środka przez M1 (kierunek montażu w terenie) i podpisz M1-M4.

Dlaczego tak dokładnie: 1 mm błędu położenia to ok. 3 µs błędu czasu, a urządzenie mierzy
czas z dokładnością ok. 1,5 µs.

## 2. Ustawienie nodu

**Zasada: mikrofon M1 skierowany na północ.** Dotyczy tylko ustawienia - budowa matrycy
i numeracja mikrofonów się nie zmieniają.

1. Płyta z mikrofonami **poziomo**, otworami w górę, na statywie na wysokości ok. 1,2 m.
2. Pod środkiem płyty zaznacz punkt na ziemi (pion: sznurek z ciężarkiem). To **punkt C**.
3. Obróć płytę tak, żeby ramię X ze środka przez **M1 wskazywało północ**:
   - kompas w telefonie z włączoną opcją **„północ geograficzna”** (true north);
   - zwykły kompas pokazuje północ magnetyczną - w Polsce różnica to ok. 6-8° na wschód;
     dokładną wartość dla miejsca podaje kalkulator deklinacji magnetycznej (np. NOAA);
   - kompas trzymaj z dala od metalu i elektroniki (statyw, laptop, płytka nodu).
4. Zapisz wysokość płyty nad ziemią i to, jak wyznaczono północ (kompas, mapa, GPS).
5. Wokół: co najmniej 5 m wolnej przestrzeni od ścian i aut (na zewnątrz).

Podgląd i program analizy podają **azymut geograficzny** (0° = N, 90° = E, 180° = S,
270° = W), przy założeniu, że M1 wskazuje północ. Inne ustawienie trzeba wpisać
w `app/direction.js` (stała `MOUNT_ROTATION_DEG`) i `tools/clap_view.py`.

## 3. Osiem pozycji testowych

Pozycje idą **zgodnie z ruchem wskazówek zegara, patrząc z góry**, co 45°, zaczynając od M1
- czyli dokładnie po kierunkach świata.

| Pozycja | Kierunek | Azymut | Gdzie | 1 m od | Od środka C |
|---|---|---|---|---|---|
| **P1** | N | 0° | przed M1 | otworu M1 | **1,095 m** |
| **P2** | NE | 45° | między M1 i M2 | środka | **1,000 m** |
| **P3** | E | 90° | przed M2 | otworu M2 | **1,095 m** |
| **P4** | SE | 135° | między M2 i M4 | środka | **1,000 m** |
| **P5** | S | 180° | przed M4 | otworu M4 | **1,095 m** |
| **P6** | SW | 225° | między M4 i M3 | środka | **1,000 m** |
| **P7** | W | 270° | przed M3 | otworu M3 | **1,095 m** |
| **P8** | NW | 315° | między M3 i M1 | środka | **1,000 m** |

Widok z góry, północ u góry:

```
                           P1  N 0°
                           1,095 m
                              │
          P8  NW 315°         │          P2  NE 45°
          1,000 m             M1         1,000 m
                    ╲       ╱    ╲      ╱
                      ╲   ╱        ╲  ╱
   P7  W 270° ───── M3        C ✚      M2 ───── P3  E 90°
   1,095 m            ╱  ╲         ╱  ╲          1,095 m
                    ╱       ╲    ╱      ╲
          P6  SW 225°         M4         P4  SE 135°
          1,000 m             │          1,000 m
                              │
                           P5  S 180°
                           1,095 m
```

Różnica odległości (1,095 m vs 1,000 m) jest zamierzona. Program analizy zna dokładne
położenia i sam ją uwzględnia - w środku matrycy to 0,79 dB różnicy poziomu.

### Wyznaczanie miarą laserową

Wszystkie pozycje mierzymy **od jednego punktu - środka C**. Mniej okazji do pomyłki.
Najpierw ustaw matrycę M1 na północ (rozdział 2) - pozycje wyznacza się względem niej.

1. Ustaw miarę laserową nad punktem C, na wysokości płyty, tylną krawędzią w środku matrycy.
2. Celuj wzdłuż ramienia X przez otwór M1 (na północ). Odmierz **1,095 m** - zaznacz **P1** na ziemi.
3. Sprawdź: od otworu M1 do P1 powinno wyjść **1,000 m**.
4. Tak samo P3 (przez M2, wschód), P5 (przez M4, południe), P7 (przez M3, zachód).
5. Pozycje między mikrofonami (P2, P4, P6, P8): celuj w połowę odległości między sąsiednimi P,
   odmierz **1,000 m**.
6. **Kontrola kątów** - zmierz odległości między sąsiednimi pozycjami:
   - każda para sąsiadów (P1-P2, P2-P3, ... P8-P1): **0,806 m**,
   - przeciwległe P2-P6 i P4-P8: **2,000 m**,
   - przeciwległe P1-P5 i P3-P7: **2,190 m**.
   Tolerancja ±1 cm (to ok. 0,5° kąta).
7. Oznacz pozycje trwale (kołek, farba) i sfotografuj układ z zaznaczoną północą.

## 4. Telefon - nadajnik dźwięku

1. Telefon na **statywie** (nie w ręce) - powtarzalność.
2. Głośnik telefonu (zwykle dolna krawędź) **dokładnie nad znacznikiem pozycji**,
   na wysokości płyty z mikrofonami, skierowany w środek matrycy.
3. Głośność multimediów: **stała, zapisana** (np. 100%). Efekty dźwięku wyłączone.
4. Tryb samolotowy, wyciszone powiadomienia.
5. Zawsze ten sam telefon w danej serii testów - zapisz jego model.

## 5. Nod wzorcowy

**Do czego służy:** mierzy poziom dźwięku w środku matrycy jednym mikrofonem. Po skalibrowaniu
jest wzorcem: porównujemy z nim mikrofony nodu testowego.

**Czego nie robi:** nie mierzy kierunku. Ma osobny zegar, więc nie da się porównać czasów
dotarcia z nodem testowym co do mikrosekund.

### Ustawienie

1. Mikrofon wzorcowy w **środku matrycy** (punkt przecięcia ramion X).
2. Otwór w tej samej płaszczyźnie co otwory M1-M4, skierowany w tę samą stronę.
3. Moduł mocowany na cienkim wsporniku; płytka nodu i przewody **pod** płytą matrycy.
4. Mikrofon wzorcowy tego samego typu co pozostałe (INMP441). Płytka: ESP32.

### Połączenie z telefonem (Bluetooth)

1. Zasil nod (port USB lub powerbank - musi dawać pełny prąd, inaczej radio resetuje płytkę).
2. Na telefonie otwórz stronę podglądu w Chrome, naciśnij **Połącz przez Bluetooth**,
   wybierz **SH-wzorcowy-XXXX**.
3. Tryb **Odniesienie** - poziom co sekundę. Stałą kalibracji wpisujesz w polu
   „Stała kalibracji” i zapisujesz przyciskiem **Zapisz w nodzie**. Ustawienia Wi-Fi i tryb po starcie:
   strona testów → sekcja **Nody** → **Ustawienia**.

### Sesja z obu nodów

Strona testów łączy się przez Bluetooth z oboma nodami naraz (sekcja **Nody**, przycisk
**+ Bluetooth** dwa razy). W trakcie testu sama:

- przełącza nodom tryby (klaśnięcia → zdarzenia, szum i ton → odniesienie),
- wysyła znaczniki („P3: szum różowy”) - trafiają do danych nodu z jego czasem,
- zapisuje wszystko w jednym dzienniku sesji z czasem telefonu - przycisk **Pobierz sesję**.

Plik sesji można wczytać w podglądzie. Kabel USB działa tak samo (przycisk **+ USB**, komputer).

### Oprogramowanie nodu wzorcowego

| Funkcja | Opis |
|---|---|
Wgranie: `cd controllers/firmware && pio run -e reference -t upload`.

| Funkcja | Jak | Stan |
|---|---|---|
| Poziom do kalibracji | tryb `r`: Leq i szczyt co 1 s w dBFS | gotowe |
| Poziom w dB SPL | tryb `l`: Leq co 5 s | gotowe |
| Zdarzenia (klaśnięcia) | tryb `e`: szczyt i czas | gotowe |
| Stała kalibracji | `cal 121.3` + Enter (zapis w pamięci nodu), `cal` + Enter (odczyt) | gotowe |
| Znaczniki pozycji | `mark <tekst>` - wysyła strona testów | gotowe |
| Ustawienia w pamięci flash | `set mode/cal/wifi/wifi_ssid/wifi_pass/node_id/lat/lon`, `cfg` - ekran „Ustawienia” na stronie testów | gotowe |
| Historia zmian ustawień | `log` - wpisy w pamięci nodu, bez kasowania | gotowe |
| W terenie | Bluetooth LE: strona testów i podglądu na telefonie | gotowe |

Nod testowy ma te same tryby `r` i `cal` - porównanie obu nodów robi się w trybie `r`.

## 6. Przebieg testu (8 pozycji)

1. Uruchom oba nody i zapis sesji na komputerze.
2. Zmierz **tło**: 30 s ciszy bez odtwarzania. Sygnał testowy musi być co najmniej 10 dB głośniejszy od tła.
3. W aplikacji połącz oba nody (sekcja **Nody**), wybierz test **„Pozycje stałe P1-P8”**.
   Wpisz model telefonu i głośność.
4. Dla każdej pozycji od P1 do P8:
   1. ustaw telefon na pozycji,
   2. odsuń się co najmniej 1 m za telefon (ciało odbija dźwięk),
   3. naciśnij **Start pozycji** w aplikacji - zagra seria: klaśnięcia, szum różowy, ton 1 kHz,
   4. poczekaj na koniec, przejdź do następnej pozycji.
5. Na końcu ponownie 30 s tła.
6. Zapisz: datę, temperaturę, wiatr, uwagi. Pobierz sesję z aplikacji (**Pobierz sesję**).

## 7. Kalibracja

### Zasada

Urządzenia zapisują **surowe wartości (dBFS)**. Poprawki kalibracyjne są w osobnym pliku
(z datą i wersją) i stosuje się je przy analizie. Dzięki temu dzisiejsze pomiary
można przeliczyć później, gdy będzie dostępny miernik.

Trzy poziomy kalibracji:

| Etap | Co kalibrujemy | Czym |
|---|---|---|
| **Dziś** | nic bezwzględnie; różnice między mikrofonami (względem wzorcowego) | nod wzorcowy, czułość z karty katalogowej |
| **Z miernikiem** | nod wzorcowy (bezwzględnie) i poziom nadajnika (telefonu) | miernik poziomu dźwięku |
| **W terenie** | kontrola nodu testowego | skalibrowany nod wzorcowy + telefon |

### Rady do miernika poziomu dźwięku

**Sonometr Benetech GM1357** (typ 2, bez korekcji Z i Leq): ustawienia, ustawienie fizyczne
i procedury dla tego miernika są w [kalibracja-gm1357.md](kalibracja-gm1357.md). Poniżej zalecenia ogólne.

(Zakładam, że „sonograf” to miernik poziomu dźwięku - sonometr.)

1. **Klasa 1 lub 2** (norma IEC 61672), najlepiej z **kalibratorem akustycznym** (94 dB przy 1 kHz).
2. Przed i po każdej sesji sprawdź miernik kalibratorem. Zapisz odczyt. Różnica > 0,3 dB - sesja podejrzana.
3. Ustawienia:
   - korekcja częstotliwościowa **Z** (płaska) albo **C** - **nie A** (nasze urządzenie mierzy bez korekcji A),
   - pomiar **Leq** w stałym czasie (np. 10 s) dla szumu i tonu,
   - **Lpeak** (Z) dla klaśnięć.
4. Miernik na statywie. Operator co najmniej 1 m za miernikiem, z boku.
5. **Metoda podstawienia**: mikrofon miernika dokładnie w miejscu otworu mikrofonu wzorcowego
   (nod wzorcowy na ten czas zdjęty), na tej samej wysokości, skierowany tak samo.
6. Poziom sygnału w miejscu pomiaru: **70-90 dB**, co najmniej 10 dB ponad tłem.

### Kalibracja nodu wzorcowego (z miernikiem)

1. Telefon na pozycji P2 (1,000 m od środka).
2. Odtwórz szum różowy 30 s - zmierz miernikiem Leq w środku matrycy.
3. Wstaw nod wzorcowy w to samo miejsce, odtwórz to samo - odczytaj Leq w dBFS.
4. Stała kalibracji = Leq miernika - Leq nodu (tryb `r`, dBFS). Zapisz ją w nodzie (strona testów →
   **Ustawienia** nodu → „Stała kalibracji”, albo komenda `set cal <wartość>`) i w pliku kalibracji.
5. Powtórz dla tonu 1 kHz i dla dwóch głośności - wyniki powinny się zgadzać do ±0,5 dB.

### Poziom nadajnika (z miernikiem)

1. Miernik w środku matrycy, telefon na P2, stała głośność.
2. Zmierz Leq każdego sygnału testowego (szum różowy, ton 1 kHz) i Lpeak klaśnięcia.
3. Zapisz w pliku kalibracji razem z modelem telefonu i głośnością.
4. Powtarzaj co kilka sesji - telefon może zmienić głośność po aktualizacji.

### Kalibracja mikrofonów nodu testowego (względem wzorcowego)

1. Test „Pozycje stałe P1-P8” z nodem wzorcowym w środku.
2. Program analizy porównuje poziom każdego z M1-M4 z wzorcowym, z poprawką na odległość
   (zna położenia pozycji i mikrofonów).
3. Wynik: poprawka czułości dla każdego mikrofonu - do pliku kalibracji.

### Kontrola w terenie

1. Nod wzorcowy w środku nodu testowego (albo tuż obok, w tej samej płaszczyźnie).
2. Telefon w stałej odległości, szum różowy 30 s.
3. Porównaj poziomy. Różnica większa niż **1 dB** od wartości z pracowni - sprawdź osłony
   przeciwwietrzne, wilgoć, mocowanie mikrofonów; w razie potrzeby powtórz kalibrację.

## 8. Dziennik kalibracji

Prowadź jeden plik z wpisami:

- data, miejsce, temperatura, wilgotność, wiatr,
- miernik (model, numer seryjny), odczyt kalibratora przed i po,
- telefon (model), głośność,
- stałe: nod wzorcowy, poziom nadajnika, poprawki M1-M4,
- uwagi.
