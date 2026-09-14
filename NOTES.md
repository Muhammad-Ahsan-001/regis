# Portfolio notes

Static site: `index.html`, `styles.css`, `aura.js`, `main.js`, `intro.js`, `assets/`. No build step.

## Run it locally

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765. The Browser pane config in `.claude/launch.json` does the same thing. (Port 5500 is reserved on this machine.)

## Deployment

Live at **https://ahsani.vercel.app**. Pushing to `main` deploys it. Nothing else to run.

```bash
git push
```

Pushing any other branch builds a preview at its own URL instead, so `aura` is safe to experiment on.

| | |
|---|---|
| Repo | github.com/Muhammad-Ahsan-001/regis |
| Vercel project | `regis` |
| Production branch | `main` |
| Aliases | regis-ahsan, iamregis, regisahsan, regis-five (all `.vercel.app`) |

`regis.vercel.app` itself belongs to someone else's Vercel account, which is why the site sits on `ahsani`.

To deploy without a push, from this folder:

```bash
vercel deploy --prod
```

`vercel.json` sets the cache and security headers. `.vercelignore` keeps `tools/`, `.claude/`, `NOTES.md` and the InkFlow editing sources in the repo but off the public site. Never commit `.env.local`; it holds a token and is already ignored.

If you change the domain, update the absolute URLs in the `index.html` head, `robots.txt`, `sitemap.xml` and `README.md`, then push.

## Analytics

Two script tags at the bottom of `index.html` carry Web Analytics (visits) and Speed Insights (real-world load times). Both are cookieless and store no personal data, so the site needs no consent banner.

Both 404 on the local server because `/_vercel/...` only exists on Vercel. That is expected and harmless.

Your own visits are counted, so use a private window when testing.

Turning one of these on takes two steps, and missing the second one looks exactly like a broken setup:

1. Flip the toggle in the dashboard. There is no CLI command or API for it. Analytics tab, then Speed Insights tab.
2. **Redeploy.** The `/_vercel/...` route is baked into a build, so a deployment made before the toggle will keep returning 404 forever. Run `vercel redeploy <production-url>` or push any commit.

One more trap when testing: Vercel ignores bot traffic, so a headless browser loads the script but never sends a beacon. Check in a real browser, or the numbers will look broken when they are fine.

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

- Six project cards in `index.html` (Atlas, Ledger, Frame, Campus, Studio, Signal). Card art is generated from the `data-art` attribute in `main.js`. Their "View project" links point to `#` until real URLs exist.
- LinkedIn button in the contact section points to `#`.
- Stats in the About section.

## Which signature is which

- Main mark (welcome, header, sign-off): `tools/designs/copperplate2.json`. Alias: `tools/designs/regis.json` (the judges preferred it over `regis2` at small size).
- Other candidates from the design round live in `tools/designs/` with PNG renders in `tools/out/` if you want to switch: run `node tools/sig-install.cjs tools/designs/<main>.json tools/designs/<alias>.json`.

## Welcome screen behaviour

First visit in a tab: the full signature (about five seconds), then it flies into the header. Later visits in the same tab: the same sequence at 2.4x. Esc or the Skip button jumps straight to the page. Reduced-motion users never see it.
