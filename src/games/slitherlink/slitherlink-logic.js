/* ============================================================
   Slitherlink — puzzle engine
   Draw a single closed loop along cell edges. Numbers tell how
   many of each cell's four sides are used by the loop.
   Exposed on window.Slitherlink
   ============================================================ */
(function () {
  "use strict";

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---- edge indexing ------------------------------------------------
     H-edge (r,c): connects vertex (r,c)–(r,c+1)
       r ∈ [0,R], c ∈ [0,C)   index = r*C + c
     V-edge (r,c): connects vertex (r,c)–(r+1,c)
       r ∈ [0,R), c ∈ [0,C]   index = NH + r*(C+1) + c
     NH = (R+1)*C, total = NH + R*(C+1)
  ------------------------------------------------------------------- */
  function NH(R, C) { return (R + 1) * C; }
  function NE(R, C) { return NH(R, C) + R * (C + 1); }
  function hI(R, C, r, c) { return r * C + c; }
  function vI(R, C, r, c) { return NH(R, C) + r * (C + 1) + c; }

  function cellEdges(R, C, r, c) {
    var nh = NH(R, C);
    return [r * C + c, (r + 1) * C + c, nh + r * (C + 1) + c, nh + r * (C + 1) + c + 1];
  }
  function vertexEdges(R, C, vr, vc) {
    var nh = NH(R, C), e = [];
    if (vc > 0) e.push(vr * C + vc - 1);
    if (vc < C) e.push(vr * C + vc);
    if (vr > 0) e.push(nh + (vr - 1) * (C + 1) + vc);
    if (vr < R) e.push(nh + vr * (C + 1) + vc);
    return e;
  }

  /* ---- edge ↔ vertex helpers ---- */
  function edgeVerts(R, C, e) {
    var nh = NH(R, C);
    if (e < nh) { var r = (e / C) | 0, c = e % C; return [[r, c], [r, c + 1]]; }
    var idx = e - nh, r2 = (idx / (C + 1)) | 0, c2 = idx % (C + 1);
    return [[r2, c2], [r2 + 1, c2]];
  }

  /* ---- loop generation via simply-connected inside region ---- */
  var D4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  function outsideOK(ins, R, C) {
    var RR = R + 2, CC = C + 2, sz = RR * CC;
    var vis = new Uint8Array(sz);
    var q = [0]; vis[0] = 1; var cnt = 1;
    var head = 0;
    while (head < q.length) {
      var k = q[head++], kr = (k / CC) | 0, kc = k % CC;
      for (var d = 0; d < 4; d++) {
        var nr = kr + D4[d][0], nc = kc + D4[d][1];
        if (nr < 0 || nr >= RR || nc < 0 || nc >= CC) continue;
        var nk = nr * CC + nc;
        if (vis[nk]) continue;
        var gr = nr - 1, gc = nc - 1;
        if (gr >= 0 && gr < R && gc >= 0 && gc < C && ins[gr * C + gc]) continue;
        vis[nk] = 1; cnt++; q.push(nk);
      }
    }
    var total = sz;
    for (var i = 0; i < R * C; i++) if (ins[i]) total--;
    return cnt === total;
  }

  function generateLoop(R, C) {
    var N = R * C;
    var ins = new Uint8Array(N);
    var target = Math.max(3, (N * (0.25 + Math.random() * 0.22)) | 0);
    var r0 = (R / 2) | 0, c0 = (C / 2) | 0;
    ins[r0 * C + c0] = 1;
    var size = 1;
    var fset = new Set();
    function addF(r, c) {
      if (r >= 0 && r < R && c >= 0 && c < C && !ins[r * C + c]) fset.add(r * C + c);
    }
    for (var d = 0; d < 4; d++) addF(r0 + D4[d][0], c0 + D4[d][1]);

    while (size < target && fset.size > 0) {
      var keys = Array.from(fset);
      var pick = keys[Math.random() * keys.length | 0];
      fset.delete(pick);
      if (ins[pick]) continue;
      ins[pick] = 1;
      if (!outsideOK(ins, R, C)) { ins[pick] = 0; continue; }
      size++;
      var pr = (pick / C) | 0, pc = pick % C;
      for (var d2 = 0; d2 < 4; d2++) addF(pr + D4[d2][0], pc + D4[d2][1]);
    }
    return insideToBoundary(ins, R, C);
  }

  function insideToBoundary(ins, R, C) {
    var ne = NE(R, C), loop = new Uint8Array(ne);
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      if (!ins[r * C + c]) continue;
      if (r === 0 || !ins[(r - 1) * C + c]) loop[hI(R, C, r, c)] = 1;
      if (r === R - 1 || !ins[(r + 1) * C + c]) loop[hI(R, C, r + 1, c)] = 1;
      if (c === 0 || !ins[r * C + c - 1]) loop[vI(R, C, r, c)] = 1;
      if (c === C - 1 || !ins[r * C + c + 1]) loop[vI(R, C, r, c + 1)] = 1;
    }
    return loop;
  }

  function computeClues(R, C, loop) {
    var clues = [];
    for (var r = 0; r < R; r++) { var row = []; for (var c = 0; c < C; c++) {
      var ce = cellEdges(R, C, r, c), n = 0;
      for (var i = 0; i < 4; i++) if (loop[ce[i]]) n++;
      row.push(n);
    } clues.push(row); }
    return clues;
  }

  /* ---- solver: propagation + backtracking ---- */
  function buildMeta(R, C) {
    var cEdges = [], vEdges = [];
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) cEdges.push(cellEdges(R, C, r, c));
    for (var vr = 0; vr <= R; vr++) for (var vc = 0; vc <= C; vc++) vEdges.push(vertexEdges(R, C, vr, vc));
    return { cEdges: cEdges, vEdges: vEdges };
  }

  function propagate(st, clueFlat, meta, R, C) {
    var changed = true;
    while (changed) {
      changed = false;
      for (var ci = 0; ci < meta.cEdges.length; ci++) {
        var clue = clueFlat[ci];
        if (clue < 0) continue;
        var edges = meta.cEdges[ci], on = 0, unk = 0;
        for (var i = 0; i < 4; i++) { var v = st[edges[i]]; if (v === 1) on++; else if (v < 0) unk++; }
        if (on > clue || on + unk < clue) return false;
        if (unk === 0) continue;
        if (on === clue) { for (var j = 0; j < 4; j++) if (st[edges[j]] < 0) { st[edges[j]] = 0; changed = true; } }
        else if (on + unk === clue) { for (var j2 = 0; j2 < 4; j2++) if (st[edges[j2]] < 0) { st[edges[j2]] = 1; changed = true; } }
      }
      for (var vi = 0; vi < meta.vEdges.length; vi++) {
        var ve = meta.vEdges[vi], on2 = 0, unk2 = 0;
        for (var k = 0; k < ve.length; k++) { var v2 = st[ve[k]]; if (v2 === 1) on2++; else if (v2 < 0) unk2++; }
        if (on2 > 2 || (on2 === 1 && unk2 === 0)) return false;
        if (unk2 === 0) continue;
        if (on2 === 2) { for (var m = 0; m < ve.length; m++) if (st[ve[m]] < 0) { st[ve[m]] = 0; changed = true; } }
        else if (on2 === 1 && unk2 === 1) { for (var m2 = 0; m2 < ve.length; m2++) if (st[ve[m2]] < 0) { st[ve[m2]] = 1; changed = true; } }
        else if (on2 === 0 && unk2 === 1) { for (var m3 = 0; m3 < ve.length; m3++) if (st[ve[m3]] < 0) { st[ve[m3]] = 0; changed = true; } }
      }
    }
    return true;
  }

  function traceLoop(st, R, C) {
    var ne = NE(R, C), nh = NH(R, C);
    var start = -1, onCnt = 0;
    for (var i = 0; i < ne; i++) if (st[i] === 1) { if (start < 0) start = i; onCnt++; }
    if (onCnt === 0) return false;
    /* build vertex adj */
    var W = C + 1, nv = (R + 1) * W;
    var adj = new Array(nv);
    for (var j = 0; j < nv; j++) adj[j] = [];
    for (var e = 0; e < ne; e++) {
      if (st[e] !== 1) continue;
      var vs = edgeVerts(R, C, e);
      var a = vs[0][0] * W + vs[0][1], b = vs[1][0] * W + vs[1][1];
      adj[a].push(b); adj[b].push(a);
    }
    for (var v = 0; v < nv; v++) if (adj[v].length !== 0 && adj[v].length !== 2) return false;
    var sv = edgeVerts(R, C, start);
    var prev = sv[0][0] * W + sv[0][1], cur = sv[1][0] * W + sv[1][1], traced = 1;
    var startV = prev;
    while (cur !== startV) {
      var nbrs = adj[cur];
      var next = nbrs[0] === prev ? nbrs[1] : nbrs[0];
      prev = cur; cur = next; traced++;
      if (traced > onCnt) return false;
    }
    return traced === onCnt;
  }

  function countSolutions(R, C, clueGrid, cap, budget) {
    cap = cap || 2; budget = budget || 400000;
    var ne = NE(R, C);
    var meta = buildMeta(R, C);
    var clueFlat = [];
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      var v = clueGrid[r][c]; clueFlat.push(v == null ? -1 : v);
    }
    var found = 0, ops = 0;
    function rec(s) {
      if (found >= cap) return;
      if (++ops > budget) { found = cap; return; }
      var ns = new Int8Array(s);
      if (!propagate(ns, clueFlat, meta, R, C)) return;
      var pick = -1;
      for (var i = 0; i < ne; i++) if (ns[i] < 0) { pick = i; break; }
      if (pick < 0) { if (traceLoop(ns, R, C)) found++; return; }
      for (var v = 1; v >= 0; v--) {
        var b = new Int8Array(ns); b[pick] = v;
        rec(b);
        if (found >= cap) return;
      }
    }
    var init = new Int8Array(ne).fill(-1);
    rec(init);
    return found;
  }

  /* ---- generate ---- */
  var KEEP = { easy: 0.72, medium: 0.52, hard: 0.40 };

  function generate(opts) {
    var R = opts.rows, C = opts.cols, diff = opts.diff || "medium";
    var maxTries = 40;
    for (var t = 0; t < maxTries; t++) {
      var loop = generateLoop(R, C);
      var onCnt = 0; for (var i = 0; i < loop.length; i++) if (loop[i]) onCnt++;
      if (onCnt < 4) continue;
      if (!traceLoop(loop, R, C)) continue;
      var full = computeClues(R, C, loop);
      if (countSolutions(R, C, full, 2, 300000) !== 1) continue;
      /* strip clues */
      var present = new Uint8Array(R * C).fill(1);
      var order = []; for (var k = 0; k < R * C; k++) order.push(k);
      shuffle(order);
      var target = Math.round(R * C * (KEEP[diff] || 0.52));
      var kept = R * C;
      for (var oi = 0; oi < order.length && kept > target; oi++) {
        var idx = order[oi];
        present[idx] = 0;
        var test = buildGrid(full, present, R, C);
        if (countSolutions(R, C, test, 2, 200000) === 1) kept--;
        else present[idx] = 1;
      }
      return { rows: R, cols: C, clues: buildGrid(full, present, R, C), solution: loop };
    }
    return null;
  }

  function buildGrid(full, present, R, C) {
    return full.map(function (row, r) {
      return row.map(function (v, c) { return present[r * C + c] ? v : null; });
    });
  }

  /* ---- validate player state ---- */
  /* edgeState[i]: 0 = empty, 1 = line, 2 = X */
  function validate(puzzle, edgeState) {
    var R = puzzle.rows, C = puzzle.cols, ne = NE(R, C);
    var clues = puzzle.clues;
    var clueStatus = [];
    for (var r = 0; r < R; r++) { var row = []; for (var c = 0; c < C; c++) {
      var k = clues[r][c];
      if (k == null) { row.push("none"); continue; }
      var ce = cellEdges(R, C, r, c), on = 0, unk = 0;
      for (var i = 0; i < 4; i++) { var v = edgeState[ce[i]]; if (v === 1) on++; else if (v === 0) unk++; }
      if (on > k || on + unk < k) row.push("error");
      else if (on === k) row.push("done");
      else row.push("wip");
    } clueStatus.push(row); }
    var onCnt = 0;
    for (var e = 0; e < ne; e++) if (edgeState[e] === 1) onCnt++;
    var loopOK = onCnt > 0 && traceLoop(edgeState, R, C);
    var allDone = clueStatus.every(function (row) { return row.every(function (s) { return s === "done" || s === "none"; }); });
    return { clueStatus: clueStatus, onEdges: onCnt, solved: loopOK && allDone };
  }

  window.Slitherlink = { generate: generate, validate: validate, NE: NE, NH: NH, cellEdges: cellEdges, vertexEdges: vertexEdges, edgeVerts: edgeVerts, hI: hI, vI: vI };
})();
