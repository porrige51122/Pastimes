/* ============================================================
   NurikabeApp.jsx — game shell, board, state, controls
   ============================================================ */
const NK = window.Nurikabe;
const { useState: nkS, useEffect: nkE, useRef: nkR, useCallback: nkC, useLayoutEffect: nkL } = React;

const NKDIFF = {
  easy:   { label: "Small",  rows: 5,  cols: 5,  diff: "easy"   },
  medium: { label: "Medium", rows: 7,  cols: 7,  diff: "medium" },
  hard:   { label: "Large",  rows: 10, cols: 10, diff: "hard"   },
};

const NKIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function nkFmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

/* Build initial state: number cells pre-set to 2 (white), rest unknown (0) */
function initState(puzzle) {
  return Array.from({ length: puzzle.rows }, (_, r) =>
    Array.from({ length: puzzle.cols }, (_, c) =>
      puzzle.clues[r][c] != null ? 2 : 0
    )
  );
}

function cloneState(s) { return s.map(r => r.slice()); }

function NurikabeApp() {
  const [difficulty, setDifficulty] = nkS("easy");
  const [puzzle, setPuzzle]         = nkS(null);
  const [state, setState]           = nkS([]);
  const [seconds, setSeconds]       = nkS(0);
  const [running, setRunning]       = nkS(false);
  const [autoCheck, setAutoCheck]   = nkS(true);
  const [flashUntil, setFlashUntil] = nkS(0);
  const [won, setWon]               = nkS(false);
  const [toast, setToast]           = nkS(null);
  const [motes, setMotes]           = nkS([]);
  const [loading, setLoading]       = nkS(false);
  const [cell, setCell]             = nkS(52);

  const stateRef = nkR([]);
  const wonRef   = nkR(false);
  const paintRef = nkR({ active: false, target: 0 });
  const toastTimer = nkR(null);

  nkE(() => { stateRef.current = state; }, [state]);
  nkE(() => { wonRef.current = won; }, [won]);

  const showToast = nkC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = nkC((diffKey) => {
    setLoading(true);
    setTimeout(() => {
      const d = NKDIFF[diffKey];
      let p = null, tries = 0;
      while (!p && tries++ < 5) p = NK.generate({ rows: d.rows, cols: d.cols, diff: d.diff });
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const blank = initState(p);
      stateRef.current = blank;
      setPuzzle(p); setState(blank);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 30);
  }, [showToast]);

  nkE(() => { newPuzzle(difficulty); }, [difficulty]);

  nkE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle
    ? NK.validate(puzzle, state)
    : { cellError: [], cellDone: [], poolCells: [], solved: false, blackCount: 0, hasPoolErr: false };

  const showErrors = autoCheck || Date.now() < flashUntil;

  /* Win detection */
  nkE(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true); setRunning(false);
      const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
      const arr = [];
      for (let i = 0; i < 75; i++) arr.push({
        id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
        color: colors[i % colors.length], delay: Math.random() * 0.7,
        dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
      });
      setMotes(arr);
    }
  }, [state, puzzle, won]);

  /* Paint cells on click/drag */
  const applyPaint = nkC((r, c, target) => {
    const cur = stateRef.current;
    if (cur[r][c] === target) return;
    const ns = cloneState(cur);
    ns[r][c] = target;
    stateRef.current = ns;
    setState(ns);
    if (!running && !wonRef.current) setRunning(true);
  }, [running]);

  const onPointerDown = nkC((e, r, c) => {
    if (wonRef.current) return;
    e.preventDefault();
    if (puzzle.clues[r][c] != null) return; // number cells are immutable
    const cur = stateRef.current[r][c];
    const target = (e.button === 2 || e.ctrlKey)
      ? (cur === 2 ? 0 : 2)   // right → toggle white/dot
      : (cur === 1 ? 0 : 1);  // left  → toggle black
    paintRef.current = { active: true, target };
    applyPaint(r, c, target);
  }, [applyPaint, puzzle]);

  const onPointerEnter = nkC((r, c) => {
    if (!paintRef.current.active || wonRef.current) return;
    if (puzzle && puzzle.clues[r][c] != null) return;
    applyPaint(r, c, paintRef.current.target);
  }, [applyPaint, puzzle]);

  nkE(() => {
    const up = () => { paintRef.current.active = false; };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);

  const clearAll = nkC(() => {
    if (!puzzle) return;
    const blank = initState(puzzle);
    stateRef.current = blank;
    setState(blank);
    setWon(false);
  }, [puzzle]);

  const runCheck = nkC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = NK.validate(puzzle, state);
    if (v.solved) return;
    if (v.hasPoolErr) {
      showToast("A 2×2 black pool is not allowed — break it up", true);
    } else {
      const hasErr = v.cellError.some(row => row.some(Boolean));
      if (hasErr) showToast("An island size is wrong — check the red numbers", true);
      else if (state.every(row => row.every(c => c !== 0))) showToast("No mistakes — check black connectivity");
      else showToast("No mistakes yet — keep going");
    }
  }, [puzzle, state, showToast]);

  nkE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil(f => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  /* Responsive cell sizing */
  nkL(() => {
    if (!puzzle) return;
    const { rows: R, cols: C } = puzzle;
    const fit = () => {
      const avail = Math.min(560, window.innerWidth - 36);
      const byW   = Math.floor(avail / C);
      const byH   = Math.floor((window.innerHeight - 440) / R);
      const lo = R >= 10 ? 30 : R >= 7 ? 36 : 46;
      const hi = R >= 10 ? 52 : R >= 7 ? 58 : 76;
      setCell(Math.max(lo, Math.min(hi, byW, byH)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) return (
    <div className="wrap"><div className="masthead"><h1 className="wordmark">Nurikabe</h1></div></div>
  );

  const { rows: R, cols: C } = puzzle;

  /* Build cell elements */
  const cells = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const isNum = puzzle.clues[r][c] != null;
      const st    = state[r][c];
      const err   = showErrors && validation.cellError[r] && validation.cellError[r][c];
      const done  = validation.cellDone[r] && validation.cellDone[r][c];
      const pool  = showErrors && validation.poolCells[r] && validation.poolCells[r][c];

      let cls = "nk-cell";
      if (isNum) {
        cls += " nk-num";
        if (done) cls += " nk-done";
        else if (err) cls += " nk-err";
      } else if (st === 1) {
        cls += " nk-black";
        if (pool) cls += " nk-pool";
      } else if (st === 2) {
        cls += " nk-dot";
      }

      cells.push(
        <div key={r + "_" + c} className={cls}
          onPointerDown={e => onPointerDown(e, r, c)}
          onPointerEnter={() => onPointerEnter(r, c)}>
          {isNum && <span className="nk-clue">{puzzle.clues[r][c]}</span>}
        </div>
      );
    }
  }

  const boardStyle = {
    "--cell": cell + "px",
    gridTemplateColumns: "repeat(" + C + ", var(--cell))",
  };

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>

      <div className="masthead">
        <div className="brandmark">
          <svg width="38" height="38" viewBox="0 0 44 44">
            <rect width="44" height="44" rx="5" fill="#1d2740"/>
            {/* Pixelated N: white squares on dark stream background */}
            {/* Row 0 */}<rect x="2" y="2" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="34" y="2" width="7" height="7" fill="#f2f4f8" rx="1"/>
            {/* Row 1 */}<rect x="2" y="10" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="10" y="10" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="34" y="10" width="7" height="7" fill="#f2f4f8" rx="1"/>
            {/* Row 2 */}<rect x="2" y="18" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="18" y="18" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="34" y="18" width="7" height="7" fill="#f2f4f8" rx="1"/>
            {/* Row 3 */}<rect x="2" y="26" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="26" y="26" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="34" y="26" width="7" height="7" fill="#f2f4f8" rx="1"/>
            {/* Row 4 */}<rect x="2" y="34" width="7" height="7" fill="#f2f4f8" rx="1"/><rect x="34" y="34" width="7" height="7" fill="#f2f4f8" rx="1"/>
          </svg>
          <h1 className="wordmark">Nurikabe</h1>
        </div>
        <div className="tagline">Paint the river</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(NKDIFF).map(k => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {NKDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{NKIcon.refresh} New</button>
        <button className="btn" onClick={clearAll}>{NKIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck(a => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{NKIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("nurikabe")}>{NKIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{nkFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{validation.blackCount}</div><div className="lbl">Black</div></div>
        <div className="stat"><div className="num">{R}×{C}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className={"nk-board" + (won ? " won" : "")} style={boardStyle}
            onContextMenu={e => e.preventDefault()}>
            {cells}
          </div>
        </div>
      </div>

      <div className="helpline">
        <b>Left-click</b> (or drag) to paint a cell black. <b>Right-click</b> to mark it white. Black cells must form one connected river — no 2×2 pools. Each number is an island of exactly that many white cells.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? NKIcon.warn : NKIcon.info}{toast.msg}
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
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
              <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Stream complete!</h2>
            <p>Every island is enclosed and the river flows as one.</p>
            <div className="win-stats">
              <div><div className="num">{nkFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{R}×{C}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {NKIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<NurikabeApp />);
