/* ============================================================
   TicTacToeApp.jsx — Binary puzzle (X / O grid)

   Click a cell to cycle: empty → X → O → empty.
   Keyboard: X / 1 for X, O / 0 / 2 for O, Delete to clear,
             arrows to navigate.
   ============================================================ */
const TTL = window.TicTacLogic;
const { X, O, E } = TTL;
const {
  useState: ttS, useEffect: ttE, useRef: ttR,
  useCallback: ttC, useLayoutEffect: ttL,
} = React;

/* ── Difficulty map ─────────────────────────────────────────── */
const TTDIFF = {
  easy:   { label: "Easy",   n: 4 },
  medium: { label: "Medium", n: 6 },
  hard:   { label: "Hard",   n: 8 },
};

/* ── Shared icons (inlined SVG) ─────────────────────────────── */
const TTIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

/* ── Helpers ────────────────────────────────────────────────── */
function ttFmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}
function ttClone(g) { return g.map(r => r.slice()); }

/* ── Main component ─────────────────────────────────────────── */
function TicTacToeApp() {
  const [difficulty, setDifficulty] = ttS("easy");
  const [puzzle,     setPuzzle]     = ttS(null);
  const [grid,       setGrid]       = ttS([]);
  const [sel,        setSel]        = ttS(null);
  const [seconds,    setSeconds]    = ttS(0);
  const [running,    setRunning]    = ttS(false);
  const [autoCheck,  setAutoCheck]  = ttS(true);
  const [flashUntil, setFlashUntil] = ttS(0);
  const [won,        setWon]        = ttS(false);
  const [toast,      setToast]      = ttS(null);
  const [motes,      setMotes]      = ttS([]);
  const [loading,    setLoading]    = ttS(false);
  const [cellSz,     setCellSz]     = ttS(60);

  /* Refs for stable closures */
  const gridRef    = ttR([]);
  const wonRef     = ttR(false);
  const selRef     = ttR(null);
  const givenRef   = ttR([]);
  const toastTimer = ttR(null);

  ttE(() => { gridRef.current  = grid; }, [grid]);
  ttE(() => { wonRef.current   = won;  }, [won]);
  ttE(() => { selRef.current   = sel;  }, [sel]);

  /* ── Toast helper ────────────────────────────────────────── */
  const showToast = ttC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  /* ── Start a new puzzle ──────────────────────────────────── */
  const newPuzzle = ttC((diffKey) => {
    setLoading(true);
    setTimeout(() => {
      const p = TTL.generate(diffKey);
      const g = ttClone(p.givens);
      gridRef.current  = g;
      givenRef.current = p.given;
      setPuzzle(p); setGrid(g); setSel(null);
      setSeconds(0); setRunning(false); setWon(false);
      setMotes([]); setLoading(false);
    }, 20);
  }, []);

  /* Generate on difficulty change */
  ttE(() => { newPuzzle(difficulty); }, [difficulty]);

  /* ── Timer ───────────────────────────────────────────────── */
  ttE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  /* ── Validation (runs each render) ───────────────────────── */
  const validation = puzzle
    ? TTL.validate(puzzle, grid)
    : { errGrid: [], solved: false, filled: 0 };

  const showErrors = autoCheck || Date.now() < flashUntil;

  /* ── Win detection ───────────────────────────────────────── */
  ttE(() => {
    if (!puzzle || won) return;
    if (!validation.solved) return;
    setWon(true); setRunning(false);
    const colors = ["#2f6bff","#15a05a","#f5a623","#e23b2e","#283353"];
    const arr = [];
    for (let i = 0; i < 80; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: colors[i % colors.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, [grid, puzzle, won]);

  /* ── Place a value in a cell ─────────────────────────────── */
  const setCellVal = ttC((r, c, v) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    const g = ttClone(gridRef.current);
    g[r][c] = v;
    gridRef.current = g;
    setGrid(g);
    if (!running) setRunning(true);
  }, [running]);

  /* ── Click: cycle empty → X → O → empty ─────────────────── */
  const clickCell = ttC((r, c) => {
    setSel({ r, c });
    if (wonRef.current || givenRef.current[r][c]) return;
    const cur = gridRef.current[r][c];
    const nv  = cur === E ? X : cur === X ? O : E;
    setCellVal(r, c, nv);
  }, [setCellVal]);

  /* ── Keyboard ────────────────────────────────────────────── */
  ttE(() => {
    if (!puzzle) return;
    const n = puzzle.n;
    const onKey = (e) => {
      const s = selRef.current;
      if (!s) return;
      const k = e.key;
      if      (k === "x" || k === "X" || k === "1")                      { setCellVal(s.r, s.c, X); e.preventDefault(); }
      else if (k === "o" || k === "O" || k === "0" || k === "2")          { setCellVal(s.r, s.c, O); e.preventDefault(); }
      else if (k === "Backspace" || k === "Delete")                        { setCellVal(s.r, s.c, E); e.preventDefault(); }
      else if (k === "ArrowUp")    { setSel({ r: Math.max(0, s.r-1), c: s.c });     e.preventDefault(); }
      else if (k === "ArrowDown")  { setSel({ r: Math.min(n-1, s.r+1), c: s.c });   e.preventDefault(); }
      else if (k === "ArrowLeft")  { setSel({ r: s.r, c: Math.max(0, s.c-1) });     e.preventDefault(); }
      else if (k === "ArrowRight") { setSel({ r: s.r, c: Math.min(n-1, s.c+1) });   e.preventDefault(); }
      else if (k === "Escape")     { setSel(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puzzle, setCellVal]);

  /* ── Restart ─────────────────────────────────────────────── */
  const restart = ttC(() => {
    if (!puzzle) return;
    const g = ttClone(puzzle.givens);
    gridRef.current = g; setGrid(g);
    setWon(false); setSeconds(0); setRunning(false); setSel(null);
  }, [puzzle]);

  /* ── Manual check button ─────────────────────────────────── */
  const runCheck = ttC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = TTL.validate(puzzle, grid);
    if (v.solved) return;
    const anyErr = v.errGrid.some(row => row.some(Boolean));
    if (anyErr)             showToast("There's a conflict — check for three in a row", true);
    else if (v.filled < puzzle.n * puzzle.n) showToast("No mistakes found yet — keep going");
    else                    showToast("Looks good!");
  }, [puzzle, grid, showToast]);

  /* Expire flash */
  ttE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil(f => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  /* ── Responsive cell sizing ──────────────────────────────── */
  ttL(() => {
    if (!puzzle) return;
    const n = puzzle.n;
    const fit = () => {
      const avail = Math.min(520, window.innerWidth - 40);
      const c = Math.max(34, Math.min(72, Math.floor((avail - (n - 1) * 5) / n)));
      setCellSz(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  /* ── Early return before first puzzle loads ──────────────── */
  if (!puzzle) {
    return (
      <div className="wrap">
        <div className="masthead"><h1 className="wordmark">Binary</h1></div>
      </div>
    );
  }

  const n       = puzzle.n;
  const filled  = validation.filled;
  const symSz = Math.round(cellSz * 0.52);

  /* ── Build board cells ───────────────────────────────────── */
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v       = grid[r][c];
      const isGiven = puzzle.given[r][c];
      const isSel   = sel && sel.r === r && sel.c === c;
      const isPeer  = sel && !isSel && (sel.r === r || sel.c === c);
      const err     = showErrors && validation.errGrid[r] && validation.errGrid[r][c];

      let cls = "tt-cell";
      if (isGiven) cls += " given";
      if (isSel)        cls += " sel";
      else if (isPeer)  cls += " peer";
      if (err)     cls += " err";
      if (v === X) cls += " has-x";
      if (v === O) cls += " has-o";

      cells.push(
        <div key={r + "_" + c} className={cls} onClick={() => clickCell(r, c)}>
          {v === X && (
            <svg className="tt-sym-svg" width={symSz} height={symSz} viewBox="0 0 24 24">
              <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke="rgba(255,255,255,.85)" strokeWidth="3.5" strokeLinecap="round"/>
              <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" stroke="rgba(255,255,255,.85)" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          )}
          {v === O && (
            <svg className="tt-sym-svg" width={symSz} height={symSz} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="3.5"/>
            </svg>
          )}
        </div>
      );
    }
  }

  /* ── Row/col progress pips ───────────────────────────────── */
  const rowPips = [];
  for (let r = 0; r < n; r++) {
    let xr = 0, or_ = 0;
    for (let c = 0; c < n; c++) { if (grid[r][c] === X) xr++; else if (grid[r][c] === O) or_++; }
    rowPips.push(
      <div key={r} className="tt-strip" style={{ height: cellSz + "px", justifyContent: "center" }}>
        <div className={"tt-pip" + (xr > 0 ? " x" : "")}></div>
        <div className={"tt-pip" + (or_ > 0 ? " o" : "")}></div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>

      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44" aria-hidden="true">
            <rect x="4"  y="4"  width="16" height="16" rx="4" fill="#2f6bff" stroke="#1a3eb0" strokeWidth="1.5"/>
            <rect x="24" y="4"  width="16" height="16" rx="4" fill="#e8820c" stroke="#a05400" strokeWidth="1.5"/>
            <rect x="4"  y="24" width="16" height="16" rx="4" fill="#e8820c" stroke="#a05400" strokeWidth="1.5"/>
            <rect x="24" y="24" width="16" height="16" rx="4" fill="#2f6bff" stroke="#1a3eb0" strokeWidth="1.5"/>
            <line x1="8" y1="8" x2="16" y2="16" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" strokeLinecap="round"/>
            <line x1="16" y1="8" x2="8" y2="16" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" strokeLinecap="round"/>
            <circle cx="32" cy="12" r="4" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2.4"/>
            <circle cx="12" cy="32" r="4" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2.4"/>
            <line x1="28" y1="28" x2="36" y2="36" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" strokeLinecap="round"/>
            <line x1="36" y1="28" x2="28" y2="36" stroke="rgba(255,255,255,.85)" strokeWidth="2.4" strokeLinecap="round"/>
          </svg>
          <h1 className="wordmark">Binary</h1>
        </div>
        <div className="tagline">X or O — never three</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(TTDIFF).map(k => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {TTDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>
          {TTIcon.refresh} New
        </button>
        <button className="btn" onClick={restart}>{TTIcon.reset} Restart</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck(a => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && (
          <button className="btn" onClick={runCheck}>{TTIcon.check} Check</button>
        )}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("binary")}>
          {TTIcon.rules} Rules
        </button>
      </div>

      <div className="statsbar">
        <div className="stat">
          <div className="num">{ttFmt(seconds)}</div>
          <div className="lbl">Time</div>
        </div>
        <div className="stat">
          <div className="num">{filled}/{n * n}</div>
          <div className="lbl">Filled</div>
        </div>
        <div className="stat">
          <div className="num">{n}×{n}</div>
          <div className="lbl">Grid</div>
        </div>
      </div>

      <div className="board-frame" style={{ width: "fit-content", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="tt-board" style={{
            gridTemplateColumns: "repeat(" + n + ", " + cellSz + "px)",
            gridTemplateRows: "repeat(" + n + ", " + cellSz + "px)",
            gap: "5px",
          }}>
            {cells}
          </div>
        </div>
      </div>

      <div className="helpline">
        Fill every cell with <b>X</b> or <b>O</b>. No <b>{Math.max(3, Math.floor(n / 2))}</b> or more of the same in any row or column. Each row and column has <b>equal</b> X's and O's. <b>Click</b> to cycle, or press <b>X</b> / <b>O</b>.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? TTIcon.warn : TTIcon.info}{toast.msg}
          </div>
        </div>
      )}

      {motes.map(m => (
        <div key={m.id} className="mote" style={{
          left: m.left + "vw", width: m.size, height: m.size * 0.6,
          background: m.color, transform: "rotate(" + m.rot + "deg)",
          animationDuration: m.dur + "s", animationDelay: m.delay + "s",
        }} />
      ))}

      {won && (
        <div className="win-overlay">
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto", display: "block" }}>
              <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Solved!</h2>
            <p>No run of {Math.max(3, Math.floor(n / 2))}+. Every line perfectly balanced.</p>
            <div className="win-stats">
              <div><div className="num">{ttFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }}
              onClick={() => newPuzzle(difficulty)}>
              {TTIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TicTacToeApp />);
