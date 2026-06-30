/* ============================================================
   scurry-logic.js — the "place & repel" engine + puzzle generator
   Exposes window.Scurry

   Model
   -----
   • The board is a rows×cols grid. Some cells are TARGETS (the
     yellow squares). The aim: end with one bug on every target
     and NO bug anywhere else (exact cover).
   • A "bug" is { id, r, c }. The live board is an array of bugs.
   • Placing a bug on an empty cell P pushes each of the 8 bugs
     immediately around P one step radially outward. A push is a
     chain: a contiguous run of bugs along a ray slides together,
     but only if the cell just past the run is on the board —
     otherwise that whole run stays put (the edge is a wall).
   • Bugs are never removed and never leave the board, so after K
     placements there are always exactly K bugs.

   Generation
   ----------
   Puzzles are built by *playing forward*: from an empty board we
   place K bugs (biased toward the centre so the swarm stays
   compact), recording the click sequence. Wherever the bugs end
   up becomes the target set — so the recorded sequence is, by
   construction, a guaranteed solution. We keep the most compact,
   connected result out of many rollouts.
   ============================================================ */
(function () {
  const DIRS8 = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
  ];

  function inB(r, c, rows, cols) {
    return r >= 0 && c >= 0 && r < rows && c < cols;
  }

  /* Apply one placement. `bugs` is an array of {id,r,c}; returns a
     fresh array with a new bug (id = newId) added at cellIdx and
     all repulsion resolved. cellIdx MUST be empty (caller checks). */
  function step(bugs, cellIdx, rows, cols, newId) {
    const next = bugs.map(b => ({ id: b.id, r: b.r, c: b.c }));
    const occ = new Map();
    for (const b of next) occ.set(b.r * cols + b.c, b);

    const r0 = (cellIdx / cols) | 0;
    const c0 = cellIdx % cols;
    const nb = { id: newId, r: r0, c: c0 };
    next.push(nb);
    occ.set(cellIdx, nb);

    /* Detect each ray's contiguous run first (rays from a point are
       mutually disjoint, so detection is order-independent). */
    const shifts = [];
    for (const [dr, dc] of DIRS8) {
      let rr = r0 + dr, cc = c0 + dc;
      const run = [];
      while (inB(rr, cc, rows, cols) && occ.has(rr * cols + cc)) {
        run.push(occ.get(rr * cols + cc));
        rr += dr; cc += dc;
      }
      if (!run.length) continue;
      /* (rr,cc) is now the cell just past the run. If it's on the
         board it is empty (run was maximal) → the run slides. If
         it's off the board, a wall blocks the whole run. */
      if (inB(rr, cc, rows, cols)) shifts.push({ run, dr, dc });
    }

    for (const { run, dr, dc } of shifts) {
      for (const b of run) occ.delete(b.r * cols + b.c);
      for (const b of run) { b.r += dr; b.c += dc; }
      for (const b of run) occ.set(b.r * cols + b.c, b);
    }
    return next;
  }

  /* ---- generation helpers ---- */

  function kingComponents(cells, cols) {
    const set = new Set(cells);
    const seen = new Set();
    let comps = 0;
    for (const start of cells) {
      if (seen.has(start)) continue;
      comps++;
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const cur = stack.pop();
        const r = (cur / cols) | 0, c = cur % cols;
        for (const [dr, dc] of DIRS8) {
          const nr = r + dr, nc = c + dc, ni = nr * cols + nc;
          if (set.has(ni) && !seen.has(ni)) { seen.add(ni); stack.push(ni); }
        }
      }
    }
    return comps;
  }

  function bboxArea(cells, cols) {
    let minR = 1e9, maxR = -1e9, minC = 1e9, maxC = -1e9;
    for (const i of cells) {
      const r = (i / cols) | 0, c = i % cols;
      if (r < minR) minR = r; if (r > maxR) maxR = r;
      if (c < minC) minC = c; if (c > maxC) maxC = c;
    }
    return (maxR - minR + 1) * (maxC - minC + 1);
  }

  /* "fill" = how tightly the target cells pack their bounding box (0..1). */
  function fillRatio(cells, cols) {
    return cells.length / bboxArea(cells, cols);
  }

  function weightedPick(items, weights, rng) {
    let tot = 0;
    for (const w of weights) tot += w;
    let x = rng() * tot;
    for (let i = 0; i < items.length; i++) {
      x -= weights[i];
      if (x <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* One forward rollout that packs the swarm toward `pull` (a corner,
     edge-midpoint or centre). Returns { yellow:[idx], solution:[idx] }. */
  function rollout(rows, cols, K, rng, pull) {
    let bugs = [];
    const seq = [];
    let id = 1;
    const [py, px] = pull;
    const scale = Math.max(rows, cols) * 0.45;

    for (let k = 0; k < K; k++) {
      const occ = new Set(bugs.map(b => b.r * cols + b.c));
      const empties = [];
      const weights = [];
      for (let i = 0; i < rows * cols; i++) {
        if (occ.has(i)) continue;
        const r = (i / cols) | 0, c = i % cols;
        /* favour cells FAR from the pull point, so each placement shoves
           the swarm toward it (and into the wall there, where it packs) */
        let w = Math.exp(Math.hypot(r - py, c - px) / scale);
        /* and prefer sitting next to an existing bug, so placements
           actually interact rather than scatter loose singletons */
        for (const [dr, dc] of DIRS8) {
          if (inB(r + dr, c + dc, rows, cols) &&
              occ.has((r + dr) * cols + (c + dc))) { w *= 3; break; }
        }
        empties.push(i);
        weights.push(w);
      }
      if (!empties.length) return null;
      const cell = weightedPick(empties, weights, rng);
      seq.push(cell);
      bugs = step(bugs, cell, rows, cols, id++);
    }

    const yellow = bugs.map(b => b.r * cols + b.c).sort((a, b) => a - b);
    return { yellow, solution: seq };
  }

  function generate(cfg) {
    const { rows, cols, k } = cfg;
    const seed = (cfg.seed != null) ? cfg.seed : (Math.random() * 1e9) | 0;
    const rng = mulberry32(seed);
    const tries = cfg.tries || 2400;
    const thr = rows <= 5 ? 0.55 : rows <= 6 ? 0.5 : 0.45;

    /* Cycle through every packing direction so each puzzle reliably
       explores all of them — corners, edge-midpoints and centre. */
    const pulls = [
      [0, 0], [0, cols - 1], [rows - 1, 0], [rows - 1, cols - 1],
      [0, (cols - 1) / 2], [rows - 1, (cols - 1) / 2],
      [(rows - 1) / 2, 0], [(rows - 1) / 2, cols - 1],
      [(rows - 1) / 2, (cols - 1) / 2],
    ];

    const good = [];
    let fallback = null, fbFill = 0;
    for (let t = 0; t < tries; t++) {
      const res = rollout(rows, cols, k, rng, pulls[t % pulls.length]);
      if (!res) continue;
      if (kingComponents(res.yellow, cols) > 1) continue;  /* must be one blob */
      const fill = fillRatio(res.yellow, cols);
      if (fill > fbFill) { fbFill = fill; fallback = res; }
      if (fill >= thr) good.push(res);
    }

    const chosen = good.length ? good[(rng() * good.length) | 0] : fallback;
    if (!chosen) return null;
    return { rows, cols, k, yellow: chosen.yellow, solution: chosen.solution, seed };
  }

  window.Scurry = {
    DIRS8,
    inB,
    step,
    generate,
    fillRatio,
    kingComponents,
  };
})();
