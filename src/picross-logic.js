/* ============================================================
   Picross / Nonogram — puzzle engine
   Pure logic: generator, line-solver (uniqueness), validation.
   A puzzle is accepted only if it is fully *line-solvable*
   (deducible by pure logic, no guessing) — which also guarantees
   the solution is unique.
   Exposed on window.Picross
   ============================================================ */
(function () {
  "use strict";

  function rng(seed) {
    // mulberry32
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // clues for a single line of 0/1 values, e.g. [0,1,1,0,1] -> [2,1]
  function clueOf(line) {
    const clues = [];
    let run = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i]) run++;
      else if (run > 0) { clues.push(run); run = 0; }
    }
    if (run > 0) clues.push(run);
    return clues; // [] means an empty line
  }

  function cluesFromGrid(grid, rows, cols) {
    const rowClues = [];
    for (let r = 0; r < rows; r++) rowClues.push(clueOf(grid[r]));
    const colClues = [];
    for (let c = 0; c < cols; c++) {
      const col = [];
      for (let r = 0; r < rows; r++) col.push(grid[r][c]);
      colClues.push(clueOf(col));
    }
    return { rowClues, colClues };
  }

  // all valid 0/1 arrangements of one line of length `len` for `clues`
  function genArrangements(len, clues) {
    const res = [];
    const k = clues.length;
    if (k === 0) { res.push(new Array(len).fill(0)); return res; }
    // suffix[i] = minimal cells needed to place blocks i..k-1 (single gaps between)
    const suffix = new Array(k + 1).fill(0);
    for (let i = k - 1; i >= 0; i--) suffix[i] = clues[i] + (i < k - 1 ? 1 : 0) + suffix[i + 1];

    function rec(ci, pos, arr) {
      if (ci === k) {
        const a = arr.slice();
        while (a.length < len) a.push(0);
        res.push(a);
        return;
      }
      const block = clues[ci];
      const maxStart = len - suffix[ci];
      for (let s = pos; s <= maxStart; s++) {
        const a = arr.slice();
        while (a.length < s) a.push(0);          // leading / extra gap
        for (let b = 0; b < block; b++) a.push(1); // the block
        let nextPos = a.length;
        if (ci < k - 1) { a.push(0); nextPos = a.length; } // mandatory gap
        rec(ci + 1, nextPos, a);
      }
    }
    rec(0, 0, []);
    return res;
  }

  // Given precomputed arrangements + known cells (0 unknown, 1 filled, 2 empty),
  // intersect all consistent arrangements. Returns null on contradiction.
  function deduceLine(arrangements, known) {
    const len = known.length;
    let filled = null, empty = null, any = false;
    for (let t = 0; t < arrangements.length; t++) {
      const arr = arrangements[t];
      let ok = true;
      for (let i = 0; i < len; i++) {
        if (known[i] === 1 && arr[i] !== 1) { ok = false; break; }
        if (known[i] === 2 && arr[i] !== 0) { ok = false; break; }
      }
      if (!ok) continue;
      any = true;
      if (filled === null) {
        filled = new Array(len);
        empty = new Array(len);
        for (let i = 0; i < len; i++) { filled[i] = arr[i] === 1; empty[i] = arr[i] === 0; }
      } else {
        for (let i = 0; i < len; i++) {
          if (filled[i] && arr[i] !== 1) filled[i] = false;
          if (empty[i] && arr[i] !== 0) empty[i] = false;
        }
      }
    }
    if (!any) return null;
    return { filled, empty };
  }

  // Try to solve purely by line-deduction. Returns a 1/2 grid if fully solved, else null.
  function lineSolve(rowClues, colClues, rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) grid.push(new Array(cols).fill(0));
    const rowArr = rowClues.map((cl) => genArrangements(cols, cl));
    const colArr = colClues.map((cl) => genArrangements(rows, cl));

    let changed = true, guard = 0;
    while (changed && guard < 4000) {
      changed = false; guard++;
      for (let r = 0; r < rows; r++) {
        const d = deduceLine(rowArr[r], grid[r]);
        if (!d) return null;
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 0) {
            if (d.filled[c]) { grid[r][c] = 1; changed = true; }
            else if (d.empty[c]) { grid[r][c] = 2; changed = true; }
          }
        }
      }
      for (let c = 0; c < cols; c++) {
        const col = new Array(rows);
        for (let r = 0; r < rows; r++) col[r] = grid[r][c];
        const d = deduceLine(colArr[c], col);
        if (!d) return null;
        for (let r = 0; r < rows; r++) {
          if (grid[r][c] === 0) {
            if (d.filled[r]) { grid[r][c] = 1; changed = true; }
            else if (d.empty[r]) { grid[r][c] = 2; changed = true; }
          }
        }
      }
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (grid[r][c] === 0) return null; // ambiguous — needs guessing
    return grid;
  }

  // ============================================================
  // GENERATOR — random grid, keep only line-solvable ones
  // ============================================================
  function generate(opts) {
    const rows = opts.rows, cols = opts.cols;
    const density = opts.density || 0.55;
    const maxTries = opts.maxTries || 350;
    const lo = rows * cols * 0.32;
    const hi = rows * cols * 0.78;

    for (let t = 0; t < maxTries; t++) {
      const seed = opts.seed != null ? (opts.seed + t * 7919) : ((Math.random() * 1e9) | 0);
      const rand = rng(seed);
      const grid = [];
      let filled = 0;
      for (let r = 0; r < rows; r++) {
        const row = new Array(cols);
        for (let c = 0; c < cols; c++) {
          const v = rand() < density ? 1 : 0;
          row[c] = v; filled += v;
        }
        grid.push(row);
      }
      if (filled < lo || filled > hi) continue;
      // reject a fully-empty row or column (clue "0" everywhere reads as a bug to players)
      let bad = false;
      for (let r = 0; r < rows && !bad; r++) if (grid[r].every((v) => !v)) bad = true;
      for (let c = 0; c < cols && !bad; c++) {
        let any = false;
        for (let r = 0; r < rows; r++) if (grid[r][c]) { any = true; break; }
        if (!any) bad = true;
      }
      if (bad) continue;

      const { rowClues, colClues } = cluesFromGrid(grid, rows, cols);
      const solved = lineSolve(rowClues, colClues, rows, cols);
      if (!solved) continue;

      return { rows, cols, solution: grid, rowClues, colClues, seed };
    }
    return null;
  }

  // ---- validate a player's state ----
  // state[r][c] in {0 blank, 1 filled, 2 marked-X}
  function validate(puzzle, state) {
    const { rows, cols, solution } = puzzle;
    const errGrid = [];
    let solved = true, errors = 0, correct = 0, totalFill = 0;
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols).fill(false);
      for (let c = 0; c < cols; c++) {
        const isFill = state[r][c] === 1;
        const want = !!solution[r][c];
        if (want) totalFill++;
        if (isFill && !want) { row[c] = true; errors++; solved = false; }
        if (!isFill && want) solved = false;
        if (isFill && want) correct++;
      }
      errGrid.push(row);
    }
    return { solved, errGrid, errors, correct, totalFill };
  }

  // does a line (array of booleans for "filled") satisfy its clue?
  function lineComplete(filledLine, clue) {
    const got = clueOf(filledLine.map((b) => (b ? 1 : 0)));
    if (got.length !== clue.length) return false;
    for (let i = 0; i < got.length; i++) if (got[i] !== clue[i]) return false;
    return true;
  }

  window.Picross = {
    generate,
    validate,
    clueOf,
    cluesFromGrid,
    lineComplete,
    lineSolve,
    genArrangements,
  };
})();
