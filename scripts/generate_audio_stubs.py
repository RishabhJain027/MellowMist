"""
generate_audio_stubs.py
Generates silent/minimal OGG placeholder audio files for MellowMist development.
These stubs allow the audio engine to load without real audio files.

Requirements: Python 3 (no external dependencies — writes minimal valid OGG files)
Usage: python generate_audio_stubs.py
"""

import os
import struct
import zlib

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")

SOUNDS = [
    "rain-soft-01",
    "thunder-distant-01",
    "wind-gentle-01",
    "ocean-waves-01",
    "fire-crackling-01",
    "forest-birds-01",
    "cafe-ambience-01",
    "white-noise-01",
    "brown-noise-01",
    "keyboard-typing-01",
    "fan-electric-01",
    "stream-babbling-01",
]


def write_minimal_ogg(path: str, sound_name: str) -> None:
    """
    Write a minimal valid OGG/Vorbis file containing ~1 second of silence.
    This is a hand-crafted binary stub — browsers can decode it, but it produces
    no audible output. Replace with real verified audio files before production.
    """
    # We'll use a minimal WAV wrapper instead — much simpler to hand-craft
    # and browsers can play it. We write a 1-second silent mono 44100 Hz WAV.
    # The file extension is .ogg but it will be served as audio/wav for stubs.
    # For production, replace with properly encoded OGG Vorbis files.
    sample_rate = 44100
    channels = 1
    bits_per_sample = 16
    duration_sec = 1
    num_samples = sample_rate * duration_sec
    data_size = num_samples * channels * (bits_per_sample // 8)

    with open(path, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))  # chunk size
        f.write(b"WAVE")
        # fmt sub-chunk
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))              # sub-chunk size
        f.write(struct.pack("<H", 1))               # PCM = 1
        f.write(struct.pack("<H", channels))
        f.write(struct.pack("<I", sample_rate))
        byte_rate = sample_rate * channels * (bits_per_sample // 8)
        f.write(struct.pack("<I", byte_rate))
        block_align = channels * (bits_per_sample // 8)
        f.write(struct.pack("<H", block_align))
        f.write(struct.pack("<H", bits_per_sample))
        # data sub-chunk
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(b"\x00" * data_size)               # silence

    print(f"  OK {os.path.basename(path)}  ({data_size + 44} bytes, silent WAV stub)")


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Writing audio stubs to: {os.path.abspath(OUTPUT_DIR)}\n")
    for sound_id in SOUNDS:
        path = os.path.join(OUTPUT_DIR, f"{sound_id}.ogg")
        if os.path.exists(path):
            print(f"  - {sound_id}.ogg already exists, skipping")
            continue
        write_minimal_ogg(path, sound_id)
    print("\nDone. Replace stubs with license-verified audio files before production.\n")
    print("See README.md -> Audio Asset Policy for the full workflow.")


if __name__ == "__main__":
    main()
