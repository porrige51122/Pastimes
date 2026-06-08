/* ============================================================
   sudoku-logic.js — classic 9x9 Sudoku engine
   Pure logic: full-grid generation, unique-solution digging,
   solution counting and validation. Exposed as window.Sudoku.
   ============================================================ */
(function () {
  "use strict";

  const N = 9, BOX = 3;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const clone = (g) => g.map((r) => r.slice());

  // ---- bitmask helpers: bit (v-1) set means value v is used ----
  function candidatesMask(grid, rowM, colM, boxM, r, c) {
    const used = rowM[r] | colM[c] | boxM[(Math.floor(r / 3) * 3) + Math.floor(c / 3)];
    return (~used) & 0x1ff; // 9 low bits, the still-available values
  }
  const bi = (r, c) => (Math.floor(r / 3) * 3) + Math.floor(c / 3);

  // ---- build a fully solved grid via randomized backtracking ----
  function fullGrid() {
    const grid = Array.from({ length: N }, () => new Array(N).fill(0));
    const rowM = new Array(N).fill(0), colM = new Array(N).fill(0), boxM = new Array(N).fill(0);

    function fill(pos) {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9), c = pos % 9;
      let avail = candidatesMask(grid, rowM, colM, boxM, r, c);
      const opts = [];
      for (let v = 1; v <= 9; v++) if (avail & (1 << (v - 1))) opts.push(v);
      shuffle(opts);
      for (const v of opts) {
        const m = 1 << (v - 1);
        grid[r][c] = v; rowM[r] |= m; colM[c] |= m; boxM[bi(r, c)] |= m;
        if (fill(pos + 1)) return true;
        grid[r][c] = 0; rowM[r] &= ~m; colM[c] &= ~m; boxM[bi(r, c)] &= ~m;
      }
      return false;
    }
    fill(0);
    return grid;
  }

  // ---- count solutions (stops at `limit`) using MRV + bitmasks ----
  function countSolutions(puzzle, limit) {
    const grid = clone(puzzle);
    const rowM = new Array(N).fill(0), colM = new Array(N).fill(0), boxM = new Array(N).fill(0);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (v) { const m = 1 << (v - 1); rowM[r] |= m; colM[c] |= m; boxM[bi(r, c)] |= m; }
      }
    let count = 0;

    function popcount(x) { let n = 0; while (x) { x &= x - 1; n++; } return n; }

    function solve() {
      if (count >= limit) return;
      // pick the empty cell with the fewest candidates (most-constrained)
      let br = -1, bc = -1, bestMask = 0, bestN = 10;
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          if (grid[r][c]) continue;
          const mask = candidatesMask(grid, rowM, colM, boxM, r, c);
          const n = popcount(mask);
          if (n === 0) return;          // dead end
          if (n < bestN) { bestN = n; bestMask = mask; br = r; bc = c; if (n === 1) break; }
        }
      if (br === -1) { count++; return; } // all filled → a solution
      for (let v = 1; v <= 9; v++) {
        const m = 1 << (v - 1);
        if (!(bestMask & m)) continue;
        grid[br][bc] = v; rowM[br] |= m; colM[bc] |= m; boxM[bi(br, bc)] |= m;
        solve();
        grid[br][bc] = 0; rowM[br] &= ~m; colM[bc] &= ~m; boxM[bi(br, bc)] &= ~m;
        if (count >= limit) return;
      }
    }
    solve();
    return count;
  }

  // difficulty → roughly how many givens to leave on the board
  const GIVENS = { easy: 40, medium: 32, hard: 26 };

  // ---- generate a puzzle: solved grid + dug clues with a unique solution ----
  function generate(diff) {
    const target = GIVENS[diff] || 36;
    const solution = fullGrid();
    const puzzle = clone(solution);

    // dig cells in random order while the solution stays unique.
    // remove in symmetric pairs (rotational) for a tidy board.
    const cells = [];
    for (let i = 0; i < 81; i++) cells.push(i);
    shuffle(cells);

    let givens = 81;
    for (const idx of cells) {
      if (givens <= target) break;
      const r = Math.floor(idx / 9), c = idx % 9;
      const r2 = 8 - r, c2 = 8 - c;
      if (puzzle[r][c] === 0) continue;
      const saved1 = puzzle[r][c];
      const saved2 = puzzle[r2][c2];
      const removingTwo = !(r === r2 && c === c2) && saved2 !== 0;
      puzzle[r][c] = 0;
      if (removingTwo) puzzle[r2][c2] = 0;
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[r][c] = saved1;            // restore — would break uniqueness
        if (removingTwo) puzzle[r2][c2] = saved2;
      } else {
        givens -= removingTwo ? 2 : 1;
      }
    }

    // mark which cells are fixed clues
    const given = puzzle.map((row) => row.map((v) => v !== 0));
    return { puzzle, solution, given, givens, difficulty: diff };
  }

  // ---- validate a player grid: find conflicts; report solved ----
  // grid: 9x9 of 0..9. Returns { errGrid, solved, filled }.
  function validate(puzzle, grid) {
    const errGrid = Array.from({ length: N }, () => new Array(N).fill(false));
    // rows
    for (let r = 0; r < N; r++) {
      const seen = {};
      for (let c = 0; c < N; c++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push([r, c]); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach(([rr, cc]) => errGrid[rr][cc] = true);
    }
    // cols
    for (let c = 0; c < N; c++) {
      const seen = {};
      for (let r = 0; r < N; r++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push([r, c]); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach(([rr, cc]) => errGrid[rr][cc] = true);
    }
    // boxes
    for (let br = 0; br < 3; br++)
      for (let bc = 0; bc < 3; bc++) {
        const seen = {};
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const r = br * 3 + dr, c = bc * 3 + dc, v = grid[r][c];
            if (v) (seen[v] = seen[v] || []).push([r, c]);
          }
        for (const v in seen) if (seen[v].length > 1) seen[v].forEach(([rr, cc]) => errGrid[rr][cc] = true);
      }

    let filled = 0, anyErr = false;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (grid[r][c]) filled++;
        if (errGrid[r][c]) anyErr = true;
      }
    const solved = filled === 81 && !anyErr;
    return { errGrid, solved, filled };
  }

  window.Sudoku = { generate, validate, countSolutions, GIVENS };
})();
