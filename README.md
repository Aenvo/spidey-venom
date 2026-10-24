# Spider-Man × Venom: The Symbiote Buttons

A full-page site with two living WebGL goo buttons, **Spidey** and **Venom**.

**Live:** https://atharvsinh-codez.github.io/spidey-venom/

Rebuilt from [exteestudio/venom-button](https://github.com/exteestudio/venom-button).
Rebuilt by [@athrix_codes](https://x.com/athrix_codes).

## Features

- **Spidey**: blue suit with a fine embossed web and a black label. Tap it to shoot real strands of white silk.
- **Venom**: the black symbiote with a blue sheen. Tap it to fling strands of black goo.
- **Drag either button** anywhere (mouse or touch; arrow keys nudge a focused button, Shift for bigger steps).
  Positions are saved, and the reset button puts them back.
- **Drop them close together** and they fight: each reaches for the other and the symbiote slowly takes over Spidey's suit.
- Responsive: side by side on desktop, stacked on phones. Falls back to plain CSS buttons without WebGL2,
  and respects `prefers-reduced-motion`.

## Run

One static file, no build step needed to run it:

```bash
npx serve .        # or: python3 -m http.server
```

## Edit

`index.html` is generated. Edit the files in `src/` and rebuild:

```bash
cd src && python3 build.py
```

- `src/engine.orig.js`: the untouched venom-button engine.
- `src/patch_engine.py`: turns it into `createGoo(cfg)` (two instances, transparent canvas, Spidey suit shader,
  drag squash, aiming at the other button). Writes `src/engine.js`, which is a build artifact.
- `src/head.html`: page CSS and markup. `src/controller.js`: positions, drag, pointer routing, effects.

## Credits

- Goo engine: [exteestudio/venom-button](https://github.com/exteestudio/venom-button) (MIT).
- Fonts: Geist (embedded, SIL OFL 1.1, see `fonts/Geist-OFL.txt`), Anton and Bangers (Google Fonts).

## License

[MIT](LICENSE) © Atharvsinh Jadav ([@athrix_codes](https://x.com/athrix_codes))
