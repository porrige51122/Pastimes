/* ============================================================
   battleships-logic.js — place the hidden fleet
   Exposed as window.Battleships
   ============================================================ */
(function () {
  var CONFIGS = {
    easy:   { size: 6,  fleet: [3, 2, 2, 1, 1],                 hintRate: 0.38 },
    medium: { size: 8,  fleet: [4, 3, 2, 2, 1, 1, 1],           hintRate: 0.22 },
    hard:   { size: 10, fleet: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1],  hintRate: 0.13 },
  };

  function rand(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function grid0(n) {
    var g = [];
    for (var r = 0; r < n; r++) { g[r] = []; for (var c = 0; c < n; c++) g[r][c] = 0; }
    return g;
  }

  function canPlace(g, n, len, r, c, vert) {
    var dr = vert ? 1 : 0, dc = vert ? 0 : 1;
    if (r + dr * (len - 1) >= n || c + dc * (len - 1) >= n) return false;
    for (var i = 0; i < len; i++) {
      var sr = r + dr * i, sc = c + dc * i;
      for (var nr = sr - 1; nr <= sr + 1; nr++)
        for (var nc = sc - 1; nc <= sc + 1; nc++)
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && g[nr][nc]) return false;
    }
    return true;
  }

  function putShip(g, len, r, c, vert) {
    var dr = vert ? 1 : 0, dc = vert ? 0 : 1;
    for (var i = 0; i < len; i++) g[r + dr * i][c + dc * i] = 1;
  }

  function buildSolution(cfg) {
    var n = cfg.size;
    var fleet = cfg.fleet.slice().sort(function (a, b) { return b - a; });
    for (var att = 0; att < 500; att++) {
      var g = grid0(n), ok = true;
      for (var s = 0; s < fleet.length; s++) {
        var len = fleet[s], opts = [];
        for (var r = 0; r < n; r++)
          for (var c = 0; c < n; c++)
            for (var d = 0; d < 2; d++) {
              if (len === 1 && d === 1) continue;
              if (canPlace(g, n, len, r, c, d)) opts.push([r, c, d]);
            }
        if (!opts.length) { ok = false; break; }
        var p = opts[rand(opts.length)];
        putShip(g, len, p[0], p[1], p[2]);
      }
      if (ok) return g;
    }
    return null;
  }

  function segType(g, r, c) {
    var n = g.length;
    if (!g[r][c]) return null;
    var u = r > 0 && g[r - 1][c], d = r < n - 1 && g[r + 1][c];
    var l = c > 0 && g[r][c - 1], ri = c < n - 1 && g[r][c + 1];
    if (!u && !d && !l && !ri) return "sub";
    if (!u && d && !l && !ri) return "top";
    if (u && !d && !l && !ri) return "bot";
    if (!u && !d && !l && ri) return "lft";
    if (!u && !d && l && !ri) return "rgt";
    return "mid";
  }

  function generate(diff) {
    var cfg = CONFIGS[diff];
    var sol = buildSolution(cfg);
    if (!sol) return generate(diff);
    var n = cfg.size;

    var rc = [], cc = [];
    for (var r = 0; r < n; r++) { var s = 0; for (var c = 0; c < n; c++) s += sol[r][c]; rc.push(s); }
    for (var c = 0; c < n; c++) { var s = 0; for (var r = 0; r < n; r++) s += sol[r][c]; cc.push(s); }

    var types = grid0(n);
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) types[r][c] = segType(sol, r, c);

    var hints = grid0(n);
    var shipCells = [], waterCells = [];
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++)
        (sol[r][c] ? shipCells : waterCells).push([r, c]);
    shuffle(shipCells); shuffle(waterCells);

    var rate = cfg.hintRate;
    var nShip = Math.max(1, Math.ceil(shipCells.length * rate));
    var nWater = Math.max(1, Math.ceil(waterCells.length * rate * 0.35));
    for (var i = 0; i < nShip && i < shipCells.length; i++) {
      var p = shipCells[i]; hints[p[0]][p[1]] = types[p[0]][p[1]];
    }
    for (var i = 0; i < nWater && i < waterCells.length; i++) {
      var p = waterCells[i]; hints[p[0]][p[1]] = "water";
    }

    return {
      size: n,
      fleet: cfg.fleet.slice().sort(function (a, b) { return b - a; }),
      solution: sol, rowCounts: rc, colCounts: cc, hints: hints, types: types,
    };
  }

  /* Full constraint check so any valid placement is accepted */
  function checkWin(playerGrid, puzzle) {
    var n = puzzle.size;
    for (var r = 0; r < n; r++) {
      var cnt = 0;
      for (var c = 0; c < n; c++) if (playerGrid[r][c] === 1) cnt++;
      if (cnt !== puzzle.rowCounts[r]) return false;
    }
    for (var c = 0; c < n; c++) {
      var cnt = 0;
      for (var r = 0; r < n; r++) if (playerGrid[r][c] === 1) cnt++;
      if (cnt !== puzzle.colCounts[c]) return false;
    }
    /* no diagonal adjacency */
    var diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) {
        if (playerGrid[r][c] !== 1) continue;
        for (var d = 0; d < 4; d++) {
          var nr = r + diags[d][0], nc = c + diags[d][1];
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && playerGrid[nr][nc] === 1) return false;
        }
      }
    /* valid ship shapes + fleet match */
    var vis = grid0(n), ships = [];
    var orth = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++) {
        if (playerGrid[r][c] !== 1 || vis[r][c]) continue;
        var q = [[r, c]], cells = []; vis[r][c] = 1;
        while (q.length) {
          var cur = q.shift(); cells.push(cur);
          for (var d = 0; d < 4; d++) {
            var nr2 = cur[0] + orth[d][0], nc2 = cur[1] + orth[d][1];
            if (nr2 >= 0 && nr2 < n && nc2 >= 0 && nc2 < n && playerGrid[nr2][nc2] === 1 && !vis[nr2][nc2]) {
              vis[nr2][nc2] = 1; q.push([nr2, nc2]);
            }
          }
        }
        var minR = n, maxR = 0, minC = n, maxC = 0;
        for (var i = 0; i < cells.length; i++) {
          minR = Math.min(minR, cells[i][0]); maxR = Math.max(maxR, cells[i][0]);
          minC = Math.min(minC, cells[i][1]); maxC = Math.max(maxC, cells[i][1]);
        }
        var h = maxR - minR + 1, w = maxC - minC + 1;
        if (h > 1 && w > 1) return false;
        if (cells.length !== Math.max(h, w)) return false;
        ships.push(cells.length);
      }
    ships.sort(function (a, b) { return b - a; });
    var fleet = puzzle.fleet.slice().sort(function (a, b) { return b - a; });
    if (ships.length !== fleet.length) return false;
    for (var i = 0; i < ships.length; i++) if (ships[i] !== fleet[i]) return false;
    return true;
  }

  window.Battleships = { generate: generate, checkWin: checkWin, CONFIGS: CONFIGS, segType: segType };
})();
