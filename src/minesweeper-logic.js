/* ============================================================
   Sweep — Minesweeper puzzle engine
   Pure logic: board generation (first-click safe), neighbour
   helpers and flood-fill reveal. Exposed on window.Mines.
   ============================================================ */
(function () {
  "use strict";

  // the 8 surrounding offsets
  const N8 = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function inBounds(r, c, rows, cols) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function neighbors(r, c, rows, cols) {
    const out = [];
    for (let i = 0; i < N8.length; i++) {
      const nr = r + N8[i][0], nc = c + N8[i][1];
      if (inBounds(nr, nc, rows, cols)) out.push([nr, nc]);
    }
    return out;
  }

  // Build a board with `mineCount` mines, guaranteeing the first-clicked
  // cell AND its 8 neighbours are mine-free, so the first click always
  // opens an area (traditional behaviour).
  function generate(rows, cols, mineCount, safeR, safeC) {
    const total = rows * cols;
    // cells that must stay safe
    const banned = new Set();
    banned.add(safeR * cols + safeC);
    neighbors(safeR, safeC, rows, cols).forEach(([r, c]) => banned.add(r * cols + c));

    // pool of placeable indices
    const pool = [];
    for (let i = 0; i < total; i++) if (!banned.has(i)) pool.push(i);

    // clamp mine count so a board is always possible
    const mines = Math.min(mineCount, pool.length);

    // Fisher–Yates partial shuffle to pick mine cells
    for (let i = 0; i < mines; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }

    const mine = [];
    for (let r = 0; r < rows; r++) mine.push(new Array(cols).fill(false));
    for (let i = 0; i < mines; i++) {
      const idx = pool[i];
      mine[Math.floor(idx / cols)][idx % cols] = true;
    }

    // adjacency counts
    const num = [];
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols).fill(0);
      for (let c = 0; c < cols; c++) {
        if (mine[r][c]) { row[c] = -1; continue; }
        let n = 0;
        neighbors(r, c, rows, cols).forEach(([nr, nc]) => { if (mine[nr][nc]) n++; });
        row[c] = n;
      }
      num.push(row);
    }

    return { rows, cols, mineCount: mines, mine, num };
  }

  // Flood-fill reveal starting at (r,c) on `revealed` (mutated in place).
  // Reveals the clicked cell; if it is a 0, recursively opens neighbours.
  // Never reveals flagged cells. Returns the list of newly-revealed cells.
  function floodReveal(board, revealed, flags, r, c) {
    const { rows, cols, num, mine } = board;
    const opened = [];
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      if (revealed[cr][cc]) continue;
      if (flags[cr][cc] === 1) continue; // a planted flag blocks; a "?" does not
      if (mine[cr][cc]) continue; // safety — caller handles mine hits
      revealed[cr][cc] = true;
      opened.push([cr, cc]);
      if (num[cr][cc] === 0) {
        neighbors(cr, cc, rows, cols).forEach(([nr, nc]) => {
          if (!revealed[nr][nc] && flags[nr][nc] !== 1) stack.push([nr, nc]);
        });
      }
    }
    return opened;
  }

  window.Mines = { generate, neighbors, floodReveal, N8 };
})();
