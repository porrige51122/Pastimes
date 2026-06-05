/* ============================================================
   PicrossApp.jsx — game shell, state, controls, win
   ============================================================ */
const Picross = window.Picross;
const PicrossBoardCmp = window.PicrossBoard;
const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React;

const PDIFFS = {
  easy:   { label: "Easy",   rows: 5,  cols: 5,  density: 0.58, maxW: 720 },
  medium: { label: "Medium", rows: 10, cols: 10, density: 0.55, maxW: 980 },
  hard:   { label: "Hard",   rows: 15, cols: 15, density: 0.52, maxW: 1200 },
};

/* ---- tiny inline icons ---- */
const PIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function pFmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

const blankGrid = (rows, cols) => {
  const g = [];
  for (let r = 0; r < rows; r++) g.push(new Array(cols).fill(0));
  return g;
};
const cloneGrid = (g) => g.map((row) => row.slice());

function PicrossApp() {
  const [difficulty, setDifficulty] = useState("easy");
  const [puzzle, setPuzzle] = useState(null);
  const [state, setState] = useState([]);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [flashUntil, setFlashUntil] = useState(0);
  const [toast, setToast] = useState(null);
  const [won, setWon] = useState(false);
  const [motes, setMotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const stateRef = useRef([]);
  const dragRef = useRef(null);
  const wonRef = useRef(false);
  const toastTimer = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { wonRef.current = won; }, [won]);

  const showToast = useCallback((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = useCallback((diff) => {
    const cfg = PDIFFS[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 5) { p = Picross.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const blank = blankGrid(p.rows, p.cols);
      stateRef.current = blank;
      setPuzzle(p);
      setState(blank);
      setHistory([]);
      setMoves(0);
      setSeconds(0);
      setRunning(false);
      setWon(false);
      setMotes([]);
      setLoading(false);
    }, 30);
  }, [showToast]);

  useEffect(() => { newPuzzle(difficulty); }, [difficulty]);

  // timer
  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? Picross.validate(puzzle, state) : { errGrid: [], solved: false, errors: 0, correct: 0, totalFill: 0 };
  const showErrors = autoCheck || Date.now() < flashUntil;

  // dev/test hook: fill the solution
  useEffect(() => {
    if (!puzzle) return;
    window.__solveNow = () => {
      const g = puzzle.solution.map((row) => row.map((v) => (v ? 1 : 0)));
      setHistory((h) => [...h, cloneGrid(stateRef.current)]);
      stateRef.current = g;
      setState(g);
      setRunning(true);
    };
  }, [puzzle]);

  // win detection
  useEffect(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true);
      setRunning(false);
      const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
      const arr = [];
      for (let i = 0; i < 70; i++) {
        arr.push({
          id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
          color: colors[i % colors.length], delay: Math.random() * 0.7,
          dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
        });
      }
      setMotes(arr);
    }
  }, [state, puzzle, won]);

  const ensureRunning = useCallback(() => {
    if (!running && !wonRef.current) setRunning(true);
  }, [running]);

  const applyCell = useCallback((r, c, val) => {
    const cur = stateRef.current;
    if (cur[r][c] === val) return;
    const n = cloneGrid(cur);
    n[r][c] = val;
    stateRef.current = n;
    setState(n);
    setMoves((m) => m + 1);
    ensureRunning();
  }, [ensureRunning]);

  const onBeginDrag = useCallback((r, c, button) => {
    if (wonRef.current) return;
    const cur = stateRef.current[r][c];
    let val;
    if (button === 2) val = cur === 2 ? 0 : 2;       // right click: X
    else val = cur === 1 ? 0 : 1;                    // left click: fill
    setHistory((h) => [...h, cloneGrid(stateRef.current)]);
    dragRef.current = { val };
    applyCell(r, c, val);
  }, [applyCell]);

  const onDragOver = useCallback((r, c) => {
    if (!dragRef.current || wonRef.current) return;
    applyCell(r, c, dragRef.current.val);
  }, [applyCell]);

  const onEndDrag = useCallback(() => { dragRef.current = null; }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      stateRef.current = prev;
      setState(prev);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = useCallback(() => {
    if (!puzzle) return;
    const cur = stateRef.current;
    if (cur.some((row) => row.some((v) => v !== 0))) {
      setHistory((h) => [...h, cloneGrid(cur)]);
      const blank = blankGrid(puzzle.rows, puzzle.cols);
      stateRef.current = blank;
      setState(blank);
    }
  }, [puzzle]);

  const runCheck = useCallback(() => {
    setFlashUntil(Date.now() + 1700);
    const v = Picross.validate(puzzle, state);
    if (v.solved) return;
    const placed = state.some((row) => row.some((c) => c === 1));
    if (!placed) showToast("Use the number clues — click cells to fill them in");
    else if (v.errors) showToast(v.errors + (v.errors > 1 ? " filled cells don't" : " filled cell doesn't") + " belong — they're marked red", true);
    else showToast("No mistakes so far — keep filling");
  }, [puzzle, state, showToast]);

  // re-render tick so the flash window expiry updates colours
  useEffect(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // ---- fit the board to the viewport so it never needs scrolling ----
  const [frameW, setFrameW] = useState(PDIFFS.easy.maxW);
  useLayoutEffect(() => {
    const fit = () => {
      const svg = document.querySelector(".pic-board-svg");
      if (!svg || !svg.viewBox || !svg.viewBox.baseVal.width) return;
      const A = svg.viewBox.baseVal.width / svg.viewBox.baseVal.height;
      const frame = svg.closest(".board-frame");
      if (!frame) return;
      const help = document.querySelector(".helpline");
      const topOffset = frame.getBoundingClientRect().top + window.scrollY;
      const belowReserve = (help ? help.offsetHeight : 50) + 12 + 24 + 8;
      const availH = window.innerHeight - topOffset - belowReserve;
      const padH = 35, padV = 35;
      const wByHeight = (availH - padV) * A + padH;
      const wByWidth = window.innerWidth - 24;
      const w = Math.max(160, Math.floor(Math.min(PDIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  // per-line completion for clue greying
  let rowDone = [], colDone = [];
  if (puzzle) {
    rowDone = puzzle.rowClues.map((cl, r) =>
      Picross.lineComplete(state[r].map((v) => v === 1), cl));
    colDone = puzzle.colClues.map((cl, c) => {
      const col = [];
      for (let r = 0; r < puzzle.rows; r++) col.push(state[r][c] === 1);
      return Picross.lineComplete(col, cl);
    });
  }

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Hatch</h1></div></div>;
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="36" height="36" viewBox="0 0 44 44">
            <rect x="6" y="6" width="32" height="32" rx="5" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <rect x="6" y="6" width="16" height="16" fill="#283353"/>
            <rect x="22" y="22" width="16" height="16" fill="#2f6bff"/>
          </svg>
          <h1 className="wordmark">Hatch</h1>
        </div>
        <div className="tagline">Paint the grid by numbers</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(PDIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {PDIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>
          {PIcon.refresh} New
        </button>
        <button className="btn" onClick={undo} disabled={!history.length}>{PIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{PIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{PIcon.check} Check</button>}
      <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("hatch")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg> Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{pFmtTime(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{moves}</div><div className="lbl">Moves</div></div>
        <div className="stat"><div className="num">{puzzle.rows}×{puzzle.cols}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <PicrossBoardCmp
            puzzle={puzzle}
            state={state}
            errGrid={validation.errGrid}
            showErrors={showErrors}
            won={won}
            rowDone={rowDone}
            colDone={colDone}
            onBeginDrag={onBeginDrag}
            onDragOver={onDragOver}
            onEndDrag={onEndDrag}
          />
        </div>
      </div>

      <div className="helpline">
        Clues give the lengths of the filled runs in each line, in order. <b>Click or drag</b> to fill cells; <b>right-click</b> to mark a blank with ×.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? PIcon.warn : PIcon.info}{toast.msg}
          </div>
        </div>
      )}

      {motes.map((m) => (
        <div key={m.id} className="mote" style={{
          left: m.left + "vw", width: m.size, height: m.size * 0.6,
          background: m.color, transform: "rotate(" + m.rot + "deg)",
          animationDuration: m.dur + "s", animationDelay: m.delay + "s",
        }} />
      ))}

      {won && (
        <div className="win-overlay">
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{margin:"0 auto"}}>
              <rect x="6" y="6" width="32" height="32" rx="5" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <rect x="6" y="6" width="16" height="16" fill="#15a05a"/>
              <rect x="22" y="22" width="16" height="16" fill="#2f6bff"/>
            </svg>
            <h2>Solved!</h2>
            <p>You revealed the hidden picture.</p>
            <div className="win-stats">
              <div><div className="num">{pFmtTime(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Moves</div></div>
            </div>
            <button className="btn primary" style={{fontSize:15, padding:"12px 22px"}} onClick={() => newPuzzle(difficulty)}>
              {PIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PicrossApp />);
