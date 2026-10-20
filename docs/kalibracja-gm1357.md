# Kalibracja z sonometrem Benetech GM1357

Cel: zmierzyć **rzeczywisty poziom dźwięku z telefonu** (nadajnika) i **czułość mikrofonów
nodu produkcyjnego w konfiguracji użytkowej** (zamontowanych w obudowie, z osłonami).
Sonometru nie kalibrujemy, tylko przyjmujemy go jako wzorzec.

| Nazwa w tej instrukcji | Co to jest | Nazwa w firmware i Bluetooth |
|---|---|---|
| **nod produkcyjny** | matryca 4 mikrofonów w obecnej wersji obudowy | `testowy` (`SH-testowy-XXXX`) |
| **nod wzorcowy** | 1 mikrofon, pomocniczy | `wzorcowy` (`SH-wzorcowy-XXXX`) |

Standardowa kalibracja (rozdziały 2-6) potrzebuje tylko sonometru i nodu produkcyjnego.
Nod wzorcowy kalibruje się osobno, kiedy jest dostępny ([rozdział 7](#7-osobna-procedura-nod-wzorcowy)).

Wszystkie pomiary robimy na **dźwiękach generowanych przez stronę testów** (szum różowy, ton
1 kHz) w teście **„Pozycje stałe P1-P8”**. Stanowisko i pozycje P1-P8:
[stanowisko-testowe.md](stanowisko-testowe.md).

## 1. Co potrafi GM1357

| Cecha | GM1357 | Skutek dla nas |
|---|---|---|
| Klasa | typ 2 (IEC 651), ±1,5 dB | wyniki w dB SPL mają wspólną niepewność ±1,5 dB |
| Korekcja częstotliwościowa | A i C (brak Z) | używamy **C** - dla dźwięku z telefonu prawie płaska |
| Stała czasowa | FAST, SLOW | używamy **SLOW** (uśrednianie ok. 1 s) |
| Odświeżanie | 2 odczyty/s, brak Leq | odczyty spisujemy z nagrania ekranu i uśredniamy |
| Zakresy | 30-80, 50-100, 60-110, 80-130, 30-130 (auto) dB | zakres ustawiamy **ręcznie** |
| Wyłączanie | samo po 10 min bez naciśnięcia przycisku | po włączeniu wraca A i FAST - patrz punkt 2 |

Źródła: karta produktu [benetech-poland.pl](https://benetech-poland.pl/en/sound-level-meters/57-benetech-gm1357-sound-level-meter-digital-sound-level-meter-5903738810499.html),
wspólna instrukcja GM1356/1357/1358 ([manuals.plus](https://manuals.plus/ae/1005008297248614)).

**Potencjometru kalibracji (komora baterii) nie ruszamy.** Zapisujemy numer seryjny miernika
przy każdym wyniku - gdyby kiedyś był kalibrator 94 dB, stałe przeliczy się o zmierzoną
odchyłkę.

## 2. Ustawienia miernika

1. Świeże baterie.
2. **A/C → C** (na wyświetlaczu „dBC”).
3. **F/S → SLOW**.
4. **LEVEL → 50-100 dB**. Gdy pojawi się OVER albo UNDER, zmień zakres i powtórz pozycję.
5. Bez ikony MAX na wyświetlaczu.
6. Gąbka na mikrofonie: na zewnątrz zawsze. W pomieszczeniu dowolnie, ale **we wszystkich
   pomiarach tak samo**.
7. **Przy każdej zmianie pozycji telefonu** naciśnij dwa razy MAX (włącz i wyłącz). To zeruje
   licznik automatycznego wyłączenia i niczego nie zmienia. Przebieg testu trwa ponad 10 minut,
   więc bez tego miernik zgaśnie w trakcie. Jeśli jednak zgaśnie, włącz go i ustaw punkty 2-4
   od nowa.

## 3. Ustawienie fizyczne

```
  widok z boku

  telefon                                     miernik (przebiegi A, A')
  (głośnik → C)       1,000 m (P2)            albo nod (przebieg B)
  ▯ ───────────────────────────────────────── ◉══════════════════╗
  │                                           C                  ║ korpus miernika
  │ statyw                                                        ║ za mikrofonem
 ═╧═══════════════ ziemia ════════════════════════════════════════╧═ statyw
  wysokość głośnika = wysokość otworów mikrofonów = ok. 1,2 m
```

1. **Metoda podstawienia:** w punkcie C stoi albo miernik, albo nod - nigdy oba naraz.
   Korpus miernika odbija dźwięk i zafałszowałby odczyt mikrofonów nodu.
2. Czubek mikrofonu miernika (pod gąbką) dokładnie w punkcie C, na wysokości otworów
   mikrofonów nodu.
3. Miernik **skierowany na telefon**, korpus w linii za mikrofonem. Mocowanie przez gwint
   statywu w spodzie miernika. Przy każdej pozycji telefonu obróć miernik w jego stronę.
4. Operator co najmniej 1 m z boku, za telefonem. Ekran miernika nagrywa drugi telefon albo
   aparat, nie telefon-nadajnik.
5. Telefon jak w testach ([stanowisko-testowe.md, rozdział 4](stanowisko-testowe.md#4-telefon---nadajnik-dźwięku)):
   statyw, głośnik skierowany w C, stała głośność, tryb samolotowy.
6. Statywy zaznaczone na ziemi (kreda, szpilki), żeby nod i miernik trafiały w to samo miejsce.

## 4. Ustawienia testu „Pozycje stałe P1-P8”

| Parametr | Wartość |
|---|---|
| Model telefonu, głośność | wpisz - trafią do dziennika |
| Klaśnięć na pozycję | **0** |
| Szum różowy | **30 s** |
| Ton 1 kHz | **20 s** |
| Czas na odejście od telefonu | **10 s** |

Te same wartości we wszystkich przebiegach. Na każdej pozycji telefon jest najpierw cicho
(odejście), potem gra szum, potem ton.

**Stałe kalibracji liczymy tylko z szumu.** Ton odbija się od ziemi i jego poziom zmienia
się o kilka dB na odcinku kilku centymetrów, więc miernik i mikrofon nodu, choć stoją
prawie w tym samym miejscu, mogą zmierzyć różne wartości. Ton zapisujemy wyłącznie jako
poziom nadajnika.

## 5. Odczyt

Dla każdej pozycji, z nagrania ekranu miernika:

1. **Tło:** odczyt z ostatnich 3 s odejścia (telefon jeszcze cicho).
2. **Szum:** pomiń pierwsze 3 s, potem spisz odczyt co 2 s do końca szumu (ok. 13 wartości).
   Wynik = średnia. Rozrzut większy niż ±1 dB oznacza wiatr albo hałas otoczenia - powtórz
   pozycję.
3. **Ton:** tak samo jak szum (ok. 8 wartości).
4. Sygnał musi być co najmniej **10 dB powyżej tła**. Mniej - zwiększ głośność telefonu i
   zacznij od nowa (głośność musi być taka sama we wszystkich przebiegach).

Odczyty nodu (przebieg B i rozdział 7) są w pobranej sesji: wiersze `R` między znacznikiem
`Pn: szum różowy` a następnym znacznikiem. Tak samo pomiń pierwsze 3 s i uśrednij.

## 6. Przebiegi (standardowa kalibracja)

| Przebieg | W punkcie C stoi | Wynik |
|---|---|---|
| **A** | miernik | poziom nadajnika; poziom w C dla każdej pozycji: `L_C(P1..P8)` |
| **B** | nod produkcyjny (w konfiguracji użytkowej) | stałe mikrofonów M1-M4 |
| **A'** | miernik | kontrola: czy telefon nie zmienił poziomu |

Między przebiegami nie ruszaj telefonu, jego statywu ani głośności.

### Przebieg A: poziom nadajnika

1. Nod zdjęty, miernik w C. Uruchom test, przejdź wszystkie pozycje.
2. **Poziom telefonu** = średnia z P2, P4, P6, P8 (każda 1,000 m od C) - osobno dla szumu i tonu.
   Zapis: `telefon, głośność %, szum dB(C) @1 m, ton dB(C) @1 m, miernik nr …`.
3. **Kontrola odbić:** pozycje P1, P3, P5, P7 są 1,095 m od C, więc powinny wyjść o **0,8 dB**
   ciszej niż P2, P4, P6, P8. Odchyłka większa niż 1 dB na którejś pozycji oznacza odbicie
   (ściana, auto, ogrodzenie) z tej strony.

### Przebieg B: nod produkcyjny

1. Miernik zdjęty, nod produkcyjny na stanowisku: środek płyty w C, otwory mikrofonów w górę,
   M1 na północ, obudowa i osłony jak w użyciu. Połącz nod ze stroną testów i uruchom ten sam
   test.
2. Mikrofony leżą 95 mm od środka, więc są bliżej albo dalej od telefonu niż C. Poziom przy
   mikrofonie: `L(Mi, P) = L_C(P) + poprawka` z tabeli:

   | Pozycja | M1 | M2 | M3 | M4 |
   |---|---|---|---|---|
   | P1 | +0,79 | -0,03 | -0,03 | -0,72 |
   | P2 | +0,58 | +0,58 | -0,58 | -0,58 |
   | P3 | -0,03 | +0,79 | -0,72 | -0,03 |
   | P4 | -0,58 | +0,58 | -0,58 | +0,58 |
   | P5 | -0,72 | -0,03 | -0,03 | +0,79 |
   | P6 | -0,58 | -0,58 | +0,58 | +0,58 |
   | P7 | -0,03 | -0,72 | +0,79 | -0,03 |
   | P8 | +0,58 | -0,58 | +0,58 | -0,58 |

   (dB; `20·log10(odległość telefonu od C / odległość od mikrofonu)`)
3. Dla każdego mikrofonu i pozycji: `cal_Mi(P) = L(Mi, P) - Leq_dBFS,Mi(P)`.
4. Stała mikrofonu = średnia z ośmiu pozycji. Rozrzut między pozycjami to kierunkowość
   obudowy - zapisz go w dzienniku. Powyżej ±1 dB obudowa wyraźnie zmienia odbiór z
   niektórych kierunków.
5. Firmware ma **jedną** stałą na nod: średnią z M1-M4 wpisz do nodu (**Nody → Ustawienia →
   Kalibracja → Zapisz w nodzie**, strona zapyta o potwierdzenie). Różnice
   `cal_Mi - średnia` zapisz w pliku kalibracji - stosuje je analiza.

### Przebieg A': kontrola na koniec

Nod zdjęty, miernik w C, test od początku. Po pozycji P1 naciśnij **Zatrzymaj**. Szum na P1
powinien zgadzać się z przebiegiem A do **0,5 dB**. Większa różnica oznacza, że telefon
zmienił poziom (nagrzanie, oszczędzanie baterii) - przebieg B trzeba powtórzyć.

Wyniki dotyczą **obecnej wersji** nodu produkcyjnego. Po zmianie obudowy, osłon albo
mikrofonów kalibrację trzeba powtórzyć.

## 7. Osobna procedura: nod wzorcowy

Kiedy nod wzorcowy jest dostępny. Ustawienie i odczyty jak w rozdziałach 2-5.

1. Nod wzorcowy na **własnym statywie** w punkcie C, bez matrycy. **Mikrofon skierowany w górę**:
   otwór na wysokości ok. 1,2 m, poziomo, tak jak otwory nodu produkcyjnego - dźwięk z telefonu
   dochodzi do niego z boku.
2. Zaznacz, w którą stronę świata zwrócona jest krawędź modułu z mikrofonem, i ustawiaj go tak
   samo przy każdej kalibracji. Moduł nie jest symetryczny, więc obrót może zmienić odczyt.
3. Przebiegi: **A** (miernik) → **W** (nod wzorcowy w C, ten sam test) → **A'**. Jeśli robisz
   to w tej samej sesji co standardową kalibrację, bez ruszania telefonu, możesz użyć
   przebiegu A z rozdziału 6.
4. Mikrofon jest w C, więc nie ma poprawki na odległość: `cal(P) = L_C(P) - Leq_dBFS(P)`.
5. Średnią z ośmiu pozycji wpisz do nodu wzorcowego (Ustawienia → Kalibracja). Rozrzut między
   pozycjami zapisz w dzienniku - przy mikrofonie skierowanym w górę powinien być mały
   (do ±0,5 dB). Większy oznacza, że statyw albo płytka nodu zasłania mikrofon z którejś strony.

Skalibrowany nod wzorcowy służy potem do kontroli nodu produkcyjnego w terenie, bez sonometru.

## 8. Niepewność

| Wielkość | Niepewność | Skąd |
|---|---|---|
| Poziom telefonu, stałe `cal` (bezwzględnie) | ok. ±1,5 dB | sam miernik (typ 2), wspólna dla wszystkich wyników |
| Różnice między mikrofonami | ok. ±0,3-0,5 dB | powtarzalność ustawienia i odczytów |

Do kierunku i porównań między mikrofonami liczy się dokładność względna, a ta jest dużo lepsza
od klasy miernika. Poziomy w dB SPL podawaj z dopiskiem „±1,5 dB, GM1357 nr …”.

## 9. Do dziennika kalibracji

Oprócz pól z [dziennika](stanowisko-testowe.md#8-dziennik-kalibracji): wersja nodu produkcyjnego
(obudowa, osłony, firmware - `PROJECT_VER` w `controllers/firmware/CMakeLists.txt`), gąbka tak/nie, zakres
miernika, dla każdej pozycji tło, średnia i rozrzut odczytów, wynik kontroli odbić (przebieg A)
i kontroli końcowej (A').
