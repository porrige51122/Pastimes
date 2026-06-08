/* ============================================================
   futoshiki-logic.js — Futoshiki engine
   Latin square + inequality (greater-than) constraints + a few
   givens, dug down to a guaranteed-unique solution (verified by
   an internal solver). Exposed as window.Futoshiki.

   Inequalities are stored as a list of { a:[r,c], b:[r,c] }
   meaning the value at a is GREATER than the value at b.
   Only orthogonally-adjacent pairs are used.
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
  const clone = (g) => g.map((r) => r.slice());

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

  const key = (r, c) => r + "," + c;

  function popcount(x) { let n = 0; while (x) { x &= x - 1; n++; } return n; }

  // count solutions consistent with givens + inequalities, stop at `limit`.
  // Uses bitmask candidates, MRV cell selection and inequality bound pruning,
  // so even the fully-signed board verifies quickly.
  function countSolutions(n, givens, ineqs, limit, budget) {
    budget = budget || 3000000;
    const FULL = (1 << n) - 1;
    const grid = clone(givens);
    const rowMask = new Array(n).fill(0);
    const colMask = new Array(n).fill(0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v) { rowMask[r] |= 1 << (v - 1); colMask[c] |= 1 << (v - 1); }
    }
    // per-cell inequality relations: { o:[r,c], greater:true means this cell > o }
    const rel = {};
    for (const iq of ineqs) {
      const ak = key(iq.a[0], iq.a[1]), bk = key(iq.b[0], iq.b[1]);
      (rel[ak] = rel[ak] || []).push({ o: iq.b, greater: true });
      (rel[bk] = rel[bk] || []).push({ o: iq.a, greater: false });
    }
    let found = 0, nodes = 0, aborted = false;

    function candMask(r, c) {
      let m = FULL & ~rowMask[r] & ~colMask[c];
      const lst = rel[key(r, c)];
      if (lst) for (const { o, greater } of lst) {
        const ov = grid[o[0]][o[1]];
        if (ov) {
          if (greater) m &= ~((1 << ov) - 1);     // value must be > ov
          else m &= (1 << (ov - 1)) - 1;          // value must be < ov
        }
      }
      return m;
    }

    function solve() {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }
      let br = -1, bc = -1, bm = 0, bn = 99;
      for (let r = 0; r < n && bn !== 1; r++)
        for (let c = 0; c < n; c++) {
          if (grid[r][c]) continue;
          const m = candMask(r, c), cnt = popcount(m);
          if (cnt === 0) return;                  // dead end
          if (cnt < bn) { bn = cnt; bm = m; br = r; bc = c; if (cnt === 1) break; }
        }
      if (br === -1) { found++; return; }         // all cells filled
      for (let v = 1; v <= n; v++) {
        const bit = 1 << (v - 1);
        if (!(bm & bit)) continue;
        grid[br][bc] = v; rowMask[br] |= bit; colMask[bc] |= bit;
        solve();
        grid[br][bc] = 0; rowMask[br] &= ~bit; colMask[bc] &= ~bit;
        if (found >= limit || aborted) return;
      }
    }
    solve();
    return aborted ? limit : found;
  }

  // difficulty tuning: fraction of inequality edges to KEEP (lower = harder),
  // and how many cells to reveal as extra givens (more = easier).
  const TUNE = {
    easy:   { keepFrac: 0.50, givenFrac: 0.16 },
    medium: { keepFrac: 0.34, givenFrac: 0.06 },
    hard:   { keepFrac: 0.55, givenFrac: 0.0  },
  };

  function buildEdges(sol, n) {
    const edges = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (c < n - 1) { const p = [r, c], q = [r, c + 1]; edges.push(sol[r][c] > sol[r][c + 1] ? { a: p, b: q } : { a: q, b: p }); }
      if (r < n - 1) { const p = [r, c], q = [r + 1, c]; edges.push(sol[r][c] > sol[r + 1][c] ? { a: p, b: q } : { a: q, b: p }); }
    }
    return edges;
  }

  // Generation is correct *by construction*: we begin from the fully-signed
  // board (chosen so it is uniquely solvable) and only ever REMOVE signs while
  // the solution stays unique — so the result is always unique. Each removal
  // check runs under a node budget; if a check times out we conservatively
  // keep the sign, which keeps generation fast and never breaks uniqueness.
  function generate(n, diff) {
    const tune = TUNE[diff] || TUNE.medium;
    let sol, allEdges;
    const givens = Array.from({ length: n }, () => new Array(n).fill(0));

    // pick a Latin square whose fully-signed board is already unique
    for (let attempt = 0; attempt < 16; attempt++) {
      sol = genLatin(n);
      allEdges = buildEdges(sol, n);
      if (countSolutions(n, givens, allEdges, 2, 1500000) === 1) break;
    }
    // safety net: if still not unique, reveal givens until it is
    if (countSolutions(n, givens, allEdges, 2, 1500000) !== 1) {
      const cells = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);
      shuffle(cells);
      for (const [r, c] of cells) {
        givens[r][c] = sol[r][c];
        if (countSolutions(n, givens, allEdges, 2, 1500000) === 1) break;
      }
    }

    // greedily drop signs (uniqueness-preserving) down to a difficulty target
    const target = Math.max(Math.ceil(n * 0.6), Math.round(allEdges.length * tune.keepFrac));
    let kept = allEdges.slice();
    shuffle(kept);
    for (let i = kept.length - 1; i >= 0 && kept.length > target; i--) {
      const trial = kept.slice(0, i).concat(kept.slice(i + 1));
      if (countSolutions(n, givens, trial, 2, 60000) === 1) kept = trial;
    }

    // for easier levels, reveal a few extra givens (always uniqueness-preserving)
    const extra = Math.round(n * n * tune.givenFrac);
    if (extra > 0) {
      const empties = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!givens[r][c]) empties.push([r, c]);
      shuffle(empties);
      for (let i = 0; i < extra && i < empties.length; i++) {
        const [r, c] = empties[i];
        givens[r][c] = sol[r][c];
      }
    }

    const given = givens.map((row) => row.map((v) => v !== 0));
    return { n, sol, ineqs: kept, givens, given };
  }

  // validate a player grid (0 = empty). Returns { errGrid, ineqBad, solved, filled }
  function validate(puzzle, grid) {
    const n = puzzle.n;
    const errGrid = Array.from({ length: n }, () => new Array(n).fill(false));
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
    // inequality violations (only when both ends are filled)
    const ineqBad = {};
    puzzle.ineqs.forEach((iq, i) => {
      const av = grid[iq.a[0]][iq.a[1]], bv = grid[iq.b[0]][iq.b[1]];
      if (av && bv && !(av > bv)) {
        ineqBad[i] = true;
        errGrid[iq.a[0]][iq.a[1]] = true;
        errGrid[iq.b[0]][iq.b[1]] = true;
      }
    });

    let filled = 0, anyErr = false;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (grid[r][c]) filled++;
      if (errGrid[r][c]) anyErr = true;
    }
    const solved = filled === n * n && !anyErr;
    return { errGrid, ineqBad, solved, filled };
  }

  window.Futoshiki = { generate, validate };
})();
