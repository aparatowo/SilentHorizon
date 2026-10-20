#!/usr/bin/env python3
"""Generuje powtarzalną serię syntetycznych klaśnięć do testu kierunku (WAV 48 kHz)."""

import math
import random
import struct
import wave

RATE = 48000
LEAD_IN_S = 3.0      # cisza na ustawienie telefonu
CLAPS = 6
INTERVAL_S = 3.0
CLAP_MS = 30
PEAK = 0.9           # szczyt względem pełnej skali


def biquad(x, b, a):
    y, x1, x2, y1, y2 = [], 0.0, 0.0, 0.0, 0.0
    for v in x:
        out = (b[0] * v + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0]
        x2, x1, y2, y1 = x1, v, y1, out
        y.append(out)
    return y


def bandpass(x, f0, q):
    # Filtr pasmowy (RBJ audio EQ cookbook).
    w0 = 2 * math.pi * f0 / RATE
    alpha = math.sin(w0) / (2 * q)
    return biquad(x, (alpha, 0.0, -alpha), (1 + alpha, -2 * math.cos(w0), 1 - alpha))


def clap():
    rng = random.Random(1234)  # stałe ziarno - każde klaśnięcie identyczne
    n = RATE * CLAP_MS // 1000
    noise = [rng.uniform(-1, 1) for _ in range(n)]
    shaped = bandpass(bandpass(noise, 1800, 0.7), 1800, 0.7)
    out = []
    for i, v in enumerate(shaped):
        t = i / RATE
        envelope = min(t / 0.0005, 1.0) * math.exp(-t / 0.006)  # narastanie 0.5 ms, zanik 6 ms
        out.append(v * envelope)
    peak = max(abs(v) for v in out)
    return [v * PEAK / peak for v in out]


def main():
    one = clap()
    total = int(RATE * (LEAD_IN_S + CLAPS * INTERVAL_S))
    samples = [0.0] * total
    for k in range(CLAPS):
        start = int(RATE * (LEAD_IN_S + k * INTERVAL_S))
        samples[start:start + len(one)] = one
    with wave.open("clap_series.wav", "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(struct.pack("<h", int(v * 32767)) for v in samples))
    print("clap_series.wav: %.1f s, %d klaśnięć co %.1f s" % (total / RATE, CLAPS, INTERVAL_S))


if __name__ == "__main__":
    main()
