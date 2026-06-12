/* ============================================================
   Masyu — puzzle engine
   Draw a single loop through white and black pearls on a grid.
   White: straight through, turn immediately before or after.
   Black: turn on it, go straight at least one cell in each arm.
   Exposed on window.Masyu
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

  const D4 = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // E W S N

  /* ---- edge indexing on the CELL grid ----
     H-edge (r,c): connects cell (r,c)–(r,c+1)
       r ∈ [0,R), c ∈ [0,C-1)   index = r*(C-1) + c
     V-edge (r,c): connects cell (r,c)–(r+1,c)
       r ∈ [0,R-1), c ∈ [0,C)   index = NH + r*C + c
     NH = R*(C-1), total = NH + (R-1)*C
  ----------------------------------------------------------------- */
  function MNH(R, C) { return R * (C - 1); }
  function MNE(R, C) { return MNH(R, C) + (R - 1) * C; }

  function cellEdges(R, C, r, c) {
    const nh = MNH(R, C), e = [];
    if (c < C - 1) e.push(r * (C - 1) + c);              // East
    if (c > 0)     e.push(r * (C - 1) + c - 1);           // West
    if (r < R - 1) e.push(nh + r * C + c);                // South
    if (r > 0)     e.push(nh + (r - 1) * C + c);          // North
    return e;
  }

  /* direction-specific edge for cell (r,c); returns -1 if out of bounds */
  function dirEdge(R, C, r, c, dir) {
    const nh = MNH(R, C);
    if (dir === 0) return c < C - 1 ? r * (C - 1) + c : -1;           // E
    if (dir === 1) return c > 0 ? r * (C - 1) + c - 1 : -1;           // W
    if (dir === 2) return r < R - 1 ? nh + r * C + c : -1;            // S
    if (dir === 3) return r > 0 ? nh + (r - 1) * C + c : -1;          // N
    return -1;
  }
  function stepCell(r, c, dir) {
    return [r + D4[dir][0], c + D4[dir][1]];
  }
  function oppDir(d) { return d ^ 1; } // 0↔1, 2↔3
  function isPerp(a, b) { return (a >> 1) !== (b >> 1); }

  /* ---- loop generation via inside region on the face grid ----
     Face grid: (R-1) × (C-1) squares between 4 cell centers.
     Face (f,g) bordered by: H(f,g), H(f+1,g), V(f,g), V(f,g+1).
     Boundary edges → loop on cell grid.
  --------------------------------------------------------------- */
  function outsideOK(ins, FR, FC) {
    const RR = FR + 2, CC = FC + 2;
    const vis = new Uint8Array(RR * CC);
    const q = [0]; vis[0] = 1; let cnt = 1, head = 0;
    while (head < q.length) {
      const k = q[head++], kr = (k / CC) | 0, kc = k % CC;
      for (let d = 0; d < 4; d++) {
        const nr = kr + D4[d][0], nc = kc + D4[d][1];
        if (nr < 0 || nr >= RR || nc < 0 || nc >= CC) continue;
        const nk = nr * CC + nc;
        if (vis[nk]) continue;
        const gr = nr - 1, gc = nc - 1;
        if (gr >= 0 && gr < FR && gc >= 0 && gc < FC && ins[gr * FC + gc]) continue;
        vis[nk] = 1; cnt++; q.push(nk);
      }
    }
    let total = RR * CC;
    for (let i = 0; i < FR * FC; i++) if (ins[i]) total--;
    return cnt === total;
  }

  function generateLoop(R, C) {
    const FR = R - 1, FC = C - 1, FN = FR * FC;
    if (FN < 1) return null;
    const ins = new Uint8Array(FN);
    const target = Math.max(1, (FN * (0.30 + Math.random() * 0.22)) | 0);
    const f0 = (FR / 2) | 0, g0 = (FC / 2) | 0;
    ins[f0 * FC + g0] = 1; let size = 1;
    const fset = new Set();
    function addF(f, g) {
      if (f >= 0 && f < FR && g >= 0 && g < FC && !ins[f * FC + g]) fset.add(f * FC + g);
    }
    for (let d = 0; d < 4; d++) addF(f0 + D4[d][0], g0 + D4[d][1]);
    while (size < target && fset.size > 0) {
      const keys = Array.from(fset);
      const pick = keys[Math.random() * keys.length | 0];
      fset.delete(pick);
      if (ins[pick]) continue;
      ins[pick] = 1;
      if (!outsideOK(ins, FR, FC)) { ins[pick] = 0; continue; }
      size++;
      const pr = (pick / FC) | 0, pc = pick % FC;
      for (let d2 = 0; d2 < 4; d2++) addF(pr + D4[d2][0], pc + D4[d2][1]);
    }
    return facesToLoop(ins, R, C);
  }

  function facesToLoop(ins, R, C) {
    const FR = R - 1, FC = C - 1;
    const ne = MNE(R, C), nh = MNH(R, C);
    const loop = new Uint8Array(ne);
    /* H-edge (r,c) borders face (r-1,c) above and face (r,c) below */
    for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
      const above = (r > 0 && ins[(r - 1) * FC + c]) ? 1 : 0;
      const below = (r < R - 1 && ins[r * FC + c]) ? 1 : 0;
      if (above !== below) loop[r * (C - 1) + c] = 1;
    }
    /* V-edge (r,c) borders face (r,c-1) left and face (r,c) right */
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) {
      const left = (c > 0 && ins[r * FC + c - 1]) ? 1 : 0;
      const right = (c < C - 1 && ins[r * FC + c]) ? 1 : 0;
      if (left !== right) loop[nh + r * C + c] = 1;
    }
    return loop;
  }

  /* ---- classify loop cells & find pearls ---- */
  function classifyLoop(R, C, loop) {
    /* For each cell, determine its two edge-directions on the loop.
       Returns dirs[r][c] = sorted pair [d1,d2] or null if not on loop. */
    const nh = MNH(R, C);
    const dirs = Array.from({ length: R }, () => new Array(C).fill(null));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const d = [];
      for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, r, c, di); if (e >= 0 && loop[e]) d.push(di); }
      if (d.length === 2) dirs[r][c] = d;
    }
    return dirs;
  }

  function findPearls(R, C, loop, dirs) {
    /* Returns pearls[r][c]: 0 = none, 1 = white, 2 = black */
    const pearls = Array.from({ length: R }, () => new Array(C).fill(0));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const d = dirs[r][c];
      if (!d) continue;
      const isTurn = isPerp(d[0], d[1]);
      if (isTurn) {
        /* Black candidate: both arms extend straight ≥1 cell */
        let ok = true;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, d[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) { ok = false; break; }
          const nd = dirs[nr][nc];
          if (!nd) { ok = false; break; }
          /* The extension cell must have an edge continuing in the same direction */
          if (nd[0] !== d[k] && nd[1] !== d[k]) { ok = false; break; }
        }
        if (ok) pearls[r][c] = 2;
      } else {
        /* White candidate: at least one neighbour in travel dir is a turn */
        let hasTurn = false;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, d[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
          const nd = dirs[nr][nc];
          if (nd && isPerp(nd[0], nd[1])) hasTurn = true;
        }
        if (hasTurn) pearls[r][c] = 1;
      }
    }
    return pearls;
  }

  /* ---- solver ---- */
  function traceLoop(st, R, C) {
    const ne = MNE(R, C), nh = MNH(R, C);
    let start = -1, onCnt = 0;
    for (let i = 0; i < ne; i++) if (st[i] === 1) { if (start < 0) start = i; onCnt++; }
    if (onCnt === 0) return false;
    /* build cell adjacency from on-edges */
    const adj = new Array(R * C);
    for (let i = 0; i < R * C; i++) adj[i] = [];
    for (let e = 0; e < ne; e++) {
      if (st[e] !== 1) continue;
      let r1, c1, r2, c2;
      if (e < nh) { r1 = (e / (C - 1)) | 0; c1 = e % (C - 1); r2 = r1; c2 = c1 + 1; }
      else { const idx = e - nh; r1 = (idx / C) | 0; c1 = idx % C; r2 = r1 + 1; c2 = c1; }
      adj[r1 * C + c1].push(r2 * C + c2);
      adj[r2 * C + c2].push(r1 * C + c1);
    }
    /* check degrees */
    for (let i = 0; i < R * C; i++) if (adj[i].length !== 0 && adj[i].length !== 2) return false;
    /* trace */
    let startE;
    if (start < nh) { const r = (start / (C - 1)) | 0; startE = r * C + (start % (C - 1)); }
    else { const idx = start - nh; startE = ((idx / C) | 0) * C + idx % C; }
    let sv = startE, prev = sv;
    const nbrs = adj[sv];
    if (nbrs.length !== 2) return false;
    let cur = nbrs[0], traced = 1;
    while (cur !== sv) {
      const n = adj[cur];
      const next = n[0] === prev ? n[1] : n[0];
      prev = cur; cur = next; traced++;
      if (traced > onCnt) return false;
    }
    return traced === onCnt;
  }

  function propagate(st, pearls, R, C) {
    const ne = MNE(R, C);
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const isPearl = pearls[r][c];
        const allE = [];
        for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, r, c, di); if (e >= 0) allE.push({ e: e, d: di }); else allE.push(null); }
        let on = 0, off = 0, unk = 0;
        for (let i = 0; i < 4; i++) { if (!allE[i]) { off++; continue; } const v = st[allE[i].e]; if (v === 1) on++; else if (v === 0) off++; else unk++; }
        if (on > 2) return false;
        if (on === 1 && unk === 0) return false;
        /* generic vertex: 0 or 2 */
        if (on === 2) { for (let i = 0; i < 4; i++) if (allE[i] && st[allE[i].e] < 0) { st[allE[i].e] = 0; changed = true; } }
        else if (on === 1 && unk === 1) { for (let i = 0; i < 4; i++) if (allE[i] && st[allE[i].e] < 0) { st[allE[i].e] = 1; changed = true; } }
        else if (on === 0 && unk === 1 && !isPearl) { for (let i = 0; i < 4; i++) if (allE[i] && st[allE[i].e] < 0) { st[allE[i].e] = 0; changed = true; } }
        /* pearl must be on loop */
        if (isPearl && on === 0 && unk === 0) return false;
        if (isPearl && on + unk < 2) return false;

        if (isPearl === 2 && on >= 1) {
          /* Black pearl: the on-edges must be perpendicular; force parallel off */
          const onDirs = [];
          for (let i = 0; i < 4; i++) if (allE[i] && st[allE[i].e] === 1) onDirs.push(i);
          if (onDirs.length === 1) {
            const d0 = onDirs[0], opp = oppDir(d0);
            if (allE[opp] && st[allE[opp].e] < 0) { st[allE[opp].e] = 0; changed = true; }
            else if (allE[opp] && st[allE[opp].e] === 1) return false;
          }
          if (onDirs.length === 2 && !isPerp(onDirs[0], onDirs[1])) return false;
        }
        if (isPearl === 1 && on >= 1) {
          /* White pearl: the on-edges must be parallel; force opposite on, perps off */
          const onDirs = [];
          for (let i = 0; i < 4; i++) if (allE[i] && st[allE[i].e] === 1) onDirs.push(i);
          if (onDirs.length === 1) {
            const d0 = onDirs[0], opp = oppDir(d0);
            if (allE[opp]) { if (st[allE[opp].e] < 0) { st[allE[opp].e] = 1; changed = true; } }
            else return false;
            /* perpendiculars off */
            for (let i = 0; i < 4; i++) if (allE[i] && isPerp(i, d0) && st[allE[i].e] < 0) { st[allE[i].e] = 0; changed = true; }
          }
          if (onDirs.length === 2 && !isPerp(onDirs[0], onDirs[1]) === false) {
            /* they must be parallel */
            if (isPerp(onDirs[0], onDirs[1])) return false;
          }
        }
      }
    }
    return true;
  }

  function countSolutions(R, C, pearlGrid, cap, budget) {
    cap = cap || 2; budget = budget || 300000;
    const ne = MNE(R, C);
    let found = 0, ops = 0;
    function rec(s) {
      if (found >= cap) return;
      if (++ops > budget) { found = cap; return; }
      const ns = new Int8Array(s);
      if (!propagate(ns, pearlGrid, R, C)) return;
      let pick = -1;
      for (let i = 0; i < ne; i++) if (ns[i] < 0) { pick = i; break; }
      if (pick < 0) {
        if (traceLoop(ns, R, C) && pearlsSatisfied(ns, pearlGrid, R, C)) found++;
        return;
      }
      for (let v = 1; v >= 0; v--) {
        const b = new Int8Array(ns); b[pick] = v; rec(b);
        if (found >= cap) return;
      }
    }
    const init = new Int8Array(ne).fill(-1);
    rec(init);
    return found;
  }

  function pearlsSatisfied(st, pearls, R, C) {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const p = pearls[r][c];
      if (!p) continue;
      const onDirs = [];
      for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, r, c, di); if (e >= 0 && st[e] === 1) onDirs.push(di); }
      if (onDirs.length !== 2) return false;
      const turn = isPerp(onDirs[0], onDirs[1]);
      if (p === 2) {
        if (!turn) return false;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, onDirs[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) return false;
          const e2 = dirEdge(R, C, nr, nc, onDirs[k]);
          if (e2 < 0 || st[e2] !== 1) return false;
        }
      } else {
        if (turn) return false;
        let hasTurn = false;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, onDirs[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
          const nd = [];
          for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, nr, nc, di); if (e >= 0 && st[e] === 1) nd.push(di); }
          if (nd.length === 2 && isPerp(nd[0], nd[1])) hasTurn = true;
        }
        if (!hasTurn) return false;
      }
    }
    return true;
  }

  /* ---- generate ---- */
  function generate(opts) {
    const R = opts.rows, C = opts.cols, diff = opts.diff || "medium";
    const maxTries = 60;
    for (let t = 0; t < maxTries; t++) {
      const loop = generateLoop(R, C);
      if (!loop) continue;
      let onCnt = 0; for (let i = 0; i < loop.length; i++) if (loop[i]) onCnt++;
      if (onCnt < 4) continue;
      if (!traceLoop(loop, R, C)) continue;
      const dirs = classifyLoop(R, C, loop);
      const allPearls = findPearls(R, C, loop, dirs);
      /* count total pearls */
      let pCount = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (allPearls[r][c]) pCount++;
      if (pCount < 3) continue;
      /* verify unique with all pearls */
      if (countSolutions(R, C, allPearls, 2, 250000) !== 1) continue;
      /* strip pearls */
      const order = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (allPearls[r][c]) order.push([r, c]);
      shuffle(order);
      const keep = { easy: 0.85, medium: 0.65, hard: 0.50 };
      const target = Math.max(3, Math.round(pCount * (keep[diff] || 0.65)));
      let kept = pCount;
      const pearlGrid = allPearls.map(function (row) { return row.slice(); });
      for (let i = 0; i < order.length && kept > target; i++) {
        const [pr, pc] = order[i];
        const save = pearlGrid[pr][pc];
        pearlGrid[pr][pc] = 0;
        if (countSolutions(R, C, pearlGrid, 2, 200000) === 1) kept--;
        else pearlGrid[pr][pc] = save;
      }
      return { rows: R, cols: C, pearls: pearlGrid, solution: loop };
    }
    return null;
  }

  /* ---- validate player state ---- */
  function validate(puzzle, edgeState) {
    const R = puzzle.rows, C = puzzle.cols, ne = MNE(R, C);
    const pearls = puzzle.pearls;
    let onCnt = 0;
    for (let i = 0; i < ne; i++) if (edgeState[i] === 1) onCnt++;
    const loopOK = onCnt > 0 && traceLoop(edgeState, R, C);
    /* pearl status */
    const pStatus = Array.from({ length: R }, () => new Array(C).fill("none"));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const p = pearls[r][c];
      if (!p) continue;
      const onDirs = [];
      for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, r, c, di); if (e >= 0 && edgeState[e] === 1) onDirs.push(di); }
      if (onDirs.length === 0) { pStatus[r][c] = "empty"; continue; }
      if (onDirs.length !== 2) { pStatus[r][c] = "error"; continue; }
      const turn = isPerp(onDirs[0], onDirs[1]);
      if (p === 2) {
        if (!turn) { pStatus[r][c] = "error"; continue; }
        let armOK = true;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, onDirs[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) { armOK = false; break; }
          const e2 = dirEdge(R, C, nr, nc, onDirs[k]);
          if (e2 < 0 || edgeState[e2] !== 1) { armOK = false; break; }
        }
        pStatus[r][c] = armOK ? "done" : "error";
      } else {
        if (turn) { pStatus[r][c] = "error"; continue; }
        let hasTurn = false;
        for (let k = 0; k < 2; k++) {
          const [nr, nc] = stepCell(r, c, onDirs[k]);
          if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;
          const nd = [];
          for (let di = 0; di < 4; di++) { const e = dirEdge(R, C, nr, nc, di); if (e >= 0 && edgeState[e] === 1) nd.push(di); }
          if (nd.length === 2 && isPerp(nd[0], nd[1])) hasTurn = true;
        }
        pStatus[r][c] = hasTurn ? "done" : "error";
      }
    }
    const allDone = pStatus.every(function (row) { return row.every(function (s) { return s === "done" || s === "none"; }); });
    return { pearlStatus: pStatus, onEdges: onCnt, solved: loopOK && allDone };
  }

  window.Masyu = { generate: generate, validate: validate, MNE: MNE, MNH: MNH, cellEdges: cellEdges, dirEdge: dirEdge };
})();
