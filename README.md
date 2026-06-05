## Pastimes

`Pastimes` is a browser-based puzzle website rooted in `src/`.

The site is now organised as a small hub plus separate game folders:

- `src/index.html` is the splash page and main entry point.
- `src/shared/` contains shared styles, rules UI, and favicons.
- `src/games/<game>/` contains each game's HTML entry point, logic, React app, board renderer, and any game-specific CSS.
- `src/Pastimes.html` remains as a legacy redirect to `index.html`.

Everything runs client-side in the browser using React from CDN plus Babel standalone, so there is no build step.

## Current Game Catalogue

- **Crossings**: Hashiwokakero / bridges. Connect islands with 1-2 bridges, satisfy every island number, and keep the whole map connected.
- **Hatch**: Picross / nonogram. Use row and column clues to reveal the hidden picture.
- **Sweep**: Minesweeper. Clear safe cells, flag mines, and use middle-click chord support.
- **Tents**: Place one tent beside each tree without tents touching, even diagonally.
- **Shikaku**: Partition the grid into rectangles whose areas match the clue numbers.
- **Countdown**: Combine six numbers with arithmetic operations to hit a target.
- **Skyscrapers**: Fill each row and column with unique heights that satisfy edge visibility clues.
- **Mastermind**: Deduce the hidden colour code from exact-match and colour-only feedback.

## Structure

- `src/index.html`
	- Main hub page.
	- Links to each game under `src/games/`.
- `src/shared/styles.css`
	- Shared visual system used across the site.
- `src/shared/splash.css`
	- Hub page styles.
- `src/shared/rules.css`
	- Shared rules/help panel styling.
- `src/shared/rules.js`
	- Shared rules/help behaviour.
- `src/shared/favicon.*`
	- Shared icons used by the hub and game pages.

Each game folder follows the same general pattern:

- `GameName.html`
	- Browser entry point for that game.
- `*-logic.js`
	- Puzzle generation, solving, and validation logic.
- `*App.jsx`
	- Main React app shell and game state.
- `*Board.jsx`
	- Board/grid renderer for games that need one.
- `*.css`
	- Game-specific styling where needed.

## Notable Folders

- `src/games/crossings/`
	- `Crossings.html`, `App.jsx`, `Board.jsx`, `hashi-logic.js`
- `src/games/hatch/`
	- `Hatch.html`, `PicrossApp.jsx`, `PicrossBoard.jsx`, `picross-logic.js`, `picross.css`
- `src/games/sweep/`
	- `Sweep.html`, `MinesweeperApp.jsx`, `MinesweeperBoard.jsx`, `minesweeper-logic.js`, `minesweeper.css`
- `src/games/tents/`
	- `Tents.html`, `TentsApp.jsx`, `TentsBoard.jsx`, `tents-logic.js`, `tents.css`
- `src/games/shikaku/`
	- `Shikaku.html`, `ShikakuApp.jsx`, `ShikakuBoard.jsx`, `shikaku-logic.js`, `shikaku.css`
- `src/games/countdown/`
	- `Countdown.html`, `CountdownApp.jsx`, `countdown-logic.js`, `countdown.css`
- `src/games/skyscrapers/`
	- `Skyscrapers.html`, `SkyscrapersApp.jsx`, `skyscrapers-logic.js`, `skyscrapers.css`
- `src/games/mastermind/`
	- `Mastermind.html`, `MastermindApp.jsx`, `mastermind-logic.js`, `mastermind.css`

## Running Locally

Serve either the repository root or `src/` with a static HTTP server.

Examples:

```bash
# serve from the repository root
python3 -m http.server 8000

# or
npx serve .
```

If you serve from the repository root, open:

- `http://localhost:8000/src/`
- or `http://localhost:8000/src/index.html`

If you serve `src/` itself as the web root, open:

- `http://localhost:8000/`

Example direct game paths when serving from the repository root:

- `http://localhost:8000/src/games/crossings/Crossings.html`
- `http://localhost:8000/src/games/hatch/Hatch.html`
- `http://localhost:8000/src/games/sweep/Sweep.html`

## Current Notes

- Puzzle generation and validation are handled in-browser.
- The hub now points to game-specific subfolders rather than flat files in `src/`.
- Shared assets have been moved under `src/shared/`.
- Several games expose `window.__solveNow` as a dev/test helper to auto-solve the current puzzle.
