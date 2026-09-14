# Portfolio

The personal site of Muhammad Ahsan, full-stack developer and computer science student in Islamabad.

Live at **[regis.vercel.app](https://regis.vercel.app)**.

A single page with no build step: plain HTML, CSS and JavaScript, with GSAP, ScrollTrigger and Lenis loaded from a CDN.

## What is in it

- **A welcome screen** where the signature writes itself, then flies into the header as the site mark. The signature is not a font or a hand-drawn path. It is exported from [InkFlow Studio](https://inkflow-studio-alpha.vercel.app), an SVG drawing and animation studio I built, and it plays through the runtime embedded in that export.
- **An aura field** behind the whole page: a full-screen WebGL shader with domain-warped noise that shifts palette per section and follows the pointer.
- **A hero that finds its way to you.** A canvas floor plan runs a live A\* search; move the cursor and the route re-plans towards it.
- **Stacked project cards** that pile up as you scroll, each with generative SVG art drawn from its own data.
- **A floor plan of the toolkit**, with a corridor line that draws itself as you arrive.
- **A sign-off** that writes the signature again, scrubbed by scroll position.

Dark and light themes, reduced-motion support, and keyboard navigation throughout.

## Run it

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765.

## Layout

| Path | What it is |
|---|---|
| `index.html` | All the copy and structure |
| `styles.css` | Design tokens and every rule |
| `aura.js` | The WebGL aura field |
| `main.js` | Page behaviour: navigation, hero pathfinder, cards, media tiles |
| `intro.js` | The welcome sequence |
| `assets/` | Photos and the exported signatures |
| `tools/` | The signature pipeline (not deployed) |

## The signature

Made with InkFlow Studio, not by hand. `tools/designs/*.json` holds stroke centrelines with pressure and speed hints; the pipeline samples them into real pressure-sensitive strokes, exports them through InkFlow's own export code, and installs the results into `assets/`.

To regenerate:

```bash
node tools/sig-install.cjs tools/designs/copperplate2.json tools/designs/regis.json
```

To edit by hand instead, open `assets/signature.inkflow.json` in InkFlow Studio.

See [NOTES.md](NOTES.md) for the full handbook.

## Still to come

The six project cards are placeholders until the real case studies are written. The intro video, voice note and CV tiles show "coming soon" until `assets/intro.mp4`, `assets/voice-note.mp3` and `assets/Muhammad-Ahsan-CV.pdf` are added; nothing else needs editing when they are.
