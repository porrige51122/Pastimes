/* ============================================================
   nurikabe-logic.js — Nurikabe puzzle engine
   Black cells form one connected river (no 2×2 pools).
   White cells form numbered islands of the given size.
   Exposed as window.Nurikabe
   ============================================================ */
(function () {
  "use strict";

  const D4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function inB(R, C, r, c) { return r >= 0 && r < R && c >= 0 && c < C; }

  /* ---- connectivity check for black cells ---- */
  function blackConnected(black, R, C) {
    const n = R * C; let first = -1, total = 0;
    for (let i = 0; i < n; i++) if (black[i]) { total++; if (first < 0) first = i; }
    if (total === 0) return true;
    const vis = new Uint8Array(n);
    const q = [first]; vis[first] = 1; let cnt = 1, head = 0;
    while (head < q.length) {
      const k = q[head++], kr = (k / C) | 0, kc = k % C;
      for (const [dr, dc] of D4) {
        const nr = kr + dr, nc = kc + dc;
        if (!inB(R, C, nr, nc)) continue;
        const nk = nr * C + nc;
        if (black[nk] && !vis[nk]) { vis[nk] = 1; cnt++; q.push(nk); }
      }
    }
    return cnt === total;
  }

  /* ---- 2×2 pool check ---- */
  function hasPool(black, R, C) {
    for (let r = 0; r < R - 1; r++)
      for (let c = 0; c < C - 1; c++)
        if (black[r * C + c] && black[r * C + c + 1] &&
            black[(r + 1) * C + c] && black[(r + 1) * C + c + 1]) return true;
    return false;
  }

  /* ---- generation ---- */

  /* Would assigning cell p disconnect the remaining unassigned region? */
  function wouldCut(islandOf, p, R, C) {
    const r = (p / C) | 0, c = p % C, nbrs = [];
    for (const [dr, dc] of D4) {
      const nr = r + dr, nc = c + dc;
      if (inB(R, C, nr, nc) && islandOf[nr * C + nc] === 0) nbrs.push(nr * C + nc);
    }
    if (nbrs.length <= 1) return false;
    const N = R * C, vis = new Uint8Array(N);
    const q = [nbrs[0]]; vis[nbrs[0]] = 1; let head = 0;
    while (head < q.length) {
      const k = q[head++], kr = (k / C) | 0, kc = k % C;
      for (const [dr, dc] of D4) {
        const nr = kr + dr, nc = kc + dc;
        if (!inB(R, C, nr, nc)) continue;
        const nk = nr * C + nc;
        if (nk === p || islandOf[nk] !== 0 || vis[nk]) continue;
        vis[nk] = 1; q.push(nk);
      }
    }
    for (let i = 1; i < nbrs.length; i++) if (!vis[nbrs[i]]) return true;
    return false;
  }

  function tryGen(R, C, maxS) {
    const N = R * C;
    const islandOf = new Int16Array(N);

    /* Place seeds: ~18% of cells, none adjacent, none cutting the free region */
    const numSeeds = Math.max(4, Math.min(22, (N * 0.18) | 0));
    const seeds = [];
    const posArr = shuffle(Array.from({ length: N }, (_, i) => i));
    for (const p of posArr) {
      if (seeds.length >= numSeeds) break;
      const r = (p / C) | 0, c = p % C;
      let adj = false;
      for (const [dr, dc] of D4) {
        const nr = r + dr, nc = c + dc;
        if (inB(R, C, nr, nc) && islandOf[nr * C + nc] > 0) { adj = true; break; }
      }
      if (adj || wouldCut(islandOf, p, R, C)) continue;
      const id = seeds.length + 1;
      islandOf[p] = id;
      const front = new Set();
      for (const [dr, dc] of D4) {
        const nr = r + dr, nc = c + dc;
        if (inB(R, C, nr, nc)) front.add(nr * C + nc);
      }
      seeds.push({ id, pos: p, cells: [p], target: 1 + ((Math.random() * maxS) | 0), front });
    }
    if (seeds.length < 2) return null;

    /* Grow islands simultaneously; skip cells that would cut the black region */
    let anyGrew = true;
    for (let iter = 0; iter < N * 8 && anyGrew; iter++) {
      anyGrew = false;
      const order = seeds.map((_, k) => k); shuffle(order);
      for (const i of order) {
        const s = seeds[i];
        if (s.cells.length >= s.target) continue;
        const valid = [];
        for (const p of s.front) {
          if (islandOf[p] !== 0) { s.front.delete(p); continue; }
          const r = (p / C) | 0, c = p % C;
          let ok = true;
          for (const [dr, dc] of D4) {
            const nr = r + dr, nc = c + dc;
            if (!inB(R, C, nr, nc)) continue;
            const nk = nr * C + nc;
            if (islandOf[nk] > 0 && islandOf[nk] !== s.id) { ok = false; break; }
          }
          if (!ok || wouldCut(islandOf, p, R, C)) continue;
          valid.push(p);
        }
        if (!valid.length) continue;
        const pick = valid[(Math.random() * valid.length) | 0];
        islandOf[pick] = s.id; s.cells.push(pick); s.front.delete(pick);
        const pr = (pick / C) | 0, pc = pick % C;
        for (const [dr, dc] of D4) {
          const nr = pr + dr, nc = pc + dc;
          if (inB(R, C, nr, nc) && islandOf[nr * C + nc] === 0) s.front.add(nr * C + nc);
        }
        anyGrew = true;
      }
    }

    /* Pool repair: for any 2×2 all-black block, extend a neighbour island into it */
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) {
      const pool = [r * C + c, r * C + c + 1, (r + 1) * C + c, (r + 1) * C + c + 1];
      if (!pool.every(p => islandOf[p] === 0)) continue;
      let fixed = false;
      for (const p of shuffle(pool.slice())) {
        const pr = (p / C) | 0, pc = p % C;
        let adjId = 0;
        for (const [dr, dc] of D4) {
          const nr = pr + dr, nc = pc + dc;
          if (inB(R, C, nr, nc) && islandOf[nr * C + nc] > 0) { adjId = islandOf[nr * C + nc]; break; }
        }
        if (!adjId) continue;
        let adjOther = false;
        for (const [dr, dc] of D4) {
          const nr = pr + dr, nc = pc + dc;
          if (!inB(R, C, nr, nc)) continue;
          const nk = nr * C + nc;
          if (islandOf[nk] > 0 && islandOf[nk] !== adjId) { adjOther = true; break; }
        }
        if (adjOther || wouldCut(islandOf, p, R, C)) continue;
        islandOf[p] = adjId; seeds[adjId - 1].cells.push(p); fixed = true; break;
      }
      if (!fixed) return null;
    }

    /* Final checks */
    const black = new Uint8Array(N);
    for (let i = 0; i < N; i++) black[i] = islandOf[i] === 0 ? 1 : 0;
    if (!blackConnected(black, R, C)) return null;
    if (hasPool(black, R, C)) return null;

    /* Clues = actual grown size of each island */
    const clues = Array.from({ length: R }, () => new Array(C).fill(null));
    for (const s of seeds) clues[(s.pos / C) | 0][s.pos % C] = s.cells.length;
    return { rows: R, cols: C, clues };
  }

  function generate(opts) {
    const { rows: R, cols: C, diff } = opts;
    const maxS = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
    for (let t = 0; t < 300; t++) {
      const result = tryGen(R, C, maxS);
      if (result) return result;
    }
    return null;
  }

  /* ---- validate player state ----
     playerState[r][c]: 0 = unknown (white by default), 1 = black, 2 = confirmed white dot
     Number cells are always pre-set to 2 and cannot be changed.
  ---------------------------------------------------------------- */
  function validate(puzzle, playerState) {
    const { rows: R, cols: C, clues } = puzzle;
    const cellError = Array.from({ length: R }, () => new Array(C).fill(false));
    const cellDone  = Array.from({ length: R }, () => new Array(C).fill(false));
    const poolCells = Array.from({ length: R }, () => new Array(C).fill(false));
    let hasPoolErr = false;

    /* 2×2 black pool check */
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) {
      if (playerState[r][c] === 1 && playerState[r][c + 1] === 1 &&
          playerState[r + 1][c] === 1 && playerState[r + 1][c + 1] === 1) {
        poolCells[r][c] = poolCells[r][c + 1] =
        poolCells[r + 1][c] = poolCells[r + 1][c + 1] = true;
        hasPoolErr = true;
      }
    }

    /* Flood-fill non-black regions */
    const regId = Array.from({ length: R }, () => new Array(C).fill(-1));
    const regions = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (playerState[r][c] !== 1 && regId[r][c] === -1) {
        const cells = [], nums = []; let hasUnk = false;
        const q = [{ r, c }]; regId[r][c] = regions.length; let head = 0;
        while (head < q.length) {
          const { r: cr, c: cc } = q[head++];
          cells.push({ r: cr, c: cc });
          if (playerState[cr][cc] === 0) hasUnk = true;
          if (clues[cr][cc] != null) nums.push({ r: cr, c: cc, n: clues[cr][cc] });
          for (const [dr, dc] of D4) {
            const nr = cr + dr, nc = cc + dc;
            if (!inB(R, C, nr, nc) || regId[nr][nc] !== -1 || playerState[nr][nc] === 1) continue;
            regId[nr][nc] = regions.length;
            q.push({ r: nr, c: nc });
          }
        }
        regions.push({ cells, nums, hasUnk });
      }
    }

    /* Evaluate each region against its number.
       Only flag errors when the region is fully decided (no unknowns), or when
       two numbers share one fully-decided region. */
    for (const { cells, nums, hasUnk } of regions) {
      if (!nums.length) continue;
      if (nums.length > 1 && !hasUnk) {
        nums.forEach(({ r, c }) => { cellError[r][c] = true; });
      } else if (nums.length === 1) {
        const { r, c, n } = nums[0];
        if (!hasUnk) {
          if (cells.length === n) cellDone[r][c] = true;
          else cellError[r][c] = true;
        }
        // hasUnk: player can still add black cells to shrink this region — no error yet
      }
    }

    let blackCount = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
      if (playerState[r][c] === 1) blackCount++;

    /* Solved: all non-black cells form the correct islands.
       State-0 (unknown) cells count as white — no right-click confirmation needed. */
    let solved = false;
    if (!hasPoolErr && !cellError.some(row => row.some(Boolean))) {
      const allGood = regions.every(({ cells, nums }) =>
        nums.length === 1 && cells.length === nums[0].n);
      if (allGood) {
        const bl = new Uint8Array(R * C);
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
          if (playerState[r][c] === 1) bl[r * C + c] = 1;
        solved = blackConnected(bl, R, C);
      }
    }

    return { cellError, cellDone, poolCells, solved, hasPoolErr, blackCount };
  }

  window.Nurikabe = { generate, validate };
})();
