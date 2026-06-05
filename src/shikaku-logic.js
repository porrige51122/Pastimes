/* ============================================================
   Shikaku — "Divide by Squares" puzzle engine
   Pure logic: rectangle-tiling generator + uniqueness solver +
   validation.

   Rules
     · divide the whole grid into rectangles (and squares);
     · each rectangle holds exactly one number;
     · that number equals the rectangle's area (its cell count).

   A puzzle is accepted only when it has exactly ONE solution.
   Exposed on window.Shikaku.
   ============================================================ */
(function () {
  "use strict";

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  const randInt = (n) => Math.floor(Math.random() * n);

  // ---- candidate rectangles for every clue ----
  // A candidate is a rectangle of area == clue value that contains the
  // clue cell and NO other clue cell, fully inside the grid.
  function buildCandidates(rows, cols, clues) {
    const clueAt = [];
    for (let r = 0; r < rows; r++) clueAt.push(new Array(cols).fill(-1));
    clues.forEach((cl, i) => { clueAt[cl.r][cl.c] = i; });

    return clues.map((cl, i) => {
      const v = cl.v, list = [];
      for (let w = 1; w <= v; w++) {
        if (v % w) continue;
        const h = v / w;
        if (w > cols || h > rows) continue;
        const c0lo = Math.max(0, cl.c - w + 1), c0hi = Math.min(cl.c, cols - w);
        const r0lo = Math.max(0, cl.r - h + 1), r0hi = Math.min(cl.r, rows - h);
        for (let c0 = c0lo; c0 <= c0hi; c0++) {
          for (let r0 = r0lo; r0 <= r0hi; r0++) {
            let ok = true;
            const cells = [];
            for (let rr = r0; rr < r0 + h && ok; rr++) {
              for (let cc = c0; cc < c0 + w; cc++) {
                const ci = clueAt[rr][cc];
                if (ci >= 0 && ci !== i) { ok = false; break; }
                cells.push(rr * cols + cc);
              }
            }
            if (ok) list.push({ r0, c0, w, h, cells });
          }
        }
      }
      return list;
    });
  }

  // ---- count exact tilings (capped) ----
  function countSolutions(rows, cols, clues, cap, budget) {
    const cands = buildCandidates(rows, cols, clues);
    if (cands.some((l) => l.length === 0)) return { count: 0, aborted: false };

    const N = rows * cols;
    const cellCands = [];           // cellIndex -> [{clue, rc}]
    for (let i = 0; i < N; i++) cellCands.push([]);
    cands.forEach((list, clue) => list.forEach((rc) => {
      rc.cells.forEach((ci) => cellCands[ci].push({ clue, rc }));
    }));

    const cover = new Array(N).fill(false);
    const used = new Array(clues.length).fill(false);
    let count = 0, ops = 0, aborted = false;
    let scan = 0;

    function rec(from) {
      if (aborted) return;
      if (++ops > budget) { aborted = true; return; }
      let cell = -1;
      for (let i = from; i < N; i++) { if (!cover[i]) { cell = i; break; } }
      if (cell < 0) { count++; if (count >= cap) aborted = true; return; }

      const opts = cellCands[cell];
      for (let k = 0; k < opts.length; k++) {
        const { clue, rc } = opts[k];
        if (used[clue]) continue;
        let okc = true;
        for (let m = 0; m < rc.cells.length; m++) { if (cover[rc.cells[m]]) { okc = false; break; } }
        if (!okc) continue;
        used[clue] = true;
        for (let m = 0; m < rc.cells.length; m++) cover[rc.cells[m]] = true;
        rec(cell + 1);
        for (let m = 0; m < rc.cells.length; m++) cover[rc.cells[m]] = false;
        used[clue] = false;
        if (aborted) return;
      }
    }
    rec(0);
    return { count, aborted };
  }

  // ============================================================
  //  GENERATOR — random rectangle tiling, kept only if unique
  // ============================================================
  function generate(opts) {
    const rows = opts.rows, cols = opts.cols;
    const maxDim = opts.maxDim || 4;     // rectangles up to maxDim per side
    const maxArea = opts.maxArea || (maxDim * maxDim);
    const maxTries = opts.maxTries || 400;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      const id = [];
      for (let r = 0; r < rows; r++) id.push(new Array(cols).fill(-1));
      const rects = [];
      let bad = false;

      // always fill the top-left-most empty cell → guarantees a perfect tiling
      for (let r = 0; r < rows && !bad; r++) {
        for (let c = 0; c < cols; c++) {
          if (id[r][c] !== -1) continue;
          // widest run of empties to the right
          let maxW = 0;
          while (c + maxW < cols && id[r][c + maxW] === -1) maxW++;
          maxW = Math.min(maxW, maxDim);
          const w = 1 + randInt(maxW);
          // tallest run keeping all w columns empty
          let maxH = 0;
          grow: while (r + maxH < rows && maxH < maxDim) {
            for (let cc = c; cc < c + w; cc++) if (id[r + maxH][cc] !== -1) break grow;
            maxH++;
          }
          let h = 1 + randInt(maxH);
          if (w * h > maxArea) h = Math.max(1, Math.floor(maxArea / w));
          const idx = rects.length;
          for (let rr = r; rr < r + h; rr++)
            for (let cc = c; cc < c + w; cc++) id[rr][cc] = idx;
          rects.push({ r0: r, c0: c, w, h, area: w * h });
        }
      }
      if (bad) continue;

      // taste filters: not too many trivial 1-cell rects, decent variety
      const ones = rects.filter((R) => R.area === 1).length;
      if (rects.length < 3) continue;
      if (ones > Math.ceil(rects.length * 0.34)) continue;

      // place a clue at a random cell of each rectangle
      const clues = rects.map((R) => {
        const cells = [];
        for (let rr = R.r0; rr < R.r0 + R.h; rr++)
          for (let cc = R.c0; cc < R.c0 + R.w; cc++) cells.push([rr, cc]);
        const [cr, cc] = cells[randInt(cells.length)];
        return { r: cr, c: cc, v: R.area };
      });

      // unique?
      const budget = rows * cols * 1500 + 60000;
      const { count, aborted } = countSolutions(rows, cols, clues, 2, budget);
      if (aborted || count !== 1) continue;

      const clueAt = [];
      for (let r = 0; r < rows; r++) clueAt.push(new Array(cols).fill(-1));
      clues.forEach((cl, i) => { clueAt[cl.r][cl.c] = i; });

      return { rows, cols, clues, solRects: rects, clueAt };
    }
    return null;
  }

  // ============================================================
  //  VALIDATION  (player rects: array of {r0,c0,w,h})
  // ============================================================
  function validate(puzzle, rects) {
    const { rows, cols, clues, clueAt } = puzzle;
    const cover = [];
    for (let r = 0; r < rows; r++) cover.push(new Array(cols).fill(-1));

    // map cells → rect index (rects are kept non-overlapping by the app)
    rects.forEach((R, i) => {
      for (let rr = R.r0; rr < R.r0 + R.h; rr++)
        for (let cc = R.c0; cc < R.c0 + R.w; cc++)
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) cover[rr][cc] = i;
    });

    // per-rect status
    const rectStatus = rects.map((R) => {
      let clueCount = 0, val = 0;
      for (let rr = R.r0; rr < R.r0 + R.h; rr++)
        for (let cc = R.c0; cc < R.c0 + R.w; cc++) {
          const ci = clueAt[rr][cc];
          if (ci >= 0) { clueCount++; val = clues[ci].v; }
        }
      const area = R.w * R.h;
      if (clueCount === 1 && val === area) return "correct";
      return "bad";   // 0 clues, several clues, or wrong area
    });

    let filled = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (cover[r][c] >= 0) filled++;

    const solved =
      filled === rows * cols &&
      rects.length === clues.length &&
      rectStatus.every((s) => s === "correct");

    return { cover, rectStatus, filled, total: rows * cols, solved };
  }

  window.Shikaku = { generate, validate, countSolutions };
})();
