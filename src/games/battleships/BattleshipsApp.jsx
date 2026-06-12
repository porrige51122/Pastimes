/* ============================================================
   BattleshipsApp.jsx — find the hidden fleet
   ============================================================ */
const BS = window.Battleships;
const { useState: bS, useEffect: bE, useCallback: bC, useLayoutEffect: bL, useRef: bR } = React;

const BSDIFF = {
  easy:   { label: "Easy",   desc: "6×6" },
  medium: { label: "Medium", desc: "8×8" },
  hard:   { label: "Hard",   desc: "10×10" },
};

const BSI = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  ship: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="8" rx="4"/><line x1="6" y1="14" x2="6" y2="18"/><line x1="18" y1="14" x2="18" y2="18"/></svg>,
  water: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/></svg>,
  book: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function bsFmt(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

/* Compute dynamic segment type from player grid */
function dynSeg(g, r, c, n) {
  if (g[r][c] !== 1) return null;
  var u = r > 0 && g[r - 1][c] === 1, d = r < n - 1 && g[r + 1][c] === 1;
  var l = c > 0 && g[r][c - 1] === 1, ri = c < n - 1 && g[r][c + 1] === 1;
  if (!u && !d && !l && !ri) return "sub";
  if (!u && d && !l && !ri) return "top";
  if (u && !d && !l && !ri) return "bot";
  if (!u && !d && !l && ri) return "lft";
  if (!u && !d && l && !ri) return "rgt";
  return "mid";
}

function BattleshipsApp() {
  const [diff, setDiff] = bS("easy");
  const [puzzle, setPuzzle] = bS(null);
  const [grid, setGrid] = bS([]);
  const [seconds, setSeconds] = bS(0);
  const [running, setRunning] = bS(false);
  const [over, setOver] = bS(null);
  const [mode, setMode] = bS("ship");
  const [cs, setCs] = bS(42);
  const [toast, setToast] = bS(null);
  const [motes, setMotes] = bS([]);
  const toastT = bR(null);

  const showToast = bC((msg, w) => {
    setToast({ id: Date.now(), msg, warn: !!w });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const fireWin = bC(() => {
    const cols = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#7a5af0", "#19b6c9"];
    const arr = [];
    for (let i = 0; i < 80; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: cols[i % cols.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, []);

  const newGame = bC((d) => {
    const p = BS.generate(d);
    setPuzzle(p);
    const g = [];
    for (let r = 0; r < p.size; r++) {
      g[r] = [];
      for (let c = 0; c < p.size; c++) {
        if (p.hints[r][c] === "water") g[r][c] = 2;
        else if (p.hints[r][c]) g[r][c] = 1;
        else g[r][c] = 0;
      }
    }
    setGrid(g); setSeconds(0); setRunning(false); setOver(null); setMotes([]);
  }, []);

  bE(() => { newGame(diff); }, [diff]);

  bE(() => {
    if (!running || over) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, over]);

  bL(() => {
    if (!puzzle) return;
    const fit = () => {
      const maxW = Math.min(560, window.innerWidth - 32);
      const maxH = window.innerHeight - 300;
      const n = puzzle.size + 1;
      setCs(Math.max(26, Math.min(48, Math.min(Math.floor(maxW / n), Math.floor(maxH / n)))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  const handleCell = bC((r, c, right) => {
    if (over || !puzzle || puzzle.hints[r][c]) return;
    if (!running) setRunning(true);
    setGrid(prev => {
      const next = prev.map(row => row.slice());
      if (right || mode === "water") next[r][c] = next[r][c] === 2 ? 0 : 2;
      else next[r][c] = next[r][c] === 1 ? 0 : 1;
      return next;
    });
  }, [over, puzzle, running, mode]);

  /* Win check */
  bE(() => {
    if (!puzzle || over || !running) return;
    const pg = grid.map(row => row.map(c => c === 1 ? 1 : 0));
    if (BS.checkWin(pg, puzzle)) { setOver("won"); setRunning(false); setTimeout(fireWin, 200); }
  }, [grid]);

  const clearGrid = bC(() => {
    if (!puzzle || over) return;
    setGrid(prev => {
      const next = prev.map(row => row.slice());
      for (let r = 0; r < puzzle.size; r++)
        for (let c = 0; c < puzzle.size; c++)
          if (!puzzle.hints[r][c]) next[r][c] = 0;
      return next;
    });
  }, [puzzle, over]);

  if (!puzzle) return null;
  const n = puzzle.size;

  /* Row/col current counts */
  const rowNow = [], colNow = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    let s = 0;
    for (let c = 0; c < n; c++) { if (grid[r][c] === 1) { s++; colNow[c]++; } }
    rowNow.push(s);
  }

  /* Fleet grouping */
  const fleetMap = {};
  for (const s of puzzle.fleet) fleetMap[s] = (fleetMap[s] || 0) + 1;
  const fleetSizes = Object.keys(fleetMap).map(Number).sort((a, b) => b - a);
  const totalShip = puzzle.fleet.reduce((a, b) => a + b, 0);
  const placedShip = grid.flat().filter(c => c === 1).length;

  /* ---- Error detection ---- */
  const errSet = new Set();
  const _orth = [[0,1],[0,-1],[1,0],[-1,0]];
  const _diag = [[-1,-1],[-1,1],[1,-1],[1,1]];

  /* diagonal adjacency */
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== 1) continue;
      for (const [dr, dc] of _diag) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 1) {
          errSet.add(r + "," + c); errSet.add(nr + "," + nc);
        }
      }
    }

  /* invalid shape: cell has both horizontal AND vertical ship neighbours (bend) */
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== 1) continue;
      const hasV = (r > 0 && grid[r-1][c] === 1) || (r < n-1 && grid[r+1][c] === 1);
      const hasH = (c > 0 && grid[r][c-1] === 1) || (c < n-1 && grid[r][c+1] === 1);
      if (hasV && hasH) errSet.add(r + "," + c);
    }

  /* ship group too long */
  const _vis = {};
  const maxLen = puzzle.fleet[0];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const k = r + "," + c;
      if (grid[r][c] !== 1 || _vis[k]) continue;
      const q = [[r,c]], grp = []; _vis[k] = true;
      while (q.length) {
        const [cr, cc] = q.shift(); grp.push([cr, cc]);
        for (const [dr, dc] of _orth) {
          const nr = cr+dr, nc = cc+dc, nk = nr+","+nc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === 1 && !_vis[nk]) {
            _vis[nk] = true; q.push([nr, nc]);
          }
        }
      }
      if (grp.length > maxLen) for (const [cr, cc] of grp) errSet.add(cr + "," + cc);
    }

  /* row / col overflow */
  for (let r = 0; r < n; r++)
    if (rowNow[r] > puzzle.rowCounts[r])
      for (let c = 0; c < n; c++) if (grid[r][c] === 1) errSet.add(r + "," + c);
  for (let c = 0; c < n; c++)
    if (colNow[c] > puzzle.colCounts[c])
      for (let r = 0; r < n; r++) if (grid[r][c] === 1) errSet.add(r + "," + c);

  /* Build flat grid children */
  const cells = [];
  cells.push(<div key="corner" className="bs-corner" style={{ width: cs, height: cs }}></div>);
  for (let c = 0; c < n; c++) {
    const st = colNow[c] === puzzle.colCounts[c] ? "done" : colNow[c] > puzzle.colCounts[c] ? "over" : "";
    cells.push(<div key={"ct" + c} className={"bs-clue " + st} style={{ width: cs, height: cs }}>{puzzle.colCounts[c]}</div>);
  }
  for (let r = 0; r < n; r++) {
    const st = rowNow[r] === puzzle.rowCounts[r] ? "done" : rowNow[r] > puzzle.rowCounts[r] ? "over" : "";
    cells.push(<div key={"cl" + r} className={"bs-clue " + st} style={{ width: cs, height: cs }}>{puzzle.rowCounts[r]}</div>);
    for (let c = 0; c < n; c++) {
      const hint = puzzle.hints[r][c];
      const val = grid[r][c];
      const locked = !!hint;
      const seg = val === 1 ? (hint || dynSeg(grid, r, c, n)) : null;
      const hasErr = val === 1 && errSet.has(r + "," + c);
      cells.push(
        <div key={r + "-" + c}
          className={"bs-cell" + (locked ? " locked" : "") + (hasErr ? " bs-err" : "")}
          style={{ width: cs, height: cs }}
          onClick={() => handleCell(r, c, false)}
          onContextMenu={(e) => { e.preventDefault(); handleCell(r, c, true); }}>
          {val === 1 && <div className={"bs-seg " + (seg || "mid") + (locked ? " hint" : "") + (hasErr ? " error" : "")} />}
          {val === 2 && <span className={"bs-water" + (locked ? " hint" : "")}>~</span>}
        </div>
      );
    }
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../categories/deduction.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        Deduction
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <rect x="2" y="2" width="40" height="40" rx="10" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <rect x="8" y="13" width="28" height="8" rx="4" fill="#283353"/>
            <rect x="12" y="24" width="20" height="6" rx="3" fill="#2f6bff"/>
          </svg>
          <h1 className="wordmark">Battleships</h1>
        </div>
        <div className="tagline">Find the hidden fleet</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(BSDIFF).map(k => (
            <button key={k} className={diff === k ? "active" : ""}
              onClick={() => k !== diff ? setDiff(k) : newGame(k)}>
              {BSDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newGame(diff)}>{BSI.refresh} New</button>
        <button className="btn" onClick={clearGrid} disabled={!!over}>{BSI.undo} Clear</button>
        <div className="bs-mode">
          <button className={mode === "ship" ? "active" : ""} onClick={() => setMode("ship")}>{BSI.ship} Ship</button>
          <button className={mode === "water" ? "active" : ""} onClick={() => setMode("water")}>{BSI.water} Water</button>
        </div>
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("battleships")}>{BSI.book} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{bsFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{placedShip}/{totalShip}</div><div className="lbl">Ship cells</div></div>
      </div>

      <div className="bs-wrap">
        <div className="bs-board" style={{
          gridTemplateColumns: cs + "px repeat(" + n + ", " + cs + "px)",
          gridTemplateRows: cs + "px repeat(" + n + ", " + cs + "px)",
        }}>
          {cells}
        </div>

        <div className="bs-fleet">
          <span className="bs-fleet-label">Fleet:</span>
          {fleetSizes.map(size => (
            <div key={size} className="bs-fleet-group">
              <div className="bs-fleet-ship">
                {Array.from({ length: size }, (_, i) => <div key={i} className="bs-fleet-seg"></div>)}
              </div>
              <span className="bs-fleet-count">&times;{fleetMap[size]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="helpline">
        Place <b>{puzzle.fleet.length}</b> ships using the row and column counts. Ships are straight lines (no bends) and can't touch each other, even diagonally. <b>Click</b> to place a ship cell; <b>right-click</b> for water. Blue segments are given hints.
      </div>

      {toast && <div className="toast-zone" key={toast.id}><div className={"toast" + (toast.warn ? " warn" : "")}>{toast.warn ? BSI.warn : BSI.info}{toast.msg}</div></div>}

      {motes.map(m => <div key={m.id} className="mote" style={{
        left: m.left + "vw", width: m.size, height: m.size * 0.6,
        background: m.color, transform: "rotate(" + m.rot + "deg)",
        animationDuration: m.dur + "s", animationDelay: m.delay + "s",
      }} />)}

      {over && (
        <div className="win-overlay">
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
              <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Fleet found!</h2>
            <p>You located every ship.</p>
            <div className="win-stats">
              <div><div className="num">{bsFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{puzzle.fleet.length}</div><div className="lbl">Ships</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newGame(diff)}>
              {BSI.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BattleshipsApp />);
