/* ============================================================
   Hashiwokakero (Bridges) — puzzle engine
   Pure logic: generator, uniqueness solver, validation helpers.
   Exposed on window.Hashi
   ============================================================ */
(function () {
  "use strict";

  const DIRS = [
    { dr: -1, dc: 0 }, // N
    { dr: 1, dc: 0 },  // S
    { dr: 0, dc: -1 }, // W
    { dr: 0, dc: 1 },  // E
  ];

  function key(r, c) { return r + "," + c; }
  function edgeKey(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

  // ---- geometry: do two edges cross? ----
  // edge = {a, b} island ids; we need island coords.
  function edgesCross(e1, e2, islands) {
    const a1 = islands[e1.a], b1 = islands[e1.b];
    const a2 = islands[e2.a], b2 = islands[e2.b];
    const e1h = a1.r === b1.r;
    const e2h = a2.r === b2.r;
    if (e1h === e2h) return false; // parallel never cross (collinear blocked by islands)
    const h = e1h ? e1 : e2;
    const v = e1h ? e2 : e1;
    const ha = islands[h.a], hb = islands[h.b];
    const va = islands[v.a], vb = islands[v.b];
    const hr = ha.r;
    const hc1 = Math.min(ha.c, hb.c), hc2 = Math.max(ha.c, hb.c);
    const vc = va.c;
    const vr1 = Math.min(va.r, vb.r), vr2 = Math.max(va.r, vb.r);
    return vc > hc1 && vc < hc2 && hr > vr1 && hr < vr2;
  }

  // ---- compute the set of legal edges (nearest neighbour pairs w/ clear sight) ----
  function computeLegalEdges(islands, rows, cols) {
    const grid = {};
    islands.forEach((isl) => { grid[key(isl.r, isl.c)] = isl.id; });
    const edges = [];
    const seen = {};
    islands.forEach((isl) => {
      DIRS.forEach((d) => {
        let r = isl.r + d.dr, c = isl.c + d.dc;
        while (r >= 0 && r < rows && c >= 0 && c < cols) {
          const id = grid[key(r, c)];
          if (id !== undefined) {
            const k = edgeKey(isl.id, id);
            if (!seen[k]) {
              seen[k] = true;
              edges.push({ a: Math.min(isl.id, id), b: Math.max(isl.id, id) });
            }
            break;
          }
          r += d.dr; c += d.dc;
        }
      });
    });
    return edges;
  }

  // precompute crossing pairs (indices into edges array)
  function computeCrossings(edges, islands) {
    const crosses = edges.map(() => []);
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        if (edgesCross(edges[i], edges[j], islands)) {
          crosses[i].push(j);
          crosses[j].push(i);
        }
      }
    }
    return crosses;
  }

  // ---- connectivity check given counts map ----
  function isConnected(islands, edges, counts) {
    const n = islands.length;
    if (n === 0) return true;
    const adj = islands.map(() => []);
    edges.forEach((e, i) => {
      if ((counts[i] || 0) > 0) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
    });
    const seen = new Array(n).fill(false);
    const stack = [0];
    seen[0] = true; let count = 1;
    while (stack.length) {
      const u = stack.pop();
      adj[u].forEach((v) => { if (!seen[v]) { seen[v] = true; count++; stack.push(v); } });
    }
    return count === n;
  }

  // ============================================================
  // SOLVER — counts solutions up to `cap` (default 2)
  // ============================================================
  function countSolutions(islands, edges, values, crosses, cap) {
    cap = cap || 2;
    const n = islands.length;
    const m = edges.length;
    // incident edges per island
    const incident = islands.map(() => []);
    edges.forEach((e, i) => { incident[e.a].push(i); incident[e.b].push(i); });

    const counts = new Array(m).fill(-1); // -1 unassigned
    const deg = new Array(n).fill(0);     // current degree sum
    const remCap = new Array(n).fill(0);  // capacity of unassigned incident edges
    islands.forEach((isl, i) => { remCap[i] = incident[i].length * 2; });

    let solutions = 0;

    function feasible() {
      for (let i = 0; i < n; i++) {
        if (deg[i] > values[i]) return false;
        if (deg[i] + remCap[i] < values[i]) return false;
      }
      return true;
    }

    function assign(ei, val) {
      counts[ei] = val;
      const e = edges[ei];
      deg[e.a] += val; deg[e.b] += val;
      remCap[e.a] -= 2; remCap[e.b] -= 2;
    }
    function unassign(ei) {
      const val = counts[ei];
      const e = edges[ei];
      deg[e.a] -= val; deg[e.b] -= val;
      remCap[e.a] += 2; remCap[e.b] += 2;
      counts[ei] = -1;
    }

    function recurse(ei) {
      if (solutions >= cap) return;
      if (ei === m) {
        // all assigned & degrees matched (feasibility kept them <=, need ==)
        for (let i = 0; i < n; i++) if (deg[i] !== values[i]) return;
        if (isConnected(islands, edges, counts)) solutions++;
        return;
      }
      // max allowed by crossings: if a crossing edge already >0, this must be 0
      let maxVal = 2;
      const cr = crosses[ei];
      for (let k = 0; k < cr.length; k++) {
        if (counts[cr[k]] > 0) { maxVal = 0; break; }
      }
      for (let v = 0; v <= maxVal; v++) {
        assign(ei, v);
        if (feasible()) recurse(ei + 1);
        unassign(ei);
        if (solutions >= cap) return;
      }
    }

    recurse(0);
    return solutions;
  }

  // ============================================================
  // GENERATOR — growth method, then verify uniqueness
  // ============================================================
  function rng(seed) {
    // mulberry32
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildSkeleton(rows, cols, target, rand) {
    const islands = [];
    const grid = {};            // "r,c" -> id
    const bridgeCell = {};      // "r,c" -> 'H' | 'V'  (intermediate cells)
    const solCounts = {};       // edgeKey -> count

    function addIsland(r, c) {
      const id = islands.length;
      islands.push({ id, r, c });
      grid[key(r, c)] = id;
      return id;
    }

    // start near centre-ish random
    const r0 = 1 + Math.floor(rand() * (rows - 2));
    const c0 = 1 + Math.floor(rand() * (cols - 2));
    addIsland(r0, c0);

    let attempts = 0;
    const maxAttempts = target * 400;
    while (islands.length < target && attempts < maxAttempts) {
      attempts++;
      const src = islands[Math.floor(rand() * islands.length)];
      const d = DIRS[Math.floor(rand() * 4)];
      // walk outward collecting candidate new-island cells & possible existing connect
      const newCells = [];
      let connectId = -1, connectDist = 0;
      let r = src.r + d.dr, c = src.c + d.dc, step = 1;
      const maxStep = 4;
      let blocked = false;
      while (step <= maxStep && r >= 0 && r < rows && c >= 0 && c < cols) {
        const cellHasIsland = grid[key(r, c)] !== undefined;
        const cellHasBridge = bridgeCell[key(r, c)] !== undefined;
        if (cellHasIsland) {
          // could connect to existing if intermediate clear (it is, we walked through empties)
          if (!blocked) { connectId = grid[key(r, c)]; connectDist = step; }
          break;
        }
        if (cellHasBridge) { blocked = true; break; }
        // empty cell — candidate for a new island at this distance (need gap >=2 preferred)
        if (step >= 2) newCells.push({ r, c, step });
        r += d.dr; c += d.dc; step++;
      }

      const wantNew = islands.length < target;
      // Decide action
      if (wantNew && newCells.length && (connectId < 0 || rand() < 0.82)) {
        const pick = newCells[Math.floor(rand() * newCells.length)];
        const nid = addIsland(pick.r, pick.c);
        // mark intermediate cells
        for (let s = 1; s < pick.step; s++) {
          bridgeCell[key(src.r + d.dr * s, src.c + d.dc * s)] = d.dr !== 0 ? "V" : "H";
        }
        const k = edgeKey(src.id, nid);
        solCounts[k] = rand() < 0.45 ? 2 : 1;
      } else if (connectId >= 0 && connectId !== src.id) {
        // add a cycle / extra bridge to existing island
        const k = edgeKey(src.id, connectId);
        const cur = solCounts[k] || 0;
        if (cur < 2) {
          // mark intermediate cells if new edge
          if (cur === 0) {
            for (let s = 1; s < connectDist; s++) {
              const ck = key(src.r + d.dr * s, src.c + d.dc * s);
              if (bridgeCell[ck]) { /* shouldn't happen */ }
              bridgeCell[ck] = d.dr !== 0 ? "V" : "H";
            }
          }
          solCounts[k] = cur + 1;
        }
      }
    }
    return { islands, solCounts };
  }

  function generate(opts) {
    const rows = opts.rows, cols = opts.cols, target = opts.islands;
    const seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
    const maxTries = opts.maxTries || 60;
    let s = seed;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      const rand = rng(s + attempt * 7919);
      const sk = buildSkeleton(rows, cols, target, rand);
      const islands = sk.islands;
      if (islands.length < target) continue;
      // build full legal edge set
      const legal = computeLegalEdges(islands, rows, cols);
      // values from solCounts
      const values = new Array(islands.length).fill(0);
      const idxByKey = {};
      legal.forEach((e, i) => { idxByKey[edgeKey(e.a, e.b)] = i; });
      let ok = true;
      Object.keys(sk.solCounts).forEach((k) => {
        if (idxByKey[k] === undefined) ok = false;
      });
      if (!ok) continue;
      Object.keys(sk.solCounts).forEach((k) => {
        const cnt = sk.solCounts[k];
        const [a, b] = k.split("-").map(Number);
        values[a] += cnt; values[b] += cnt;
      });
      if (values.some((v) => v === 0)) continue; // stray island
      const crosses = computeCrossings(legal, islands);
      // verify uniqueness
      const nSol = countSolutions(islands, legal, values, crosses, 2);
      if (nSol !== 1) continue;
      // normalise coords to bounding box (trim empty borders)
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      islands.forEach((i) => {
        minR = Math.min(minR, i.r); maxR = Math.max(maxR, i.r);
        minC = Math.min(minC, i.c); maxC = Math.max(maxC, i.c);
      });
      const outIslands = islands.map((i) => ({ id: i.id, r: i.r - minR, c: i.c - minC, value: values[i.id] }));
      return {
        seed: s + attempt * 7919,
        rows: maxR - minR + 1,
        cols: maxC - minC + 1,
        islands: outIslands,
        edges: legal.map((e) => ({ a: e.a, b: e.b })),
        solution: legal.map((e) => sk.solCounts[edgeKey(e.a, e.b)] || 0),
      };
    }
    return null;
  }

  // ---- validation of a player's state ----
  // counts: array aligned to edges. returns per-island status + global flags
  function validate(puzzle, counts) {
    const { islands, edges } = puzzle;
    const deg = islands.map(() => 0);
    edges.forEach((e, i) => { const c = counts[i] || 0; deg[e.a] += c; deg[e.b] += c; });
    const islandStatus = islands.map((isl, i) => {
      if (deg[i] > isl.value) return "over";
      if (deg[i] === isl.value) return "done";
      return "under";
    });
    const usedEdges = edges.map((e, i) => (counts[i] || 0) > 0 ? i : -1).filter((x) => x >= 0);
    const connected = usedEdges.length ? isConnected(islands, edges, counts) : false;
    const allMatch = deg.every((d, i) => d === islands[i].value);
    const solved = allMatch && isConnected(islands, edges, counts);
    return { deg, islandStatus, connected, allMatch, solved };
  }

  window.Hashi = {
    generate,
    validate,
    computeCrossings,
    edgesCross,
    isConnected,
    countSolutions,
    computeLegalEdges,
    DIRS,
  };
})();
