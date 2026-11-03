# KENWOOD Series 2400 Hi-Fi Component System & Spectrum Analyser

An authentic 1990s Kenwood Hi-Fi separates audio experience built as a high-performance modern Angular application. Features true 24-band stereo frequency visualization, a matching Compact Disc player with motorized tray and track calendar, and an FM/AM/DAB stereo synthesizer tuner with direct-access BBC Radio presets.

Live Deployment: [https://jameslloyd.github.io/stereo/](https://jameslloyd.github.io/stereo/)  
Repository: [https://github.com/jameslloyd/stereo.git](https://github.com/jameslloyd/stereo.git)

---

## The Separates Rack Stack

### 1. KENWOOD GE-2400 • 24-Band Stereo Graphic Equalizer & Spectrum Analyser
- **Dual True-Stereo Analysis**: 24 frequency channels per audio channel (48 frequency bars total) calibrated across ISO standard center frequencies from 20 Hz to 16 kHz.
- **VFD Phosphor Display**: Custom high-DPI canvas simulating authentic Vacuum Fluorescent Display phosphor glow, unlit ghost segments, and peak-hold drop dynamics.
- **Display Themes**: VFD Cyan, Kenwood Amber, Technics Green, and Ice Blue.
- **Equalizer Layouts**: Split stereo (Left on top, Right below), Side-by-Side stereo, and Dual Mirror stereo.
- **Setup Menu**: Compact dropdown menu with customizable segment count, decay speed, sensitivity multiplier, and glow intensity.

### 2. KENWOOD DP-2400 • Compact Disc Player Deck
- **Acoustic Disc Transport**: Motorized CD tray simulation with real-time spinning holographic rainbow disc viewport.
- **VFD Track Calendar**: 1–20 track grid displaying remaining tracks and active track illumination.
- **Digital Counter**: Switchable Elapsed, Remaining, and Total disc time modes.
- **Dot-Matrix Ticker**: Scrolling vacuum fluorescent readout for track title, artist, album, and bitrate.
- **Tactile Transport**: 10-key numeric direct access pad, repeat (`1` / `ALL`), shuffle, fast-forward, and rewind.

### 3. KENWOOD KT-2400 • FM/AM/DAB Stereo Synthesizer Tuner
- **Multi-Band Reception**: FM (87.5–108.0 MHz), AM (531–1602 kHz), and DAB Band III (12B).
- **VFD Annunciators**: Illuminated indicators for `[ STEREO ]`, `[ TUNED ]`, `[ RDS ]`, `[ AUTO ]`, and active band.
- **5-Segment Signal Ladder**: Real-time signal strength meter with phosphor gradient response.
- **RDS Alphanumeric Ticker**: Live Radio Data System readout displaying station identities and program information.
- **8 BBC Radio Presets**: Direct access push buttons featuring authentic BBC station vector badges:
  - **P-01**: BBC Radio 1 (98.8 MHz FM • Dance / Pop / Indie)
  - **P-02**: BBC Radio 2 (89.1 MHz FM • Adult Contemporary / Rock)
  - **P-03**: BBC Radio 3 (91.3 MHz FM • Classical / Jazz / World)
  - **P-04**: BBC Radio 4 (93.5 MHz FM • News / Speech / Drama)
  - **P-05**: BBC Radio 5 Live (693 kHz AM • Live News & Sport)
  - **P-06**: BBC Radio 6 Music (DAB 12B • Alternative / Indie / Electronica)
  - **P-07**: BBC Radio 1Xtra (DAB 12B • Hip-Hop / RnB / Grime)
  - **P-08**: BBC World Service (648 kHz AM • Global News & Analysis)

---

## Audio Sources & Pipeline

- **Jellyfin Media Server Integration**: Full REST API integration with modern dual authentication (`Authorization` + `X-Emby-Authorization`) to connect to your local Jellyfin server, browse music libraries, and stream lossless audio.
- **Live BBC Radio Streams**: Direct streaming audio connected to Web Audio analyzer nodes.
- **Built-in Synth Demonstration Engine**: Zero-configuration multi-oscillator 80s/90s analog synthesizer simulating drum machine, bass, chords, and arpeggios across all 24 frequency bands.
- **Local File Playback**: Drag-and-drop or upload local audio files (`.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`).

---

## Media Keys & Keyboard Shortcuts

Full integration with OS hardware media keys and global keyboard shortcuts via the **MediaSession API**:

| Key / Action | Function |
|---|---|
| `MediaPlayPause` / `Space` | Toggle Play / Pause |
| `MediaTrackNext` / `Ctrl+Right` | Next Track |
| `MediaTrackPrevious` / `Ctrl+Left` | Previous Track |
| `MediaStop` | Stop Playback & Reset Position |
| `ArrowRight` | Seek Forward (+5s) |
| `ArrowLeft` | Seek Backward (-5s) |

---

## Continuous Deployment to GitHub Pages

The repository includes a GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`):
1. Runs on every push to `main`.
2. Validates unit tests with Vitest.
3. Compiles the production Angular application with `--base-href /stereo/`.
4. Automatically publishes to GitHub Pages at [https://jameslloyd.github.io/stereo/](https://jameslloyd.github.io/stereo/).

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run unit tests
npm test

# Build for production
npm run build

# Build for GitHub Pages
npm run build:gh-pages
```
