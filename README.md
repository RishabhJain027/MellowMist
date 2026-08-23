# MellowMist — Ambient Sound Mixer

**MellowMist** is an original, open-source ambient sound mixer for the browser. It is inspired by the ambient-mixer category of apps. It is **not** affiliated with A Soft Murmur or any other ambient-mixer service.

---

## Features

- 🎵 **12 sound layers** — Rain, Thunder, Wind, Ocean, Fire, Forest, Café, White Noise, Brown Noise, Keyboard, Fan, Stream
- 🎚️ **Per-layer volume sliders** with smooth, click-free gain control
- 🔊 **Master volume** with power-curve perception mapping
- 〰️ **Meander modulation** — slow, bounded random walk per layer
- ⏱️ **Sleep timer** — countdown with graceful fade-out
- 💾 **Presets** — 4 built-in + unlimited custom, saved to LocalStorage
- 🔗 **URL sharing** — compact base64-encoded mix state
- 📊 **Waveform visualizer** — AnalyserNode canvas (decorative)
- ♿ **Accessible** — keyboard navigable, screen-reader labels, reduced-motion support
- 📱 **Responsive** — works on mobile, tablet, and desktop
- 🌐 **PWA / Offline** — Service Worker caches the app shell and audio

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Bundler | Vite 5 |
| Audio | Web Audio API (native) |
| State | Zustand + LocalStorage |
| Testing | Vitest |
| Offline | vite-plugin-pwa (Workbox) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Audio Asset Policy

> ⚠️ **Important:** The `public/audio/` directory contains **placeholder stub files** (silent OGG files) for development and testing. You **must** replace every stub with a license-verified audio file before deploying publicly.

### Asset Workflow (blueprint §6)

For every candidate audio file:

1. **Search** — Find a candidate on Freesound, OpenGameArt, or record your own
2. **Read the license** — Open the item page and read the *exact* license (CC0 preferred)
3. **Download** — Save the original file
4. **Hash the file** — `sha256sum yourfile.ogg`
5. **Inspect** — Check duration, format, loudness
6. **Normalize** — Trim silence, remove clicks, create loop crossfade, measure integrated loudness
7. **Record attribution** — Update `src/assets/manifest.json` with all fields
8. **Approve** — Add the processed file to `public/audio/`

### License Priority

| Source | License | Notes |
|--------|---------|-------|
| Self-recorded | Owned | Best option — no third-party rights |
| Freesound CC0 | CC0 | Verify per-file; save license page |
| OpenGameArt CC0 | CC0 | Verify per-file |
| CC-BY | CC-BY | Requires attribution in AttributionPage |
| Pixabay | Pixabay License | No standalone redistribution; check terms |
| BBC Sound Effects | Restricted | Research/personal only; not for public web app |
| Kaggle datasets | Dataset-specific | Do not bundle without confirming rights |

### Replacing a Stub File

1. Source a CC0 file from [Freesound](https://freesound.org) or [OpenGameArt](https://opengameart.org/content/cc0-sound-effects)
2. Convert to OGG: `ffmpeg -i input.wav -c:a libvorbis -q:a 4 output.ogg`
3. Measure loudness: `ffmpeg -i output.ogg -filter:a loudnorm=print_format=json -f null -`
4. Get SHA256: `sha256sum output.ogg` (or `Get-FileHash output.ogg` on Windows)
5. Update `src/assets/manifest.json` — fill in `sha256`, `loudnessLufs`, `creator`, `sourceUrl`, `licenseUrl`, `downloadedAt`
6. Copy the file to `public/audio/<sound-id>.ogg`
7. Remove the stub

---

## Module Structure

```
src/
  audio/
    AudioEngine.ts    — AudioContext, master gain, analyser, layer management
    LayerNode.ts      — (individual layer lifecycle helpers)
    meander.ts        — Bounded random-walk modulation
    timer.ts          — Timer state machine + fade scheduling
  state/
    mixSchema.ts      — TypeScript types
    persistence.ts    — LocalStorage adapter
    shareUrl.ts       — URL encode/decode
    store.ts          — Zustand store
  components/
    SoundCard.tsx     — Per-layer card
    MixerControls.tsx — Transport bar
    PresetPanel.tsx   — Preset management
    ShareDialog.tsx   — Copy-link dialog
    TimerControls.tsx — Sleep timer UI
    Visualizer.tsx    — AnalyserNode canvas
    AttributionPage.tsx — Audio credits
  assets/
    manifest.json     — Sound definitions and asset metadata
  App.tsx
  main.tsx
public/
  audio/              — Audio files (replace stubs before production)
  favicon.svg
```

---

## Tests

```bash
npm test
```

Tests cover (per blueprint §2):
- **Volume clamping** — `clamp01`, `sliderToGain`, `computeLayerGain`
- **Mix serialization** — encode/decode round-trip, unknown IDs, schema version
- **Timer transitions** — `idle → running → fading → finished`
- **Meander bounds** — output always in [0, 1], constants correct
- **URL parameters** — malformed input, unknown IDs, MAX_LAYERS cap

---

## Disclaimer

> MellowMist is an original implementation inspired by the ambient-mixer product category. It is **not** an official product of A Soft Murmur or any other service. It is intended as a relaxation and focus tool only. It does not treat ADHD, insomnia, tinnitus, anxiety, or any other medical condition.

---

## License

MIT — see [LICENSE](./LICENSE)

Audio assets each carry their own license as documented in `src/assets/manifest.json` and on the in-app Credits page.
