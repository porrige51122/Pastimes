/* ============================================================
   starbattle-logic.js — place stars in rows, columns & regions
   Exposed as window.StarBattle
   ============================================================ */
(function () {
  var CONFIGS = {
    easy:   { size: 5, stars: 1 },
    medium: { size: 7, stars: 1 },
    hard:   { size: 8, stars: 2 },
  };

  function rand(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  /* ---- region generation ---- */
  function generateRegions(n) {
    var map = [], allCells = [];
    for (var r = 0; r < n; r++) {
      map[r] = [];
      for (var c = 0; c < n; c++) { map[r][c] = -1; allCells.push([r, c]); }
    }
    shuffle(allCells);
    for (var i = 0; i < n; i++) map[allCells[i][0]][allCells[i][1]] = i;

    var left = n * n - n;
    while (left > 0) {
      var opts = [];
      for (var r = 0; r < n; r++)
        for (var c = 0; c < n; c++) {
          if (map[r][c] !== -1) continue;
          var seen = {};
          for (var d = 0; d < 4; d++) {
            var nr = r + DIRS[d][0], nc = c + DIRS[d][1];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && map[nr][nc] !== -1 && !seen[map[nr][nc]]) {
              seen[map[nr][nc]] = true;
              opts.push([r, c, map[nr][nc]]);
            }
          }
        }
      if (!opts.length) break;

      var sizes = new Array(n).fill(0);
      for (var r = 0; r < n; r++)
        for (var c = 0; c < n; c++)
          if (map[r][c] !== -1) sizes[map[r][c]]++;

      var minS = Infinity;
      for (var i = 0; i < opts.length; i++)
        if (sizes[opts[i][2]] < minS) minS = sizes[opts[i][2]];
      var best = opts.filter(function (o) { return sizes[o[2]] === minS; });
      var pick = best[rand(best.length)];
      map[pick[0]][pick[1]] = pick[2];
      left--;
    }
    return map;
  }

  /* ---- solver (backtracking, row-by-row) ---- */
  function solve(regionMap, n, numStars, maxSol) {
    var grid = [];
    for (var r = 0; r < n; r++) { grid[r] = []; for (var c = 0; c < n; c++) grid[r][c] = 0; }
    var colCnt = new Array(n).fill(0);
    var regCnt = new Array(n).fill(0);
    var solutions = [];
    var iters = 0, MAX_ITER = 400000;

    function ok(r, c) {
      if (colCnt[c] >= numStars) return false;
      if (regCnt[regionMap[r][c]] >= numStars) return false;
      for (var dr = -1; dr <= 1; dr++)
        for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc]) return false;
        }
      return true;
    }

    function bt(row, placed, startCol) {
      if (++iters > MAX_ITER || solutions.length >= maxSol) return;
      if (placed === numStars) {
        if (row === n - 1) {
          for (var c = 0; c < n; c++) if (colCnt[c] !== numStars) return;
          for (var rg = 0; rg < n; rg++) if (regCnt[rg] !== numStars) return;
          solutions.push(grid.map(function (row) { return row.slice(); }));
          return;
        }
        bt(row + 1, 0, 0);
        return;
      }
      for (var c = startCol; c < n; c++) {
        if (ok(row, c)) {
          grid[row][c] = 1; colCnt[c]++; regCnt[regionMap[row][c]]++;
          bt(row, placed + 1, c + 2);
          grid[row][c] = 0; colCnt[c]--; regCnt[regionMap[row][c]]--;
        }
      }
    }

    bt(0, 0, 0);
    return solutions;
  }

  /* ---- puzzle generation ---- */
  function generate(diff) {
    var cfg = CONFIGS[diff];
    var n = cfg.size, ns = cfg.stars;
    for (var attempt = 0; attempt < 300; attempt++) {
      var regions = generateRegions(n);
      var sols = solve(regions, n, ns, 2);
      if (sols.length === 1) {
        return { size: n, stars: ns, regions: regions, solution: sols[0] };
      }
    }
    /* fallback — return first solvable even if not proven unique */
    for (var fb = 0; fb < 100; fb++) {
      var regions = generateRegions(n);
      var sols = solve(regions, n, ns, 1);
      if (sols.length >= 1) {
        return { size: n, stars: ns, regions: regions, solution: sols[0] };
      }
    }
    return generate(diff);
  }

  /* ---- win check (full constraint validation) ---- */
  function checkWin(grid, puzzle) {
    var n = puzzle.size, ns = puzzle.stars;
    for (var r = 0; r < n; r++) {
      var cnt = 0;
      for (var c = 0; c < n; c++) if (grid[r][c] === 1) cnt++;
      if (cnt !== ns) return false;
    }
    for (var c = 0; c < n; c++) {
      var cnt = 0;
      for (var r = 0; r < n; r++) if (grid[r][c] === 1) cnt++;
      if (cnt !== ns) return false;
    }
    var regCnt = new Array(n).fill(0);
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++)
        if (grid[r][c] === 1) regCnt[puzzle.regions[r][c]]++;
    for (var i = 0; i < n; i++) if (regCnt[i] !== ns) return false;
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) {
        if (grid[r][c] !== 1) continue;
        for (var dr = -1; dr <= 1; dr++)
          for (var dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 1) return false;
          }
      }
    return true;
  }

  window.StarBattle = { generate: generate, checkWin: checkWin, CONFIGS: CONFIGS };
})();
