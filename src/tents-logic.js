/* ============================================================
   Tents — "Trees & Tents" puzzle engine
   Pure logic: generator + uniqueness solver + validation.

   Rules
     · each tree has exactly one tent in an orthogonally
       adjacent cell (a perfect tree↔tent matching);
     · tents never touch — not even diagonally;
     · row / column clues count the tents in each line.

   A puzzle is accepted only when it has exactly ONE solution.
   Exposed on window.Tents.
   ============================================================ */
(function () {
  "use strict";

  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function inB(r, c, rows, cols) { return r >= 0 && r < rows && c >= 0 && c < cols; }

  // king-move (8-dir) adjacency between two cells
  function touches(r1, c1, r2, c2) {
    return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) === 1;
  }

  // ---- bipartite matching (Kuhn's) : left = tents, right = trees ----
  // adj: array per left-node of arrays of right-node ids
  function maxMatching(adj, nRight) {
    const matchR = new Array(nRight).fill(-1);
    let result = 0;
    function tryK(u, seen) {
      for (const v of adj[u]) {
        if (seen[v]) continue;
        seen[v] = true;
        if (matchR[v] === -1 || tryK(matchR[v], seen)) {
          matchR[v] = u;
          return true;
        }
      }
      return false;
    }
    for (let u = 0; u < adj.length; u++) {
      const seen = new Array(nRight).fill(false);
      if (tryK(u, seen)) result++;
    }
    return result;
  }

  // build tent→tree adjacency for a list of tent cells against a tree-id map
  function buildTentTreeAdj(tentCells, treeIdAt, rows, cols) {
    return tentCells.map(([r, c]) => {
      const lst = [];
      for (const [dr, dc] of ORTHO) {
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc, rows, cols)) {
          const id = treeIdAt[nr][nc];
          if (id >= 0) lst.push(id);
        }
      }
      return lst;
    });
  }

  // ============================================================
  //  UNIQUENESS SOLVER
  //  Counts valid solutions (capped at `cap`) consistent with the
  //  clues, the no-touch rule and a perfect tree↔tent matching.
  // ============================================================
  function countSolutions(spec, cap, budget) {
    const { rows, cols, rowClues, colClues, treeIdAt, treeCount } = spec;

    // candidate cells: empty cells orthogonally adjacent to >=1 tree
    const candByRow = [];
    const candColCountFromRow = []; // [r][c] = # candidate cells in col c in rows r..end
    for (let r = 0; r < rows; r++) candByRow.push([]);
    const isCand = [];
    for (let r = 0; r < rows; r++) isCand.push(new Array(cols).fill(false));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (treeIdAt[r][c] >= 0) continue; // tree cell
        let adj = false;
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr, nc = c + dc;
          if (inB(nr, nc, rows, cols) && treeIdAt[nr][nc] >= 0) { adj = true; break; }
        }
        if (adj) { candByRow[r].push(c); isCand[r][c] = true; }
      }
    }
    // remaining-candidates-per-column lookahead
    for (let r = 0; r <= rows; r++) candColCountFromRow.push(new Array(cols).fill(0));
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        candColCountFromRow[r][c] = candColCountFromRow[r + 1][c] + (isCand[r][c] ? 1 : 0);
      }
    }

    const colCount = new Array(cols).fill(0);
    let solutions = 0;
    let ops = 0;
    let aborted = false;
    const tents = []; // current [r,c] placements (for final matching)

    function colsFeasible(nextRow) {
      // every column must still be able to reach its clue from remaining rows
      for (let c = 0; c < cols; c++) {
        const need = colClues[c] - colCount[c];
        if (need < 0) return false;
        if (need > candColCountFromRow[nextRow][c]) return false;
      }
      return true;
    }

    function leafValid() {
      // row/col counts already guaranteed exact; verify perfect matching
      if (tents.length !== treeCount) return false;
      const adj = buildTentTreeAdj(tents, treeIdAt, rows, cols);
      return maxMatching(adj, treeCount) === treeCount;
    }

    // choose tents within row r among its candidate columns
    function rowChoose(r, cands, idx, chosenInRow, lastCol, prevCols) {
      if (aborted) return;
      if (++ops > budget) { aborted = true; return; }
      if (chosenInRow === rowClues[r]) {
        // row complete → check column lookahead, then descend
        if (!colsFeasible(r + 1)) return;
        if (r === rows - 1) {
          if (leafValid()) { solutions++; if (solutions >= cap) aborted = true; }
          return;
        }
        const myCols = new Set();
        for (let i = tents.length - rowClues[r]; i < tents.length; i++) myCols.add(tents[i][1]);
        rowChoose(r + 1, candByRow[r + 1], 0, 0, -2, myCols);
        return;
      }
      if (idx >= cands.length) return;
      const remain = cands.length - idx;
      if (remain < rowClues[r] - chosenInRow) return; // can't reach the clue

      const c = cands[idx];
      // option A: skip this column
      rowChoose(r, cands, idx + 1, chosenInRow, lastCol, prevCols);
      if (aborted) return;

      // option B: place a tent here, if legal
      const adjInRow = lastCol >= 0 && c - lastCol === 1;
      const adjPrev = prevCols && (prevCols.has(c - 1) || prevCols.has(c) || prevCols.has(c + 1));
      if (!adjInRow && !adjPrev && colCount[c] + 1 <= colClues[c]) {
        colCount[c]++;
        tents.push([r, c]);
        rowChoose(r, cands, idx + 1, chosenInRow + 1, c, prevCols);
        tents.pop();
        colCount[c]--;
      }
    }

    rowChoose(0, candByRow[0], 0, 0, -2, null);
    return { count: solutions, aborted };
  }

  // ============================================================
  //  GENERATOR
  // ============================================================
  function generate(opts) {
    const rows = opts.rows, cols = opts.cols;
    const target = opts.tents;
    const maxTries = opts.maxTries || 220;

    for (let attempt = 0; attempt < maxTries; attempt++) {
      // 1) scatter tents with the no-touch (king-move) rule
      const order = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) order.push([r, c]);
      shuffle(order);
      const tentAt = [];
      for (let r = 0; r < rows; r++) tentAt.push(new Array(cols).fill(false));
      const tents = [];
      for (const [r, c] of order) {
        if (tents.length >= target) break;
        let ok = true;
        for (const [tr, tc] of tents) { if (touches(r, c, tr, tc)) { ok = false; break; } }
        if (ok) { tentAt[r][c] = true; tents.push([r, c]); }
      }
      if (tents.length < target) continue; // couldn't place enough — retry

      // 2) give every tent its own tree in an orthogonal empty cell
      //    (bipartite matching: tents ↔ candidate tree cells)
      const cellId = (r, c) => r * cols + c;
      const treeCandidates = tents.map(([r, c]) => {
        const lst = [];
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr, nc = c + dc;
          if (inB(nr, nc, rows, cols) && !tentAt[nr][nc]) lst.push(cellId(nr, nc));
        }
        return shuffle(lst);
      });
      // match tents → distinct tree cells
      const cellList = [];
      const cellIndex = new Map();
      treeCandidates.forEach((lst) => lst.forEach((id) => {
        if (!cellIndex.has(id)) { cellIndex.set(id, cellList.length); cellList.push(id); }
      }));
      const adj = treeCandidates.map((lst) => lst.map((id) => cellIndex.get(id)));
      // Kuhn's, but recover the assignment
      const matchCell = new Array(cellList.length).fill(-1);
      function assign(u, seen) {
        for (const v of adj[u]) {
          if (seen[v]) continue;
          seen[v] = true;
          if (matchCell[v] === -1 || assign(matchCell[v], seen)) { matchCell[v] = u; return true; }
        }
        return false;
      }
      let matched = 0;
      for (let u = 0; u < adj.length; u++) {
        const seen = new Array(cellList.length).fill(false);
        if (assign(u, seen)) matched++;
      }
      if (matched < tents.length) continue; // no perfect tent→tree assignment — retry

      // place the trees
      const treeIdAt = [];
      for (let r = 0; r < rows; r++) treeIdAt.push(new Array(cols).fill(-1));
      const trees = [];
      for (let v = 0; v < cellList.length; v++) {
        if (matchCell[v] === -1) continue;
        const id = cellList[v];
        const tr = Math.floor(id / cols), tc = id % cols;
        treeIdAt[tr][tc] = trees.length;
        trees.push([tr, tc]);
      }
      // every tent must have produced a tree
      if (trees.length !== tents.length) continue;

      // 3) clues
      const rowClues = new Array(rows).fill(0);
      const colClues = new Array(cols).fill(0);
      tents.forEach(([r, c]) => { rowClues[r]++; colClues[c]++; });

      // 4) require a unique solution
      const spec = { rows, cols, rowClues, colClues, treeIdAt, treeCount: trees.length };
      const { count, aborted } = countSolutions(spec, 2, 250000);
      if (aborted || count !== 1) continue;

      // success
      const solGrid = [];
      for (let r = 0; r < rows; r++) solGrid.push(new Array(cols).fill(0));
      tents.forEach(([r, c]) => { solGrid[r][c] = 1; });

      return { rows, cols, trees, tents, rowClues, colClues, treeIdAt, solGrid };
    }
    return null;
  }

  // ============================================================
  //  VALIDATION  (player state: 0 empty · 1 tent · 2 grass)
  // ============================================================
  function validate(puzzle, state) {
    const { rows, cols, rowClues, colClues, treeIdAt, trees } = puzzle;
    const errGrid = [];
    for (let r = 0; r < rows; r++) errGrid.push(new Array(cols).fill(false));

    const tents = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (state[r][c] === 1) tents.push([r, c]);

    // rule errors: touching tents, or a tent with no adjacent tree
    let anyTouch = false, anyOrphan = false;
    for (let i = 0; i < tents.length; i++) {
      const [r, c] = tents[i];
      let adjTree = false;
      for (const [dr, dc] of ORTHO) {
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc, rows, cols) && treeIdAt[nr][nc] >= 0) { adjTree = true; break; }
      }
      if (!adjTree) { errGrid[r][c] = true; anyOrphan = true; }
      for (let j = i + 1; j < tents.length; j++) {
        const [r2, c2] = tents[j];
        if (touches(r, c, r2, c2)) { errGrid[r][c] = true; errGrid[r2][c2] = true; anyTouch = true; }
      }
    }

    // line counts
    const rowCount = new Array(rows).fill(0);
    const colCount = new Array(cols).fill(0);
    tents.forEach(([r, c]) => { rowCount[r]++; colCount[c]++; });
    const rowMet = rowClues.map((v, r) => rowCount[r] === v);
    const colMet = colClues.map((v, c) => colCount[c] === v);
    const rowOver = rowClues.map((v, r) => rowCount[r] > v);
    const colOver = colClues.map((v, c) => colCount[c] > v);

    // trees with exactly one orthogonally-adjacent tent (for nice feedback)
    const treeSatisfied = trees.map(([tr, tc]) => {
      let n = 0;
      for (const [dr, dc] of ORTHO) {
        const nr = tr + dr, nc = tc + dc;
        if (inB(nr, nc, rows, cols) && state[nr][nc] === 1) n++;
      }
      return n === 1;
    });

    // solved?
    let solved = false;
    if (!anyTouch && !anyOrphan && tents.length === trees.length &&
        rowMet.every(Boolean) && colMet.every(Boolean)) {
      const adj = buildTentTreeAdj(tents, treeIdAt, rows, cols);
      solved = maxMatching(adj, trees.length) === trees.length;
    }

    return { errGrid, rowCount, colCount, rowMet, colMet, rowOver, colOver, treeSatisfied, solved };
  }

  window.Tents = { generate, validate, countSolutions };
})();
