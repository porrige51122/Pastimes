/* ============================================================
   killer-logic.js — Killer Sudoku engine
   A solved 9×9 grid is carved into cages (no repeated digit
   inside a cage); each cage shows the SUM of its cells. Givens
   are added only as needed so the puzzle has a guaranteed-unique
   solution, verified by a cage-aware solver (sudoku bitmasks +
   cage sum / distinct pruning + MRV). Exposed as window.Killer.
   ============================================================ */
(function () {
  "use strict";

  const N = 9;
  const bi = (r, c) => (Math.floor(r / 3) * 3) + Math.floor(c / 3);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const clone = (g) => g.map((r) => r.slice());
  function popcount(x) { let n = 0; while (x) { x &= x - 1; n++; } return n; }
  // smallest / largest k distinct digits drawn from a 9-bit availability mask
  function minSum(mask, k) { let s = 0, c = 0; for (let v = 1; v <= 9 && c < k; v++) if (mask & (1 << (v - 1))) { s += v; c++; } return c < k ? Infinity : s; }
  function maxSum(mask, k) { let s = 0, c = 0; for (let v = 9; v >= 1 && c < k; v--) if (mask & (1 << (v - 1))) { s += v; c++; } return c < k ? -1 : s; }

  // ---- a fully solved grid via randomized bitmask backtracking ----
  function fullGrid() {
    const grid = Array.from({ length: N }, () => new Array(N).fill(0));
    const rowM = new Array(N).fill(0), colM = new Array(N).fill(0), boxM = new Array(N).fill(0);
    function fill(pos) {
      if (pos === 81) return true;
      const r = Math.floor(pos / 9), c = pos % 9;
      const avail = (~(rowM[r] | colM[c] | boxM[bi(r, c)])) & 0x1ff;
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

  // ---- carve into contiguous cages with DISTINCT digits inside each ----
  function partition(sol) {
    const id = Array.from({ length: N }, () => new Array(N).fill(-1));
    const cages = [];
    const order = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
    shuffle(order);

    function freeNb(cells, usedMask) {
      const out = [];
      for (const [r, c] of cells) {
        const around = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [rr, cc] of around) {
          if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
          if (id[rr][cc] !== -1) continue;
          const bit = 1 << (sol[rr][cc] - 1);
          if (usedMask & bit) continue;       // keep digits distinct in the cage
          out.push([rr, cc]);
        }
      }
      return out;
    }

    for (const [sr, sc] of order) {
      if (id[sr][sc] !== -1) continue;
      const cid = cages.length;
      const roll = Math.random();
      const target = roll < 0.04 ? 1 : roll < 0.30 ? 2 : roll < 0.68 ? 3 : 4;
      const cells = [[sr, sc]];
      let usedMask = 1 << (sol[sr][sc] - 1);
      id[sr][sc] = cid;
      while (cells.length < target) {
        const front = freeNb(cells, usedMask);
        if (!front.length) break;
        const [nr, nc] = front[Math.floor(Math.random() * front.length)];
        id[nr][nc] = cid; cells.push([nr, nc]); usedMask |= 1 << (sol[nr][nc] - 1);
      }
      const sum = cells.reduce((s, [r, c]) => s + sol[r][c], 0);
      cages.push({ id: cid, cells, target: sum });
    }
    return { id, cages };
  }

  // ---- count solutions (sudoku + cage constraints), stop at `limit` ----
  function countSolutions(cages, cageOf, givens, limit, budget) {
    budget = budget || 1500000;
    const grid = clone(givens);
    const rowM = new Array(N).fill(0), colM = new Array(N).fill(0), boxM = new Array(N).fill(0);
    const cSum = new Array(cages.length).fill(0);
    const cUsed = new Array(cages.length).fill(0);
    const cRem = cages.map((cg) => cg.cells.length);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = grid[r][c];
      if (v) {
        const m = 1 << (v - 1);
        rowM[r] |= m; colM[c] |= m; boxM[bi(r, c)] |= m;
        const id = cageOf[r][c]; cSum[id] += v; cUsed[id] |= m; cRem[id]--;
      }
    }
    let found = 0, nodes = 0, aborted = false;

    function candMask(r, c) {
      let base = (~(rowM[r] | colM[c] | boxM[bi(r, c)])) & 0x1ff;
      const id = cageOf[r][c], cg = cages[id];
      base &= ~cUsed[id];                       // distinct within cage
      let out = 0;
      let bits = base;
      while (bits) {
        const bit = bits & -bits; bits ^= bit;
        const v = Math.log2(bit) + 1;
        const rem = cRem[id] - 1;
        const remTarget = cg.target - cSum[id] - v;
        if (rem === 0) { if (remTarget === 0) out |= bit; continue; }
        if (remTarget < rem) continue;          // each remaining cell ≥ 1
        const pool = 0x1ff & ~cUsed[id] & ~bit;
        if (remTarget >= minSum(pool, rem) && remTarget <= maxSum(pool, rem)) out |= bit;
      }
      return out;
    }

    function solve() {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }
      let br = -1, bc = -1, bm = 0, bn = 10;
      for (let r = 0; r < N && bn !== 1; r++)
        for (let c = 0; c < N; c++) {
          if (grid[r][c]) continue;
          const m = candMask(r, c), cnt = popcount(m);
          if (cnt === 0) return;
          if (cnt < bn) { bn = cnt; bm = m; br = r; bc = c; if (cnt === 1) break; }
        }
      if (br === -1) { found++; return; }
      const id = cageOf[br][bc];
      let bits = bm;
      while (bits) {
        const bit = bits & -bits; bits ^= bit;
        const v = Math.log2(bit) + 1;
        grid[br][bc] = v; rowM[br] |= bit; colM[bc] |= bit; boxM[bi(br, bc)] |= bit;
        cSum[id] += v; cUsed[id] |= bit; cRem[id]--;
        solve();
        grid[br][bc] = 0; rowM[br] &= ~bit; colM[bc] &= ~bit; boxM[bi(br, bc)] &= ~bit;
        cSum[id] -= v; cUsed[id] &= ~bit; cRem[id]++;
        if (found >= limit || aborted) return;
      }
    }
    solve();
    return aborted ? limit : found;
  }

  // initial desired givens by difficulty; we keep close to this, picking the
  // cage layout that needs the fewest givens for a unique solution.
  const GIVENS = { easy: 6, medium: 2, hard: 0 };

  function generate(diff) {
    const desired = GIVENS[diff] != null ? GIVENS[diff] : 2;
    const cap = desired + 6;          // never reveal more than this many
    let best = null;

    for (let attempt = 0; attempt < 30; attempt++) {
      const sol = fullGrid();
      const { id, cages } = partition(sol);
      if (cages.filter((c) => c.cells.length === 1).length > 5) continue;

      // fixed random order of cells we may reveal as givens
      const order = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
      shuffle(order);

      const givens = Array.from({ length: N }, () => new Array(N).fill(0));
      let count = 0;
      for (; count < desired; count++) { const [r, c] = order[count]; givens[r][c] = sol[r][c]; }

      let unique = countSolutions(cages, id, givens, 2, 1200000) === 1;
      while (!unique && count < cap) {
        const [r, c] = order[count++]; givens[r][c] = sol[r][c];
        unique = countSolutions(cages, id, givens, 2, 1200000) === 1;
      }
      if (!unique) continue;

      if (!best || count < best.count) {
        const given = givens.map((row) => row.map((v) => v !== 0));
        best = { n: N, sol, cages, cageOf: id, givens, given, givenCount: count, count };
      }
      if (best.count <= desired) break;   // ideal layout found
    }

    if (best) { delete best.count; return best; }

    // fallback: reveal givens until unique on a fresh layout (always succeeds)
    const sol = fullGrid();
    const { id, cages } = partition(sol);
    const givens = Array.from({ length: N }, () => new Array(N).fill(0));
    const order = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
    shuffle(order);
    let i = 0, unique = false;
    while (!unique && i < order.length) {
      const [r, c] = order[i++]; givens[r][c] = sol[r][c];
      unique = countSolutions(cages, id, givens, 2, 1200000) === 1;
    }
    const given = givens.map((row) => row.map((v) => v !== 0));
    return { n: N, sol, cages, cageOf: id, givens, given, givenCount: i };
  }

  // cage anchor = top-left-most cell (carries the sum label)
  function cageAnchor(cage) {
    let best = cage.cells[0];
    for (const [r, c] of cage.cells) if (r < best[0] || (r === best[0] && c < best[1])) best = [r, c];
    return best;
  }

  // validate a player grid (0 = empty). Returns { errGrid, solved, filled }
  function validate(puzzle, grid) {
    const errGrid = Array.from({ length: N }, () => new Array(N).fill(false));
    for (let r = 0; r < N; r++) {
      const seen = {};
      for (let c = 0; c < N; c++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(c); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((c) => errGrid[r][c] = true);
    }
    for (let c = 0; c < N; c++) {
      const seen = {};
      for (let r = 0; r < N; r++) { const v = grid[r][c]; if (v) (seen[v] = seen[v] || []).push(r); }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach((r) => errGrid[r][c] = true);
    }
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const seen = {};
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        const r = br * 3 + dr, c = bc * 3 + dc, v = grid[r][c];
        if (v) (seen[v] = seen[v] || []).push([r, c]);
      }
      for (const v in seen) if (seen[v].length > 1) seen[v].forEach(([r, c]) => errGrid[r][c] = true);
    }
    // cage checks: repeated digit, over-sum, or wrong total when full
    for (const cage of puzzle.cages) {
      const vals = [], seen = {};
      let sum = 0, full = true;
      for (const [r, c] of cage.cells) {
        const v = grid[r][c];
        if (!v) { full = false; continue; }
        vals.push(v); sum += v; (seen[v] = seen[v] || []).push([r, c]);
      }
      let bad = false;
      for (const v in seen) if (seen[v].length > 1) { bad = true; seen[v].forEach(([r, c]) => errGrid[r][c] = true); }
      if (sum > cage.target) bad = true;
      if (full && sum !== cage.target) bad = true;
      if (bad) cage.cells.forEach(([r, c]) => { if (grid[r][c]) errGrid[r][c] = true; });
    }

    let filled = 0, anyErr = false;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (grid[r][c]) filled++;
      if (errGrid[r][c]) anyErr = true;
    }
    const solved = filled === 81 && !anyErr;
    return { errGrid, solved, filled };
  }

  window.Killer = { generate, validate, cageAnchor, countSolutions };
})();
