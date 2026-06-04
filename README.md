## Pastimes

`Pastimes` is a small browser-based puzzle collection in the `src` folder.

It currently includes:

- **Crossings** (`Hashiwokakero` / bridges): connect islands with 1-2 bridges, match each island number, and keep one connected network.
- **Hatch** (`Picross` / nonogram): fill grid cells using row/column run-length clues to reveal a picture.
- A **hub page** that links to both games.

Everything runs client-side in the browser using React from CDN + Babel standalone (no build step).

## How It Is Wired

- `src/index.html`
	- Landing page / game selector.
- `src/Crossings.html`
	- Entry point for Crossings.
	- Loads `hashi-logic.js`, `Board.jsx`, and `App.jsx`.
- `src/Hatch.html`
	- Entry point for Hatch.
	- Loads `picross-logic.js`, `PicrossBoard.jsx`, and `PicrossApp.jsx`.

## Main Code Files

- `src/hashi-logic.js`
	- Crossings puzzle engine.
	- Generates legal puzzles, computes edge crossings, validates player state, and enforces uniqueness through a capped solver.
- `src/App.jsx`
	- Crossings UI state machine (difficulty, timer, moves, undo/reset, toasts, win effects).
- `src/Board.jsx`
	- Crossings SVG renderer and interaction layer.

- `src/picross-logic.js`
	- Hatch puzzle engine.
	- Generates nonogram grids, builds clues, validates state, and only accepts line-solvable boards.
- `src/PicrossApp.jsx`
	- Hatch UI state machine (difficulty, drag paint, right-click X marks, undo/clear, win effects).
- `src/PicrossBoard.jsx`
	- Hatch SVG board renderer and pointer interaction handling.

- `src/styles.css`
	- Shared visual system and components.
- `src/picross.css`
	- Hatch-specific board styling.
- `src/splash.css`
	- Hub page styles.

## Running Locally

Use any static HTTP server from the `pastimes` directory.

Example options:

```bash
# Python
python3 -m http.server 8000

# or Node (if installed)
npx serve .
```

Then open:

- `http://localhost:8000/src/index.html` for the hub
- `http://localhost:8000/src/Crossings.html` for Crossings
- `http://localhost:8000/src/Hatch.html` for Hatch

## Current Design Notes

- Puzzle generation and validation are entirely in-browser.
- Difficulty currently scales board size and generation parameters.
- `window.__solveNow` exists as a dev/test helper in both game apps to auto-fill the current puzzle.
