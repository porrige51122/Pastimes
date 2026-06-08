/* ============================================================
   mosaic-logic.js — Mosaic / Fill-a-Pix engine
   Each clue counts the shaded cells in its 3×3 neighbourhood
   (including itself). A hidden solution is generated, full clues
   computed, then clues are removed only while the solution stays
   UNIQUE — verified by a propagation + backtracking solver.
   Exposed as window.Mosaic.

   Cell states used by the player: 0 = unknown, 1 = shaded, 2 = blank.
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

  // precompute the 3×3 (clipped) neighbourhood of every cell
  function neighbourhoods(n) {
    const nb = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const list = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) list.push(rr * n + cc);
      }
      nb.push(list);
    }
    return nb;
  }

  // a pleasing-ish solution: random fill, mirrored left↔right for symmetry
  function genPattern(n) {
    const half = Math.ceil(n / 2);
    const cells = new Uint8Array(n * n);
    const density = 0.42 + Math.random() * 0.16;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < half; c++) {
        const v = Math.random() < density ? 1 : 0;
        cells[r * n + c] = v;
        cells[r * n + (n - 1 - c)] = v;
      }
    }
    return cells;
  }

  function fullClues(n, sol, nb) {
    const clues = new Int16Array(n * n);
    for (let i = 0; i < n * n; i++) {
      let k = 0;
      for (const j of nb[i]) if (sol[j]) k++;
      clues[i] = k;
    }
    return clues;
  }

  // count solutions consistent with the clue set (clueIdx list + clueVal map),
  // stop at `limit`. Uses forced-move propagation then branches. Aborts past
  // `budget` nodes, returning `limit` (treat as non-unique — the safe side).
  function countSolutions(n, present, clueVal, nb, limit, budget) {
    budget = budget || 250000;
    const cells = n * n;
    let nodes = 0, aborted = false;

    // propagate forced moves on a state array; returns false on contradiction
    function propagate(state) {
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < cells; i++) {
          if (!present[i]) continue;
          const k = clueVal[i], list = nb[i];
          let sh = 0, unk = 0, unkList = null;
          for (const j of list) {
            if (state[j] === 1) sh++;
            else if (state[j] === 0) { unk++; (unkList || (unkList = [])).push(j); }
          }
          if (sh > k) return false;
          if (sh + unk < k) return false;
          if (unk > 0 && sh === k) { for (const j of unkList) state[j] = 2; changed = true; }
          else if (unk > 0 && sh + unk === k) { for (const j of unkList) state[j] = 1; changed = true; }
        }
      }
      return true;
    }

    let found = 0;
    function solve(state) {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }
      if (!propagate(state)) return;
      // choose a branching cell: an unknown inside the clue with fewest unknowns
      let bestClue = -1, bestUnk = 1e9;
      for (let i = 0; i < cells; i++) {
        if (!present[i]) continue;
        let unk = 0;
        for (const j of nb[i]) if (state[j] === 0) unk++;
        if (unk > 0 && unk < bestUnk) { bestUnk = unk; bestClue = i; }
      }
      let pick = -1;
      if (bestClue >= 0) {
        for (const j of nb[bestClue]) if (state[j] === 0) { pick = j; break; }
      } else {
        // no clue has unknowns left — any remaining unknown is unconstrained
        for (let i = 0; i < cells; i++) if (state[i] === 0) { pick = i; break; }
      }
      if (pick === -1) { found++; return; } // fully decided
      for (const val of [1, 2]) {
        const next = state.slice();
        next[pick] = val;
        solve(next);
        if (found >= limit || aborted) return;
      }
    }
    solve(new Uint8Array(cells));
    return aborted ? limit : found;
  }

  // difficulty → fraction of clue cells to KEEP (lower = harder)
  const KEEP = { easy: 0.82, medium: 0.66, hard: 0.62 };

  function generate(n, diff) {
    const nb = neighbourhoods(n);
    const keepFrac = KEEP[diff] || 0.66;
    let sol, clues;

    // pick a solution whose fully-clued board is uniquely solvable
    for (let attempt = 0; attempt < 24; attempt++) {
      sol = genPattern(n);
      const shaded = sol.reduce((a, v) => a + v, 0);
      if (shaded < n || shaded > n * n - n) continue; // avoid near-empty / near-full
      clues = fullClues(n, sol, nb);
      const present = new Uint8Array(n * n).fill(1);
      if (countSolutions(n, present, clues, nb, 2, 400000) === 1) break;
      sol = null;
    }
    if (!sol) { // fallback: accept a fresh full-clue board as-is
      sol = genPattern(n);
      clues = fullClues(n, sol, nb);
    }

    // dig clues away while the solution stays unique
    const present = new Uint8Array(n * n).fill(1);
    const targetKeep = Math.round(n * n * keepFrac);
    let kept = n * n;
    const order = [];
    for (let i = 0; i < n * n; i++) order.push(i);
    shuffle(order);
    for (const i of order) {
      if (kept <= targetKeep) break;
      present[i] = 0;
      if (countSolutions(n, present, clues, nb, 2, 120000) === 1) kept--;
      else present[i] = 1; // needed for uniqueness — keep it
    }

    // expose clues as a 2D array (null where no clue)
    const clueGrid = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => present[r * n + c] ? clues[r * n + c] : null));
    const solGrid = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => !!sol[r * n + c]));

    return { n, clues: clueGrid, sol: solGrid, shadedTotal: sol.reduce((a, v) => a + v, 0) };
  }

  // validate a player state grid (0 unknown, 1 shaded, 2 blank).
  // Returns { errClue: 2D bool, doneClue: 2D bool, solved, shaded }.
  function validate(puzzle, state) {
    const n = puzzle.n;
    const errClue = Array.from({ length: n }, () => new Array(n).fill(false));
    const doneClue = Array.from({ length: n }, () => new Array(n).fill(false));
    let shaded = 0, solved = true;

    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (state[r][c] === 1) shaded++;
      const isShaded = state[r][c] === 1;
      if (isShaded !== puzzle.sol[r][c]) solved = false;
    }

    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const k = puzzle.clues[r][c];
      if (k == null) continue;
      let sh = 0, unk = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        if (state[rr][cc] === 1) sh++;
        else if (state[rr][cc] === 0) unk++;
      }
      if (sh > k || sh + unk < k) errClue[r][c] = true;
      else if (unk === 0 && sh === k) doneClue[r][c] = true;
    }
    return { errClue, doneClue, solved, shaded };
  }

  window.Mosaic = { generate, validate };
})();
