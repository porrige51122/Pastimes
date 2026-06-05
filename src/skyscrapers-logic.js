/* ============================================================
   skyscrapers-logic.js — Latin square + edge visibility clues
   Exposed as window.Skyscrapers
   ============================================================ */
(function () {
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- random Latin square via backtracking ----
  function genLatin(n) {
    const grid = Array.from({ length: n }, () => new Array(n).fill(0));
    const rowUsed = Array.from({ length: n }, () => new Set());
    const colUsed = Array.from({ length: n }, () => new Set());
    function place(r, c) {
      if (r === n) return true;
      const nr = c === n - 1 ? r + 1 : r;
      const nc = c === n - 1 ? 0 : c + 1;
      const cands = shuffle([...Array(n)].map((_, i) => i + 1));
      for (const v of cands) {
        if (rowUsed[r].has(v) || colUsed[c].has(v)) continue;
        grid[r][c] = v; rowUsed[r].add(v); colUsed[c].add(v);
        if (place(nr, nc)) return true;
        grid[r][c] = 0; rowUsed[r].delete(v); colUsed[c].delete(v);
      }
      return false;
    }
    place(0, 0);
    return grid;
  }

  // visible buildings scanning an array from index 0 forward
  function visible(arr) {
    let count = 0, max = 0;
    for (const h of arr) { if (h > max) { count++; max = h; } }
    return count;
  }

  // full edge clues for a solved grid
  function cluesFor(grid) {
    const n = grid.length;
    const top = [], bottom = [], left = [], right = [];
    for (let c = 0; c < n; c++) {
      const col = grid.map((row) => row[c]);
      top.push(visible(col));
      bottom.push(visible(col.slice().reverse()));
    }
    for (let r = 0; r < n; r++) {
      left.push(visible(grid[r]));
      right.push(visible(grid[r].slice().reverse()));
    }
    return { top, bottom, left, right };
  }

  // count solutions consistent with clues (nulls = no clue), stop at `limit`.
  // Aborts if the search exceeds `budget` nodes — returns `limit` (treat as
  // non-unique) so generation stays fast and stays on the safe side.
  function countSolutions(n, clues, limit, budget) {
    budget = budget || 400000;
    const grid = Array.from({ length: n }, () => new Array(n).fill(0));
    const colUsed = Array.from({ length: n }, () => new Set());
    let found = 0, nodes = 0, aborted = false;

    function rowOK(r) {
      const row = grid[r];
      if (clues.left[r] != null && visible(row) !== clues.left[r]) return false;
      if (clues.right[r] != null && visible(row.slice().reverse()) !== clues.right[r]) return false;
      return true;
    }
    function colsOK() {
      for (let c = 0; c < n; c++) {
        const col = grid.map((row) => row[c]);
        if (clues.top[c] != null && visible(col) !== clues.top[c]) return false;
        if (clues.bottom[c] != null && visible(col.slice().reverse()) !== clues.bottom[c]) return false;
      }
      return true;
    }

    function fill(r, c, rowUsed) {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }
      if (r === n) { if (colsOK()) found++; return; }
      if (c === n) { if (!rowOK(r)) return; fill(r + 1, 0, new Set()); return; }
      for (let v = 1; v <= n; v++) {
        if (rowUsed.has(v) || colUsed[c].has(v)) continue;
        grid[r][c] = v; rowUsed.add(v); colUsed[c].add(v);
        fill(r, c + 1, rowUsed);
        grid[r][c] = 0; rowUsed.delete(v); colUsed[c].delete(v);
        if (found >= limit || aborted) return;
      }
    }
    fill(0, 0, new Set());
    return aborted ? limit : found;
  }

  // generate a puzzle: solved grid + a unique clue set.
  // removeFrac controls difficulty: 0 keeps every clue (easiest),
  // 1 strips to a minimal unique set (hardest).
  function generate(n, removeFrac) {
    if (removeFrac == null) removeFrac = 1;
    const sol = genLatin(n);
    const full = cluesFor(sol);
    const clues = {
      top: full.top.slice(), bottom: full.bottom.slice(),
      left: full.left.slice(), right: full.right.slice(),
    };
    const total = 4 * n;
    const maxRemove = Math.round(total * removeFrac);
    let removed = 0;
    // try to strip clues while the puzzle stays uniquely solvable
    const positions = [];
    for (let i = 0; i < n; i++) positions.push(["top", i], ["bottom", i], ["left", i], ["right", i]);
    shuffle(positions);
    for (const [side, i] of positions) {
      if (removed >= maxRemove) break;
      const keep = clues[side][i];
      clues[side][i] = null;
      if (countSolutions(n, clues, 2) !== 1) clues[side][i] = keep; // restore — needed
      else removed++;
    }
    return { n, sol, clues };
  }

  // validation of a player grid (0 = empty)
  function validate(puzzle, grid) {
    const n = puzzle.n;
    const errRow = Array.from({ length: n }, () => new Array(n).fill(false));
    // duplicate detection per row/col
    for (let r = 0; r < n; r++) {
      const seen = {};
      for (let c = 0; c < n; c++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(c); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((c) => errRow[r][c] = true);
    }
    for (let c = 0; c < n; c++) {
      const seen = {};
      for (let r = 0; r < n; r++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(r); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((r) => errRow[r][c] = true);
    }

    const full = grid.every((row) => row.every((v) => v >= 1));
    // clue status (only meaningful when the line is complete)
    const clueStatus = { top: [], bottom: [], left: [], right: [] };
    const C = puzzle.clues;
    for (let c = 0; c < n; c++) {
      const col = grid.map((row) => row[c]);
      const complete = col.every((v) => v >= 1) && new Set(col).size === n;
      clueStatus.top[c] = C.top[c] == null ? null : (!complete ? "idle" : visible(col) === C.top[c] ? "ok" : "bad");
      clueStatus.bottom[c] = C.bottom[c] == null ? null : (!complete ? "idle" : visible(col.slice().reverse()) === C.bottom[c] ? "ok" : "bad");
    }
    for (let r = 0; r < n; r++) {
      const row = grid[r];
      const complete = row.every((v) => v >= 1) && new Set(row).size === n;
      clueStatus.left[r] = C.left[r] == null ? null : (!complete ? "idle" : visible(row) === C.left[r] ? "ok" : "bad");
      clueStatus.right[r] = C.right[r] == null ? null : (!complete ? "idle" : visible(row.slice().reverse()) === C.right[r] ? "ok" : "bad");
    }

    let solved = full && !errRow.some((row) => row.some(Boolean));
    if (solved) {
      const all = [].concat(clueStatus.top, clueStatus.bottom, clueStatus.left, clueStatus.right);
      solved = all.every((s) => s === null || s === "ok");
    }
    return { errRow, clueStatus, solved };
  }

  window.Skyscrapers = { generate, validate, cluesFor, visible };
})();
