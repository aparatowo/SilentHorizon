#!/usr/bin/env python3
"""Odczyt wyników z firmware przez port szeregowy (wymaga pyserial).

    python3 tools/serial_log.py e | python3 tools/clap_view.py
    python3 tools/serial_log.py t > obejscie.log

Argument (opcjonalny) to tryb wysyłany po połączeniu: l, r, e albo t.
--reset restartuje płytkę przed odczytem (kalibracja synchronizacji od nowa).
"""

import argparse
import sys
import time

import serial


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", choices=["l", "r", "e", "t"])
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()

    port = serial.Serial()
    port.port, port.baudrate, port.timeout = args.port, 115200, 0.2
    port.dtr = port.rts = False  # bez przypadkowego resetu przy otwarciu
    port.open()
    if args.reset:
        port.rts = True
        time.sleep(0.1)
        port.rts = False
        time.sleep(2.5)  # start i kalibracja synchronizacji
    if args.mode:
        port.write(args.mode.encode())

    pending = b""
    try:
        while True:
            pending += port.read(4096)
            *lines, pending = pending.split(b"\n")
            for line in lines:
                text = line.decode(errors="replace").rstrip("\r")
                if text and text[0] in "#LRKTP":  # pomija komunikaty rozruchowe ESP-IDF
                    print(text, flush=True)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
