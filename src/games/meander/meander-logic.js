/* ============================================================
   meander-logic.js — Hamiltonian path ("Meander") puzzle
   Draw a single path from IN to OUT visiting every cell once.
   Pre-placed fixed edges are clues; deduce and draw the rest.

   Solving / generation uses an allocation-light LOGIC SOLVER:
     • degree propagation (each cell needs an exact number of edges)
     • acyclicity propagation (union-find — a path never closes a loop)
   This is deterministic and runs in ~O(N) per check, so generation
   stays fast even on the 9×9 grid (no exponential backtracking).
   Exposed on window.Meander
   ============================================================ */
(function () {
  "use strict";

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---- edge indexing on the CELL grid ----
     H-edge(r,c): cell(r,c)–cell(r,c+1), idx = r*(C-1)+c
     V-edge(r,c): cell(r,c)–cell(r+1,c), idx = NH + r*C + c
     NH = R*(C-1),  NE = NH + (R-1)*C
  ---------------------------------------------------------------- */
  function NH(R, C) { return R * (C - 1); }
  function NE(R, C) { return NH(R, C) + (R - 1) * C; }

  /* Returns [{ei, nr, nc}] for all valid neighbours of cell (r,c) */
  function nbEdges(R, C, r, c) {
    const nh = NH(R, C), es = [];
    if (c < C - 1) es.push({ ei: r * (C - 1) + c,       nr: r,     nc: c + 1 }); // E
    if (c > 0)     es.push({ ei: r * (C - 1) + (c - 1), nr: r,     nc: c - 1 }); // W
    if (r < R - 1) es.push({ ei: nh + r * C + c,         nr: r + 1, nc: c     }); // S
    if (r > 0)     es.push({ ei: nh + (r - 1) * C + c,   nr: r - 1, nc: c     }); // N
    return es;
  }

  /* Returns [r1,c1,r2,c2] for edge index ei */
  function edgeCoords(R, C, ei) {
    const nh = NH(R, C);
    if (ei < nh) {
      const r = (ei / (C - 1)) | 0, c = ei % (C - 1);
      return [r, c, r, c + 1];
    }
    const idx = ei - nh;
    const r = (idx / C) | 0, c = idx % C;
    return [r, c, r + 1, c];
  }

  /* ---- Hamiltonian path generation ----
     Warnsdorff-guided DFS, but with a strict op-budget: when the greedy
     heuristic strands a cell the search can blow up exponentially, so we
     abort the attempt and restart with fresh randomness instead. Each
     attempt is bounded, so total work is bounded — no freezes. */
  function tryPath(R, C, sr, sc, er, ec, budget) {
    const N = R * C;
    const visited = new Uint8Array(N);
    const pathEdges = [];
    visited[sr * C + sc] = 1;
    let ops = 0;

    function freeCount(r, c) {
      let n = 0;
      for (const { nr, nc } of nbEdges(R, C, r, c))
        if (!visited[nr * C + nc]) n++;
      return n;
    }

    // returns true=done, false=dead end, null=budget exhausted (abort)
    function dfs(r, c, depth) {
      if (++ops > budget) return null;
      if (depth === N - 1) return r === er && c === ec;
      const nbs = nbEdges(R, C, r, c).filter(({ nr, nc }) => {
        if (visited[nr * C + nc]) return false;
        if (nr === er && nc === ec && depth < N - 2) return false;
        return true;
      });
      // Warnsdorff heuristic: prefer cells with fewest onward choices
      const ranked = nbs.map(nb => ({ ei: nb.ei, nr: nb.nr, nc: nb.nc, w: freeCount(nb.nr, nb.nc) + Math.random() * 0.6 }));
      ranked.sort((a, b) => a.w - b.w);
      for (const { ei, nr, nc } of ranked) {
        visited[nr * C + nc] = 1;
        pathEdges.push(ei);
        const res = dfs(nr, nc, depth + 1);
        if (res === true) return true;
        if (res === null) return null; // propagate abort up the stack
        pathEdges.pop();
        visited[nr * C + nc] = 0;
      }
      return false;
    }

    if (dfs(sr, sc, 0) !== true) return null;
    const ne = NE(R, C);
    const edges = new Uint8Array(ne);
    for (const ei of pathEdges) edges[ei] = 1;
    return edges;
  }

  function generatePath(R, C, sr, sc, er, ec) {
    const N = R * C;
    const budget = N * 120;          // bounded per attempt
    for (let t = 0; t < 80; t++) {   // restart with fresh randomness
      const r = tryPath(R, C, sr, sc, er, ec, budget);
      if (r) return r;
    }
    return null;
  }

  /* ---- trace path following active edges (st[ei] > 0) from start ---- */
  function tracePath(st, R, C, sr, sc) {
    const N = R * C;
    const visited = new Uint8Array(N);
    visited[sr * C + sc] = 1;
    const path = [sr * C + sc];
    let r = sr, c = sc;
    for (;;) {
      let moved = false;
      for (const { ei, nr, nc } of nbEdges(R, C, r, c)) {
        if (st[ei] > 0 && !visited[nr * C + nc]) {
          visited[nr * C + nc] = 1;
          path.push(nr * C + nc);
          r = nr; c = nc; moved = true; break;
        }
      }
      if (!moved) break;
    }
    return path.length === N ? path : null;
  }

  /* ---- check if state represents a valid Hamiltonian path ---- */
  function isHamilton(st, R, C, sr, sc, er, ec) {
    const N = R * C;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const isEnd = (r === sr && c === sc) || (r === er && c === ec);
      const target = isEnd ? 1 : 2;
      let deg = 0;
      for (const { ei } of nbEdges(R, C, r, c)) if (st[ei] > 0) deg++;
      if (deg !== target) return false;
    }
    const path = tracePath(st, R, C, sr, sc);
    return path !== null && path[path.length - 1] === er * C + ec;
  }

  /* ============================================================
     FAST LOGIC SOLVER
     A reusable grid "model" stores, in flat typed arrays:
       eA[ei], eB[ei]      — the two cell ids of each edge
       off[]/cedges[]      — CSR adjacency: edges touching each cell
       target[cell]        — required degree (1 for IN/OUT, else 2)
     Built once per grid size and cached.
     ============================================================ */
  const modelCache = {};
  function getModel(R, C, sr, sc, er, ec) {
    const key = R + "x" + C + ":" + sr + "," + sc + ":" + er + "," + ec;
    if (modelCache[key]) return modelCache[key];

    const ne = NE(R, C), nc = R * C, nh = NH(R, C);
    const eA = new Int32Array(ne), eB = new Int32Array(ne);
    for (let ei = 0; ei < ne; ei++) {
      if (ei < nh) { const r = (ei / (C - 1)) | 0, c = ei % (C - 1); eA[ei] = r * C + c; eB[ei] = r * C + c + 1; }
      else { const idx = ei - nh, r = (idx / C) | 0, c = idx % C; eA[ei] = r * C + c; eB[ei] = (r + 1) * C + c; }
    }
    const cnt = new Int32Array(nc);
    for (let ei = 0; ei < ne; ei++) { cnt[eA[ei]]++; cnt[eB[ei]]++; }
    const off = new Int32Array(nc + 1);
    for (let i = 0; i < nc; i++) off[i + 1] = off[i] + cnt[i];
    const cedges = new Int32Array(off[nc]);
    const cur = off.slice(0, nc);
    for (let ei = 0; ei < ne; ei++) { cedges[cur[eA[ei]]++] = ei; cedges[cur[eB[ei]]++] = ei; }
    const target = new Int8Array(nc).fill(2);
    target[sr * C + sc] = 1; target[er * C + ec] = 1;

    const model = { ne, nc, eA, eB, off, cedges, target,
      // scratch buffers reused across solves (no per-call allocation)
      st: new Int8Array(ne),
      parent: new Int32Array(nc),
      rank: new Uint8Array(nc),
      queue: new Int32Array(nc + 1),
      inQ: new Uint8Array(nc),
    };
    modelCache[key] = model;
    return model;
  }

  /* Solve purely by logic. Returns the completed Int8Array (0/1) if the
     clues force a unique Hamiltonian path by deduction alone, else null. */
  function solveByLogic(model, fixed) {
    const { ne, nc, eA, eB, off, cedges, target, st, parent, rank, queue, inQ } = model;
    const NEEDED = nc - 1;

    for (let i = 0; i < ne; i++) st[i] = fixed[i] ? 1 : -1;
    for (let i = 0; i < nc; i++) { parent[i] = i; rank[i] = 0; inQ[i] = 0; }

    let onCount = 0;
    const CAP = nc + 1;
    let qh = 0, qt = 0, qn = 0;

    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) { // false ⇒ already joined (would close a loop)
      const ra = find(a), rb = find(b);
      if (ra === rb) return false;
      if (rank[ra] < rank[rb]) parent[ra] = rb;
      else if (rank[ra] > rank[rb]) parent[rb] = ra;
      else { parent[rb] = ra; rank[ra]++; }
      return true;
    }
    function push(cell) { if (!inQ[cell]) { inQ[cell] = 1; queue[qt] = cell; qt = (qt + 1) % CAP; qn++; } }
    function setOn(ei) {
      if (st[ei] === 1) return true;
      if (st[ei] === 0) return false;
      st[ei] = 1; onCount++;
      if (!union(eA[ei], eB[ei])) return false; // premature loop
      push(eA[ei]); push(eB[ei]);
      return true;
    }
    function setOff(ei) {
      if (st[ei] === 0) return true;
      if (st[ei] === 1) return false;
      st[ei] = 0; push(eA[ei]); push(eB[ei]);
      return true;
    }

    // seed union-find with pre-set ON edges; queue every cell
    for (let ei = 0; ei < ne; ei++) if (st[ei] === 1) { onCount++; if (!union(eA[ei], eB[ei])) return null; }
    for (let cell = 0; cell < nc; cell++) push(cell);

    function drainDegree() {
      while (qn > 0) {
        const cell = queue[qh]; qh = (qh + 1) % CAP; qn--; inQ[cell] = 0;
        const s = off[cell], e = off[cell + 1];
        let on = 0, unk = 0;
        for (let k = s; k < e; k++) { const v = st[cedges[k]]; if (v === 1) on++; else if (v === -1) unk++; }
        const T = target[cell];
        if (on > T || on + unk < T) return false;
        if (on === T && unk > 0) {
          for (let k = s; k < e; k++) { const ei = cedges[k]; if (st[ei] === -1 && !setOff(ei)) return false; }
        } else if (on + unk === T && unk > 0) {
          for (let k = s; k < e; k++) { const ei = cedges[k]; if (st[ei] === -1 && !setOn(ei)) return false; }
        }
      }
      return true;
    }

    if (!drainDegree()) return null;

    // acyclicity sweep: an unknown edge whose ends are already connected
    // would close a loop — it must be OFF. Re-run degree after any change.
    let changed = true;
    while (changed) {
      changed = false;
      for (let ei = 0; ei < ne; ei++) {
        if (st[ei] === -1 && find(eA[ei]) === find(eB[ei])) {
          if (!setOff(ei)) return null;
          changed = true;
        }
      }
      if (changed && !drainDegree()) return null;
    }

    for (let i = 0; i < ne; i++) if (st[i] === -1) return null; // not forced by logic
    if (onCount !== NEEDED) return null;
    return st; // acyclic + correct degrees + N-1 edges ⇒ single Hamiltonian path
  }

  /* ---- puzzle generator ---- */
  function generate(opts) {
    const R = opts.rows, C = opts.cols, diff = opts.diff || 'medium';
    // Odd-size grids: (0,0) and (R-1,C-1) share parity → a Hamiltonian path
    // between them exists since R*C is odd.
    const sr = 0, sc = 0, er = R - 1, ec = C - 1;
    const model = getModel(R, C, sr, sc, er, ec);
    const ne = model.ne;
    const keepRatio = { easy: 0.55, medium: 0.38, hard: 0.24 }[diff] || 0.38;

    for (let attempt = 0; attempt < 30; attempt++) {
      const solution = generatePath(R, C, sr, sc, er, ec);
      if (!solution) continue;

      const onEdges = [];
      for (let i = 0; i < ne; i++) if (solution[i]) onEdges.push(i);
      if (onEdges.length < 4) continue;

      shuffle(onEdges);
      const fixed = new Uint8Array(ne);
      for (const ei of onEdges) fixed[ei] = 1;

      const floor = Math.max(2, Math.round(onEdges.length * keepRatio));
      let kept = onEdges.length;

      // Remove a clue only while the puzzle stays solvable by pure logic.
      // Logic-solvability ⇒ the remaining clues force the unique solution.
      for (const ei of onEdges) {
        if (kept <= floor) break;
        fixed[ei] = 0;
        if (solveByLogic(model, fixed)) kept--;
        else fixed[ei] = 1;
      }

      return { rows: R, cols: C, startR: sr, startC: sc, endR: er, endC: ec, fixed, solution };
    }
    return null;
  }

  /* ---- validate player state ---- */
  function validate(puzzle, edgeState) {
    const { rows: R, cols: C, startR: sr, startC: sc, endR: er, endC: ec } = puzzle;
    const ne = NE(R, C);

    const combined = new Uint8Array(ne);
    for (let i = 0; i < ne; i++)
      if (edgeState[i] === 1 || puzzle.fixed[i]) combined[i] = 1;

    let onCount = 0;
    for (let i = 0; i < ne; i++) if (combined[i]) onCount++;

    const cellStatus = Array.from({ length: R }, () => new Array(C).fill('empty'));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const isEnd = (r === sr && c === sc) || (r === er && c === ec);
      const target = isEnd ? 1 : 2;
      let deg = 0;
      for (const { ei } of nbEdges(R, C, r, c)) if (combined[ei]) deg++;
      if      (deg === 0)      cellStatus[r][c] = 'empty';
      else if (deg === target) cellStatus[r][c] = 'ok';
      else if (deg > target)   cellStatus[r][c] = 'over';
      else                     cellStatus[r][c] = 'partial';
    }

    const solved = isHamilton(combined, R, C, sr, sc, er, ec);
    return { cellStatus, onEdges: onCount, solved };
  }

  window.Meander = { generate, validate, NH, NE, nbEdges, edgeCoords };
})();
