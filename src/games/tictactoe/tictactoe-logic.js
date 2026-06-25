/* ============================================================
   tictactoe-logic.js — Binary puzzle engine
   Grid values: 0 = empty, 1 = X, 2 = O

   Rules enforced:
     1. No three consecutive identical symbols in any row or column.
     2. Each row and column contains exactly n/2 X's and n/2 O's
        (grid size n is always even).
     3. No two rows are identical; no two columns are identical.

   Exposed as window.TicTacLogic = { generate, validate, X, O, E }
   ============================================================ */
(function () {
  "use strict";

  const X = 1, O = 2, E = 0;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clone(g) { return g.map(function (r) { return r.slice(); }); }

  /* ── Can we place v at (r, c)? ─────────────────────────── */
  function isLegal(grid, n, r, c, v) {
    var maxRun = Math.max(3, Math.floor(n / 2));
    // Row: no maxRun consecutive
    var row = grid[r].slice(); row[c] = v;
    for (var i = 0; i <= n - maxRun; i++) {
      if (row[i] === E) continue;
      var rs = true;
      for (var j = 1; j < maxRun; j++) { if (row[i + j] !== row[i]) { rs = false; break; } }
      if (rs) return false;
    }
    // Row: equal counts
    var xr = 0, or_ = 0;
    for (var i = 0; i < n; i++) { if (row[i] === X) xr++; else if (row[i] === O) or_++; }
    if (xr > n / 2 || or_ > n / 2) return false;

    // Column: no maxRun consecutive
    var col = [];
    for (var i = 0; i < n; i++) col.push(i === r ? v : grid[i][c]);
    for (var i = 0; i <= n - maxRun; i++) {
      if (col[i] === E) continue;
      var cs = true;
      for (var j = 1; j < maxRun; j++) { if (col[i + j] !== col[i]) { cs = false; break; } }
      if (cs) return false;
    }
    // Column: equal counts
    var xc = 0, oc = 0;
    for (var i = 0; i < n; i++) { if (col[i] === X) xc++; else if (col[i] === O) oc++; }
    if (xc > n / 2 || oc > n / 2) return false;

    return true;
  }

  /* ── Valid candidates for an empty cell ────────────────── */
  function getCandidates(grid, n, r, c) {
    var result = [];
    if (isLegal(grid, n, r, c, X)) result.push(X);
    if (isLegal(grid, n, r, c, O)) result.push(O);
    return result;
  }

  /* ── Count solutions, capped at `limit` ─────────────────── */
  function countSolutions(grid, n, limit, budget) {
    budget = budget || 400000;
    var g = clone(grid);
    var found = 0, nodes = 0, aborted = false;

    function solve() {
      if (found >= limit || aborted) return;
      if (++nodes > budget) { aborted = true; return; }

      // MRV: find the empty cell with fewest valid candidates
      var br = -1, bc = -1, best = 3;
      outer:
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (g[r][c] !== E) continue;
          var cands = getCandidates(g, n, r, c);
          if (cands.length === 0) return; // dead end
          if (cands.length < best) {
            best = cands.length; br = r; bc = c;
            if (best === 1) break outer;
          }
        }
      }

      if (br === -1) {
        // All cells filled — count as valid solution
        found++;
        return;
      }

      var cands = getCandidates(g, n, br, bc);
      for (var i = 0; i < cands.length; i++) {
        g[br][bc] = cands[i];
        solve();
        g[br][bc] = E;
        if (found >= limit || aborted) return;
      }
    }

    solve();
    return aborted ? limit : found;
  }

  /* ── Generate a fully-filled valid grid ─────────────────── */
  function generateFull(n) {
    var grid = Array.from({ length: n }, function () { return new Array(n).fill(E); });

    function fill(pos) {
      if (pos === n * n) {
        var rowStr = grid.map(function (row) { return row.join(''); });
        if (new Set(rowStr).size !== n) return false;
        var colStr = [];
        for (var c = 0; c < n; c++) colStr.push(grid.map(function (row) { return row[c]; }).join(''));
        return new Set(colStr).size === n;
      }
      var r = Math.floor(pos / n), c = pos % n;
      var vals = shuffle([X, O]);
      for (var i = 0; i < vals.length; i++) {
        if (isLegal(grid, n, r, c, vals[i])) {
          grid[r][c] = vals[i];
          if (fill(pos + 1)) return true;
          grid[r][c] = E;
        }
      }
      return false;
    }

    for (var attempt = 0; attempt < 30; attempt++) {
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) grid[r][c] = E;
      if (fill(0)) return grid;
    }
    return grid; // safety fallback
  }

  /* ── Difficulty configuration ────────────────────────────── */
  var DIFF = {
    easy:   { n: 4,  keepFrac: 0.60 },
    medium: { n: 6,  keepFrac: 0.50 },
    hard:   { n: 8,  keepFrac: 0.40 },
  };

  /* ── Public: generate a puzzle ───────────────────────────── */
  function generate(diffKey) {
    var d = DIFF[diffKey] || DIFF.medium;
    var n = d.n, keepFrac = d.keepFrac;
    var sol = generateFull(n);
    var given = clone(sol);

    // Collect all positions and shuffle for hole-digging
    var cells = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) cells.push([r, c]);
    shuffle(cells);

    var target = Math.round(n * n * keepFrac);
    var kept = n * n;

    for (var i = 0; i < cells.length; i++) {
      if (kept <= target) break;
      var r = cells[i][0], c = cells[i][1];
      var old = given[r][c];
      given[r][c] = E;
      // Restore if uniqueness is lost (use limited budget for speed)
      if (countSolutions(given, n, 2, 120000) !== 1) {
        given[r][c] = old;
      } else {
        kept--;
      }
    }

    var givenMask = Array.from({ length: n }, function (_, r) {
      return Array.from({ length: n }, function (_, c) { return given[r][c] !== E; });
    });

    return { n: n, sol: sol, givens: given, given: givenMask };
  }

  /* ── Public: validate player grid (0 = empty) ───────────── */
  function validate(puzzle, grid) {
    var n = puzzle.n;
    var maxRun = Math.max(3, Math.floor(n / 2));
    var errGrid = Array.from({ length: n }, function () { return new Array(n).fill(false); });

    // Row violations
    for (var r = 0; r < n; r++) {
      // No maxRun consecutive
      for (var c = 0; c <= n - maxRun; c++) {
        if (grid[r][c] === E) continue;
        var rowSame = true;
        for (var j = 1; j < maxRun; j++) { if (grid[r][c + j] !== grid[r][c]) { rowSame = false; break; } }
        if (rowSame) { for (var j = 0; j < maxRun; j++) errGrid[r][c + j] = true; }
      }
      // Count constraint
      var xCount = 0, oCount = 0;
      for (var c = 0; c < n; c++) { if (grid[r][c] === X) xCount++; else if (grid[r][c] === O) oCount++; }
      if (xCount > n / 2 || oCount > n / 2) {
        for (var c = 0; c < n; c++) if (grid[r][c] !== E) errGrid[r][c] = true;
      }
    }

    // Column violations
    for (var c = 0; c < n; c++) {
      // No maxRun consecutive
      for (var r = 0; r <= n - maxRun; r++) {
        if (grid[r][c] === E) continue;
        var colSame = true;
        for (var j = 1; j < maxRun; j++) { if (grid[r + j][c] !== grid[r][c]) { colSame = false; break; } }
        if (colSame) { for (var j = 0; j < maxRun; j++) errGrid[r + j][c] = true; }
      }
      // Count constraint
      var xCount = 0, oCount = 0;
      for (var r = 0; r < n; r++) { if (grid[r][c] === X) xCount++; else if (grid[r][c] === O) oCount++; }
      if (xCount > n / 2 || oCount > n / 2) {
        for (var r = 0; r < n; r++) if (grid[r][c] !== E) errGrid[r][c] = true;
      }
    }

    var filled = 0, anyErr = false;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (grid[r][c] !== E) filled++;
      if (errGrid[r][c]) anyErr = true;
    }

    return { errGrid: errGrid, solved: filled === n * n && !anyErr, filled: filled };
  }

  window.TicTacLogic = { generate: generate, validate: validate, X: X, O: O, E: E };
})();
