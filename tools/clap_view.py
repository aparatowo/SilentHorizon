#!/usr/bin/env python3
"""Czytelny podgląd wyników clap_test.py (uruchamiać na PC).

    python3 tools/serial_log.py e | python3 tools/clap_view.py          (firmware)
    mpremote connect /dev/ttyUSB0 run controllers/micropython/clap_test.py | python3 tools/clap_view.py

Z opóźnień między mikrofonami wyznacza kierunek źródła (model fali płaskiej).
Azymut geograficzny przy matrycy ustawionej M1 na północ: 0 st. = N, 90 = E, 180 = S, 270 = W.
"""

import math
import sys

RATE = 32000            # musi się zgadzać z clap_test.py
SIDE_M = 0.19 / math.sqrt(2)  # bok kwadratu: mikrofony 9.5 cm od środka
SOUND_MPS = 343.0
DBFS_TO_DB_SPL = 120.0

FRAME_US = 1e6 / RATE
MAX_SIDE = SIDE_M / SOUND_MPS * RATE  # maks. opóźnienie wzdłuż boku [ramki]
MOUNT_ROTATION_DEG = 45  # M1 na północ: azymut geograficzny = azymut w układzie matrycy + 45
SECTORS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


def describe(fields):
    n, t, d12, d34, d13, d24 = int(fields[0]), *map(float, fields[1:6])
    peaks = [float(v) + DBFS_TO_DB_SPL for v in fields[6:10]]

    # Czasy dotarcia względem M1; M4 uśredniony z dwóch dróg (przez M2 i przez M3).
    arrival = {1: 0.0, 2: d12, 3: d13, 4: (d12 + d24 + d13 + d34) / 2}
    first = min(arrival.values())
    order = sorted(arrival, key=arrival.get)
    delays = "  ".join("M%d %+4.0f" % (m, (arrival[m] - first) * FRAME_US) for m in (1, 2, 3, 4))

    # Fala płaska: d12 = -ux * MAX_SIDE, d13 = uy * MAX_SIDE (y w górę, x w prawo).
    ux = -(d12 + d34) / 2 / MAX_SIDE
    uy = (d13 + d24) / 2 / MAX_SIDE
    azimuth = (math.degrees(math.atan2(ux, uy)) + MOUNT_ROTATION_DEG) % 360
    in_plane = math.hypot(ux, uy)
    sector = SECTORS[int((azimuth + 22.5) // 45) % 8]

    closure = d13 + d34 - d24 - d12
    worst = max(abs(d12), abs(d34), abs(d13), abs(d24))
    if math.isnan(closure) or worst > MAX_SIDE + 2 or abs(closure) > 1.5:
        verdict = "  !! niewiarygodny (różne dźwięki w parach lub pogłos)"
    else:
        elevation = math.degrees(math.acos(min(in_plane, 1.0)))
        verdict = "  ~%2.0f st. poza płaszczyzną matrycy" % elevation

    print("#%-3d t=%6.2f s  kierunek %3.0f st. (%s)%s" % (n, t, azimuth, sector, verdict))
    print("      dotarcie [us]: %s   kolejność: %s" % (delays, " > ".join("M%d" % m for m in order)))
    print("      szczyt [dB SPL]: %s" % "  ".join("M%d %5.1f" % (m, p) for m, p in zip((1, 2, 3, 4), peaks)))


def main():
    for line in sys.stdin:
        line = line.strip()
        if line.startswith("K "):
            describe(line.split()[1:])
        elif line.startswith("S "):
            continue
        elif line:
            print(line)
        sys.stdout.flush()


if __name__ == "__main__":
    main()
