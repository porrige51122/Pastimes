/* ============================================================
   kenken-logic.js — KenKen / Calcudoku engine
   Latin square + arithmetic cages with a guaranteed-unique
   solution (verified by an internal solver). Exposed as
   window.KenKen.
   ============================================================ */
(function () {
  "use strict";

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

  // ---- partition the grid into contiguous cages ----
  // Returns an array of cages, each { cells: [[r,c]...], id }.
  function partition(n, maxCage) {
    const id = Array.from({ length: n }, () => new Array(n).fill(-1));
    const cages = [];
    const order = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) order.push([r, c]);
    shuffle(order);

    function freeNeighbors(r, c) {
      const out = [];
      if (r > 0 && id[r - 1][c] === -1) out.push([r - 1, c]);
      if (r < n - 1 && id[r + 1][c] === -1) out.push([r + 1, c]);
      if (c > 0 && id[r][c - 1] === -1) out.push([r, c - 1]);
      if (c < n - 1 && id[r][c + 1] === -1) out.push([r, c + 1]);
      return out;
    }

    for (const [sr, sc] of order) {
      if (id[sr][sc] !== -1) continue;
      const cid = cages.length;
      // weighted toward 2 and 3 cells; the occasional 1 and 4
      const roll = Math.random();
      let target = roll < 0.12 ? 1 : roll < 0.55 ? 2 : roll < 0.86 ? 3 : 4;
      target = Math.min(target, maxCage);
      const cells = [[sr, sc]];
      id[sr][sc] = cid;
      while (cells.length < target) {
        // gather frontier of free neighbors across the whole cage
        const frontier = [];
        for (const [r, c] of cells) for (const nb of freeNeighbors(r, c)) frontier.push(nb);
        if (!frontier.length) break;
        const [nr, nc] = frontier[Math.floor(Math.random() * frontier.length)];
        if (id[nr][nc] !== -1) continue;
        id[nr][nc] = cid; cells.push([nr, nc]);
      }
      cages.push({ id: cid, cells });
    }
    return { id, cages };
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  // ---- assign an operation + target to each cage from the solution ----
  function assignOps(cages, sol) {
    for (const cage of cages) {
      const vals = cage.cells.map(([r, c]) => sol[r][c]);
      if (vals.length === 1) {
        cage.op = "="; cage.target = vals[0];
        continue;
      }
      if (vals.length === 2) {
        const [a, b] = vals;
        const hi = Math.max(a, b), lo = Math.min(a, b);
        const choices = ["+", "*"];
        choices.push("-");
        if (hi % lo === 0) choices.push("/");
        const op = choices[Math.floor(Math.random() * choices.length)];
        cage.op = op;
        cage.target =
          op === "+" ? a + b :
          op === "*" ? a * b :
          op === "-" ? hi - lo :
          hi / lo;
        continue;
      }
      // 3+ cells: only + or × are well-defined
      const op = Math.random() < 0.5 ? "+" : "*";
      cage.op = op;
      cage.target = op === "+"
        ? vals.reduce((s, v) => s + v, 0)
        : vals.reduce((s, v) => s * v, 1);
    }
    return cages;
  }

  // ---- does a completed set of cage values satisfy the clue? ----
  function cageSatisfied(cage, vals) {
    if (cage.op === "=") return vals[0] === cage.target;
    if (cage.op === "+") return vals.reduce((s, v) => s + v, 0) === cage.target;
    if (cage.op === "*") return vals.reduce((s, v) => s * v, 1) === cage.target;
    if (cage.op === "-") return Math.abs(vals[0] - vals[1]) === cage.target;
    if (cage.op === "/") {
      const hi = Math.max(vals[0], vals[1]), lo = Math.min(vals[0], vals[1]);
      return lo !== 0 && hi % lo === 0 && hi / lo === cage.target;
    }
    return false;
  }

  // ---- count solutions consistent with the cages, stop at `limit` ----
  function countSolutions(n, cageOf, cages, limit, budget) {
    budget = budget || 600000;
    const grid = Array.from({ length: n }, () => new Array(n).fill(0));
    const rowUsed = Array.from({ length: n }, () => new Set());
    const colUsed = Array.from({ length: n }, () => new Set());
    let found = 0, nodes = 0, aborted = false;

    // partial-prune helper for the cage that cell (r,c) belongs to
    function cagePartialOK(cage) {
      const filled = [];
      let emptyCount = 0;
      for (const [r, c] of cage.cells) {
        if (grid[r][c]) filled.push(grid[r][c]); else emptyCount++;
      }
      if (emptyCount === 0) return cageSatisfied(cage, cage.cells.map(([r, c]) => grid[r][c]));
      // partial bounds for + and *
      if (cage.op === "+") {
        const sum = filled.reduce((s, v) => s + v, 0);
        const minRest = emptyCount * 1;
        const maxRest = emptyCount * n;
        return sum + minRest <= cage.target && sum + maxRest >= cage.target;
      }
      if (cage.op === "*") {
        const prod = filled.reduce((s, v) => s * v, 1);
        if (cage.target % prod !== 0) return false;
        return prod <= cage.target;
      }
      return true; // - and / are 2-cell; resolved when complete
    }

    function fill(pos) {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }
      if (pos === n * n) { found++; return; }
      const r = Math.floor(pos / n), c = pos % n;
      const cage = cages[cageOf[r][c]];
      for (let v = 1; v <= n; v++) {
        if (rowUsed[r].has(v) || colUsed[c].has(v)) continue;
        grid[r][c] = v; rowUsed[r].add(v); colUsed[c].add(v);
        if (cagePartialOK(cage)) fill(pos + 1);
        grid[r][c] = 0; rowUsed[r].delete(v); colUsed[c].delete(v);
        if (found >= limit || aborted) return;
      }
    }
    fill(0);
    return aborted ? limit : found;
  }

  // ---- generate a uniquely-solvable KenKen puzzle ----
  function generate(n, opts) {
    opts = opts || {};
    const maxCage = opts.maxCage || (n <= 4 ? 3 : 4);
    for (let attempt = 0; attempt < 80; attempt++) {
      const sol = genLatin(n);
      const { id, cages } = partition(n, maxCage);
      // avoid the trivial case of too many singletons giving the answer away
      const singles = cages.filter((c) => c.cells.length === 1).length;
      if (singles > Math.max(1, Math.floor(n / 2))) continue;
      assignOps(cages, sol);
      if (countSolutions(n, id, cages, 2) === 1) {
        return { n, sol, cages, cageOf: id };
      }
    }
    // extremely unlikely fallback: a puzzle of all singletons (always unique)
    const sol = genLatin(n);
    const cages = [], id = Array.from({ length: n }, () => new Array(n).fill(0));
    let k = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      id[r][c] = k; cages.push({ id: k, cells: [[r, c]], op: "=", target: sol[r][c] }); k++;
    }
    return { n, sol, cages, cageOf: id };
  }

  // human-readable clue, e.g. "12×", "3−", "8+", "2÷", "5"
  function clueText(cage) {
    const sym = { "+": "+", "*": "×", "-": "−", "/": "÷", "=": "" };
    return cage.target + (sym[cage.op] || "");
  }

  // ---- validate a player grid (0 = empty). Returns { errGrid, solved, filled } ----
  function validate(puzzle, grid) {
    const n = puzzle.n;
    const errGrid = Array.from({ length: n }, () => new Array(n).fill(false));

    // row/column duplicates
    for (let r = 0; r < n; r++) {
      const seen = {};
      for (let c = 0; c < n; c++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(c); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((c) => errGrid[r][c] = true);
    }
    for (let c = 0; c < n; c++) {
      const seen = {};
      for (let r = 0; r < n; r++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(r); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((r) => errGrid[r][c] = true);
    }

    // cage violations — only flag a cage once every cell in it is filled
    for (const cage of puzzle.cages) {
      const vals = [];
      let full = true;
      for (const [r, c] of cage.cells) { const v = grid[r][c]; if (!v) full = false; vals.push(v); }
      if (full && !cageSatisfied(cage, vals)) {
        cage.cells.forEach(([r, c]) => errGrid[r][c] = true);
      }
    }

    let filled = 0, anyErr = false;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (grid[r][c]) filled++;
      if (errGrid[r][c]) anyErr = true;
    }
    const solved = filled === n * n && !anyErr;
    return { errGrid, solved, filled };
  }

  window.KenKen = { generate, validate, clueText, cageSatisfied };
})();
