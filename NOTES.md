# Portfolio notes

Static site: `index.html`, `styles.css`, `aura.js`, `main.js`, `intro.js`, `assets/`. No build step.

## Run it locally

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765. The Browser pane config in `.claude/launch.json` does the same thing. (Port 5500 is reserved on this machine.)

## Branches

- `main` holds the skeleton, tagged `skeleton-v1`.
- `aura` is the welcome-signature and aura work. Keep building on `aura`; merge to `main` when you are happy.

## Drop-in media (tiles show "Coming soon" until these exist)

| Tile | File to add | Notes |
|---|---|---|
| Intro video | `assets/intro.mp4` | H.264 MP4, 16:9. Poster is the campus photo. |
| Voice note | `assets/voice-note.mp3` | MP3 or M4A works (change the `data-src` on `#voiceTile` if you use `.m4a`). |
| CV | `assets/Muhammad-Ahsan-CV.pdf` | Or change the `href` on `#cvTile`. |

The page checks each file with a HEAD request on load, so nothing else needs editing.

## The signature

Made with your InkFlow Studio code, not by hand.

- `assets/signature.animated.svg` writes itself on the welcome screen. `assets/signature.static.svg` is the header mark. `assets/seal.animated.svg` is the sign-off (scroll-driven), `assets/alias.animated.svg` is the Regis alias.
- To edit in the app: open `assets/signature.inkflow.json` (or `alias.inkflow.json`) in InkFlow Studio, edit, export the animated SVG with a transparent background, and replace the file. The page swaps the ink colour to `currentColor` at install time; if you export by hand, replace the fill colour with `currentColor` so light mode works.
- To regenerate from a design file: `node tools/sig-install.cjs tools/designs/<name>.json tools/designs/regis.json`. Designs live in `tools/designs/` (SVG path centrelines plus pressure and speed hints). This needs `D:\TOOL_FOR_SVG_FORMATION` (the InkFlow repo, with `tools/signature/export.ts` added) and Playwright from `D:\3D BUILDING MAKING\node_modules`.

## Placeholders still to fill

- Six project cards in `index.html` (Atlas, Ledger, Frame, Campus, Studio, Signal). Card art is generated from the `data-art` attribute in `main.js`.
- LinkedIn button in the contact section points to `#`.
- Stats in the About section.

## Welcome screen behaviour

First visit in a tab: the full signature (about five seconds), then it flies into the header. Later visits in the same tab: the same sequence at 2.4x. Esc or the Skip button jumps straight to the page. Reduced-motion users never see it.
