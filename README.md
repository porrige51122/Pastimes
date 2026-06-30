<p align="center">
  <img src="src/shared/favicon.svg" width="88" alt="Pastimes logo — two islands joined by a bridge" />
</p>

<h1 align="center">Pastimes</h1>

<p align="center">
  <strong>A small, hand-built collection of logic puzzles you play in the browser.</strong><br />
  No accounts, no ads, no tracking — just open a page and start thinking.
</p>

<p align="center">
  <a href="src/index.html">Open the collection&nbsp;→</a>
</p>

---

## About the project

Pastimes is a set of classic pen-and-paper style puzzles — Sudoku, a bridges
puzzle, a nonogram, Minesweeper, Slitherlink, Masyu and more — rebuilt as clean,
self-contained web pages. Every puzzle runs entirely in your browser: there's nothing to install,
nothing to sign up for, and your progress never leaves your device.

The goal is to be **calm and uncluttered**. Each game shares one visual language
(the same colours, type and controls), generates fresh puzzles at a few
difficulty levels, and explains its own rules on the page. It's meant to be the
kind of place you can open on a coffee break and immediately know how to play.

Puzzles are organised into four categories by the kind of thinking they ask for:

| Category | What's inside | Puzzles |
| --- | --- | --- |
| [**Numbers**](src/categories/numbers.html) | Digits and arithmetic | [Sudoku](src/games/sudoku/Sudoku.html) · [Skyscrapers](src/games/skyscrapers/Skyscrapers.html) · [Countdown](src/games/countdown/Countdown.html) · [KenKen](src/games/kenken/KenKen.html) · [Futoshiki](src/games/futoshiki/Futoshiki.html) · [Killer Sudoku](src/games/killer/Killer.html) |
| [**Pictures & Regions**](src/categories/pictures-regions.html) | Fill and carve the grid | [Hatch](src/games/hatch/Hatch.html) · [Shikaku](src/games/shikaku/Shikaku.html) · [Galaxies](src/games/galaxies/Galaxies.html) · [Mosaic](src/games/mosaic/Mosaic.html) |
| [**Place & Connect**](src/categories/place-connect.html) | Arrange things across a map | [Tents](src/games/tents/Tents.html) · [Crossings](src/games/crossings/Crossings.html) · [Slitherlink](src/games/slitherlink/Slitherlink.html) · [Masyu](src/games/masyu/Masyu.html) · [Scurry](src/games/scurry/Scurry.html) |
| [**Deduction**](src/categories/deduction.html) | Read clues, rule things out | [Sweep](src/games/sweep/Sweep.html) · [Mastermind](src/games/mastermind/Mastermind.html) |

## Getting started

Everything is static — no build step and no dependencies to install.

```bash
# clone, then serve the src/ folder with any static file server, e.g.
cd pastimes
python3 -m http.server --directory src 8000
# now open http://localhost:8000
```

Then visit `http://localhost:8000/index.html` for the collection, or open any
individual game page under `src/games/`.

> A local server is recommended (rather than double-clicking the file) because
> the games load their scripts and styles over `http://`. Any static server
> works — `python -m http.server`, `npx serve`, the VS Code Live Server
> extension, etc.

## How it works

Pastimes is deliberately low-tech and dependency-free:

- **Plain static HTML, CSS and JavaScript.** Each game is its own page.
- **React via CDN.** The interactive games load React and Babel from a CDN at
  runtime and transpile their JSX in the browser — there's no bundler, no
  `node_modules`, and nothing to compile before you can open a page.
- **A shared design system.** Common colours, typography, buttons, the rules
  panel and the win animation all live in [`src/shared/`](src/shared/) so every
  game looks and behaves consistently.
- **Self-contained generators.** Each game's `*-logic.js` creates and validates
  its own puzzles, so play is endless and offline.

### Project structure

```
.
├── README.md
└── src/                       ← everything that ships (point your CI/host here)
    ├── index.html             ← landing page: the four categories
    ├── categories/            ← one page per category, listing its games
    │   ├── numbers.html
    │   ├── pictures-regions.html
    │   ├── place-connect.html
    │   └── deduction.html
    ├── games/                 ← one folder per game
    │   ├── sudoku/
    │   │   ├── Sudoku.html         (page shell)
    │   │   ├── SudokuApp.jsx       (UI)
    │   │   ├── sudoku-logic.js     (puzzle generator + solver)
    │   │   └── sudoku.css          (game-specific styles)
    │   ├── galaxies/               (Spiral Galaxies — symmetric regions)
    │   └── …
    └── shared/                ← design system shared by every page
        ├── styles.css         (tokens, controls, board, win overlay)
        ├── splash.css         (hub + category cards)
        ├── rules.css / rules.js
        └── favicon.*
```

All deployable code lives under [`src/`](src/) — so a static host or CI workflow
can simply publish that one folder.

## Contributing

New puzzles and fixes are welcome. A few conventions keep the collection
coherent:

1. **One folder per game** under `src/games/<game>/`, following the
   `Page.html` + `App.jsx` + `*-logic.js` + `*.css` layout above.
2. **Reuse the shared system.** Pull colours, buttons, the segmented difficulty
   control and the rules panel from `src/shared/` rather than inventing new
   ones — it's what keeps every game feeling like part of the same set.
3. **Generate, don't hard-code.** Puzzles should be produced (and checked for a
   unique solution where it matters) by the game's `*-logic.js`.
4. **Add it to a category.** Create the game's card on the relevant page in
   `src/categories/`, and add a tile for it on `src/index.html`. If a puzzle
   doesn't fit an existing category, propose a new one.
5. **Keep it accessible.** Readable type sizes, real contrast, keyboard support
   where it makes sense, and rules explained on the page.

To work on a change, edit the files under `src/`, refresh the page in your
browser, and open a pull request describing the puzzle or fix.

## License

See [`LICENSE`](LICENSE) if present; otherwise treat this as all-rights-reserved
until a license is added.
