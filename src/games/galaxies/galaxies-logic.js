/* ============================================================
   Galaxies — "Spiral Galaxies / Tentai Show" puzzle engine
   Pure logic: symmetric-region generator + uniqueness solver +
   validation.

   Rules
     · divide the whole grid into regions ("galaxies");
     · each region holds exactly one dot (its centre of rotation);
     · each region is symmetric by a 180° turn about its dot;
     · every cell belongs to exactly one region.

   Coordinates
     A dot lives in "doubled" coordinates (cx, cy): a cell (r,c) has
     centre point (2r+1, 2c+1). A dot at (cx,cy) maps cell (r,c) to its
     180° partner (cx-1-r, cy-1-c). Odd cx ⇒ dot sits on a cell row;
     even cx ⇒ dot sits between rows (edge / corner dot).

   Exposed on window.Galaxies.
   ============================================================ */
(function () {
  "use strict";

  const ri = (n) => Math.floor(Math.random() * n);
  const inGrid = (rows, cols, r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const partner = (ctr, r, c) => [ctr.cx - 1 - r, ctr.cy - 1 - c];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // the up-to-4 cells a dot physically sits on (its forced core)
  function coreCells(rows, cols, ctr) {
    const rs = ctr.cx % 2 ? [(ctr.cx - 1) / 2] : [ctr.cx / 2 - 1, ctr.cx / 2];
    const cs = ctr.cy % 2 ? [(ctr.cy - 1) / 2] : [ctr.cy / 2 - 1, ctr.cy / 2];
    const out = [];
    for (const r of rs) for (const c of cs) if (inGrid(rows, cols, r, c)) out.push([r, c]);
    return out;
  }
  // how many cells the core *should* have if fully in-grid
  const coreNeed = (ctr) => (ctr.cx % 2 ? 1 : 2) * (ctr.cy % 2 ? 1 : 2);

  function connected(rows, cols, owner, g, cells) {
    if (!cells.length) return false;
    const seen = new Set([cells[0][0] * cols + cells[0][1]]);
    const st = [cells[0]];
    let cnt = 0;
    while (st.length) {
      const [r, c] = st.pop(); cnt++;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (!inGrid(rows, cols, nr, nc) || owner[nr][nc] !== g) continue;
        const k = nr * cols + nc;
        if (seen.has(k)) continue;
        seen.add(k); st.push([nr, nc]);
      }
    }
    return cnt === cells.length;
  }

  // ============================================================
  //  BUILD ONE RANDOM VALID PARTITION (the seed solution)
  // ============================================================
  function buildPartition(rows, cols) {
    const N = rows * cols;
    const owner = Array.from({ length: rows }, () => new Array(cols).fill(-1));
    const regions = [];   // { ctr, cells:[], target, sat }
    let free = N;

    const isFree = (r, c) => inGrid(rows, cols, r, c) && owner[r][c] === -1;
    const claim = (g, r, c) => { owner[r][c] = g; regions[g].cells.push([r, c]); free--; };

    function seed() {
      const pool = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (owner[r][c] === -1) pool.push([r, c]);
      if (!pool.length) return false;
      const [r, c] = pool[ri(pool.length)];
      const opts = [
        { cx: 2 * r + 1, cy: 2 * c + 1 },                                 // single cell
        { cx: 2 * r + 1, cy: 2 * c + 2 }, { cx: 2 * r + 1, cy: 2 * c },    // h-edge
        { cx: 2 * r + 2, cy: 2 * c + 1 }, { cx: 2 * r, cy: 2 * c + 1 },    // v-edge
        { cx: 2 * r + 2, cy: 2 * c + 2 }, { cx: 2 * r + 2, cy: 2 * c },    // corners
        { cx: 2 * r, cy: 2 * c + 2 }, { cx: 2 * r, cy: 2 * c },
      ];
      const cand = [];
      for (const o of opts) {
        if (o.cx < 1 || o.cx > 2 * rows - 1 || o.cy < 1 || o.cy > 2 * cols - 1) continue;
        const cc = coreCells(rows, cols, o);
        if (cc.length !== coreNeed(o)) continue;
        if (!cc.every(([rr, ccc]) => owner[rr][ccc] === -1)) continue;
        if (regions.some((R) => R.ctr.cx === o.cx && R.ctr.cy === o.cy)) continue;
        cand.push({ o, cc });
      }
      if (!cand.length) return false;
      const pick = cand[ri(cand.length)];
      const g = regions.length;
      regions.push({ ctr: pick.o, cells: [], target: 4 + ri(7), sat: false });
      for (const [rr, ccc] of pick.cc) claim(g, rr, ccc);
      return true;
    }

    function grow(g) {
      const R = regions[g], ctr = R.ctr;
      const seen = new Set(), cands = [];
      for (const [r, c] of R.cells) {
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!isFree(nr, nc)) continue;
          const [pr, pc] = partner(ctr, nr, nc);
          if (!inGrid(rows, cols, pr, pc) || owner[pr][pc] !== -1) continue;
          if (pr === nr && pc === nc) continue;
          const a = nr * cols + nc, b = pr * cols + pc;
          const key = Math.min(a, b) + ":" + Math.max(a, b);
          if (seen.has(key)) continue;
          seen.add(key); cands.push([nr, nc, pr, pc]);
        }
      }
      if (!cands.length) { R.sat = true; return; }
      const [nr, nc, pr, pc] = cands[ri(cands.length)];
      claim(g, nr, nc); claim(g, pr, pc);
      if (R.cells.length >= R.target) R.sat = true;
    }

    if (!seed()) return null;
    let guard = 0;
    while (free > 0 && guard++ < N * 60) {
      const growers = [];
      for (let g = 0; g < regions.length; g++) if (!regions[g].sat) growers.push(g);
      if (!growers.length) { if (!seed()) break; continue; }
      grow(growers[ri(growers.length)]);
    }
    if (free > 0) return null;
    return { owner, centers: regions.map((R) => R.ctr) };
  }

  // ============================================================
  //  COUNT SOLUTIONS (for the given dots) — capped + budgeted
  // ============================================================
  function countSolutions(rows, cols, centers, cap, budget) {
    const owner = Array.from({ length: rows }, () => new Array(cols).fill(-1));
    // forced cores
    for (let g = 0; g < centers.length; g++) {
      for (const [r, c] of coreCells(rows, cols, centers[g])) {
        if (owner[r][c] !== -1) return { count: 0, aborted: false };
        owner[r][c] = g;
      }
    }
    const coreSets = centers.map((ctr) =>
      new Set(coreCells(rows, cols, ctr).map(([r, c]) => r * cols + c)));

    let count = 0, ops = 0, aborted = false;

    function firstFree() {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (owner[r][c] === -1) return [r, c];
      return null;
    }
    // can (sr,sc) reach a core cell of g through free-or-g cells?
    function reaches(g, sr, sc) {
      const want = coreSets[g];
      const seen = new Set([sr * cols + sc]);
      const st = [[sr, sc]];
      while (st.length) {
        const [r, c] = st.pop();
        if (want.has(r * cols + c)) return true;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!inGrid(rows, cols, nr, nc)) continue;
          const k = nr * cols + nc;
          if (seen.has(k)) continue;
          const o = owner[nr][nc];
          if (o === g || o === -1) { seen.add(k); st.push([nr, nc]); }
        }
      }
      return false;
    }
    function allConnected() {
      for (let g = 0; g < centers.length; g++) {
        const cells = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (owner[r][c] === g) cells.push([r, c]);
        if (!connected(rows, cols, owner, g, cells)) return false;
      }
      return true;
    }

    function rec() {
      if (aborted) return;
      if (++ops > budget) { aborted = true; return; }
      const f = firstFree();
      if (!f) { if (allConnected()) { count++; if (count >= cap) aborted = true; } return; }
      const [r, c] = f;
      for (let g = 0; g < centers.length; g++) {
        const [pr, pc] = partner(centers[g], r, c);
        if (!inGrid(rows, cols, pr, pc)) continue;
        if (pr === r && pc === c) continue;
        const op = owner[pr][pc];
        if (!(op === -1 || op === g)) continue;
        if (!reaches(g, r, c)) continue;
        owner[r][c] = g;
        const filledP = op === -1;
        if (filledP) owner[pr][pc] = g;
        rec();
        owner[r][c] = -1;
        if (filledP) owner[pr][pc] = -1;
        if (aborted) return;
      }
    }
    rec();
    return { count, aborted };
  }

  // ============================================================
  //  GENERATOR
  // ============================================================
  function generate(opts) {
    const rows = opts.rows, cols = opts.cols;
    const N = rows * cols;
    const minReg = opts.minReg || Math.max(3, Math.round(N / 9));
    const maxReg = opts.maxReg || Math.round(N / 4.5);
    const tries = opts.tries || 360;
    const budget = opts.budget || (N * 4000 + 80000);
    let best = null;

    for (let t = 0; t < tries; t++) {
      const part = buildPartition(rows, cols);
      if (!part) continue;
      const { owner, centers } = part;
      const nreg = centers.length;
      if (nreg < minReg || nreg > maxReg) continue;

      const sizes = new Array(nreg).fill(0);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) sizes[owner[r][c]]++;
      const ones = sizes.filter((s) => s === 1).length;
      if (ones > Math.ceil(nreg * 0.30)) continue;

      const packed = { rows, cols, centers, solOwner: owner };
      if (!best) best = packed;

      const { count, aborted } = countSolutions(rows, cols, centers, 2, budget);
      if (!aborted && count === 1) return packed;
    }
    // guaranteed fallback — any valid partition, taste filters relaxed
    if (!best) {
      for (let t = 0; t < 200 && !best; t++) {
        const part = buildPartition(rows, cols);
        if (part) best = { rows, cols, centers: part.centers, solOwner: part.owner };
      }
    }
    return best;
  }

  // ============================================================
  //  VALIDATION  (player owner grid; -1 = unassigned)
  // ============================================================
  function validate(puzzle, owner) {
    const { rows, cols, centers } = puzzle;
    const cellsByG = centers.map(() => []);
    let filled = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const g = owner[r][c];
      if (g >= 0) { filled++; cellsByG[g].push([r, c]); }
    }
    const regionStatus = centers.map((ctr, g) => {
      const cells = cellsByG[g];
      if (!cells.length) return "empty";
      // core owned?
      if (!coreCells(rows, cols, ctr).every(([r, c]) => owner[r][c] === g)) return "bad";
      // 180° symmetric?
      for (const [r, c] of cells) {
        const [pr, pc] = partner(ctr, r, c);
        if (!inGrid(rows, cols, pr, pc) || owner[pr][pc] !== g) return "bad";
      }
      // connected?
      if (!connected(rows, cols, owner, g, cells)) return "bad";
      return "ok";
    });
    const solved = filled === rows * cols && regionStatus.every((s) => s === "ok");
    return { filled, total: rows * cols, regionStatus, cellsByG, solved };
  }

  window.Galaxies = { generate, validate, countSolutions, coreCells, partner, inGrid };
})();
