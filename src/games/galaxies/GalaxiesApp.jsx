/* ============================================================
   GalaxiesApp.jsx — game shell, state, controls, win
   ============================================================ */
const GLogic = window.Galaxies;
const GalaxiesBoardCmp = window.GalaxiesBoard;
const GPAL = window.GALAXY_PALETTE;
const { useState: useGS, useEffect: useGE, useRef: useGR, useCallback: useGC, useLayoutEffect: useGLE } = React;

const GDIFFS = {
  easy:   { label: "Small",  rows: 5, cols: 5, maxW: 460 },
  medium: { label: "Medium", rows: 6, cols: 6, maxW: 540 },
  hard:   { label: "Large",  rows: 7, cols: 7, maxW: 620 },
};

const GIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function gFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const cloneGrid = (g) => g.map((row) => row.slice());

function GalaxiesApp() {
  const [difficulty, setDifficulty] = useGS("easy");
  const [puzzle, setPuzzle] = useGS(null);
  const [owner, setOwner] = useGS([]);
  const [selectedG, setSelectedG] = useGS(0);
  const [history, setHistory] = useGS([]);
  const [moves, setMoves] = useGS(0);
  const [seconds, setSeconds] = useGS(0);
  const [running, setRunning] = useGS(false);
  const [autoCheck, setAutoCheck] = useGS(false);
  const [flashUntil, setFlashUntil] = useGS(0);
  const [toast, setToast] = useGS(null);
  const [won, setWon] = useGS(false);
  const [motes, setMotes] = useGS([]);
  const [loading, setLoading] = useGS(false);

  const ownerRef = useGR([]);
  const wonRef = useGR(false);
  const puzzleRef = useGR(null);
  const selRef = useGR(0);
  const toastTimer = useGR(null);
  useGE(() => { wonRef.current = won; }, [won]);
  useGE(() => { selRef.current = selectedG; }, [selectedG]);

  const showToast = useGC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = useGC((diff) => {
    const cfg = GDIFFS[diff];
    setLoading(true);
    setTimeout(() => {
      const p = GLogic.generate(cfg);
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const empty = Array.from({ length: p.rows }, () => new Array(p.cols).fill(-1));
      ownerRef.current = empty; puzzleRef.current = p;
      setPuzzle(p); setOwner(empty); setHistory([]); setSelectedG(0);
      setMoves(0); setSeconds(0); setRunning(false);
      setWon(false); setMotes([]); setLoading(false);
    }, 30);
  }, [showToast]);

  useGE(() => { newPuzzle(difficulty); }, [difficulty]);

  useGE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle
    ? GLogic.validate(puzzle, owner)
    : { filled: 0, total: 0, regionStatus: [], cellsByG: [], solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  // dev/test hook
  useGE(() => {
    if (!puzzle) return;
    window.__solveNow = () => {
      const g = cloneGrid(puzzle.solOwner);
      setHistory((h) => [...h, cloneGrid(ownerRef.current)]);
      ownerRef.current = g; setOwner(g); setRunning(true);
    };
  }, [puzzle]);

  // win detection
  useGE(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true); setRunning(false);
      const colors = GPAL.map((p) => p.line);
      const arr = [];
      for (let i = 0; i < 70; i++) arr.push({
        id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
        color: colors[i % colors.length], delay: Math.random() * 0.7,
        dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
      });
      setMotes(arr);
    }
  }, [owner, puzzle, won]);

  const onGestureStart = useGC(() => {
    setHistory((h) => [...h, cloneGrid(ownerRef.current)]);
    setMoves((m) => m + 1);
    if (!running && !wonRef.current) setRunning(true);
  }, [running]);

  const onPaint = useGC((r, c, mode) => {
    if (wonRef.current) return;
    const p = puzzleRef.current;
    const grid = ownerRef.current;
    if (mode === "add") {
      const g = selRef.current;
      const [pr, pc] = GLogic.partner(p.centers[g], r, c);
      if (!GLogic.inGrid(p.rows, p.cols, pr, pc)) return; // can't belong to this galaxy
      grid[r][c] = g; grid[pr][pc] = g;
    } else {
      const g0 = grid[r][c];
      if (g0 < 0) return;
      const [pr, pc] = GLogic.partner(p.centers[g0], r, c);
      grid[r][c] = -1;
      if (GLogic.inGrid(p.rows, p.cols, pr, pc)) grid[pr][pc] = -1;
    }
    ownerRef.current = grid;
    setOwner(cloneGrid(grid));
  }, []);

  const undo = useGC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      ownerRef.current = cloneGrid(prev); setOwner(cloneGrid(prev));
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = useGC(() => {
    const p = puzzleRef.current;
    if (!p) return;
    const empty = Array.from({ length: p.rows }, () => new Array(p.cols).fill(-1));
    setHistory((h) => [...h, cloneGrid(ownerRef.current)]);
    ownerRef.current = empty; setOwner(empty);
  }, []);

  const runCheck = useGC(() => {
    setFlashUntil(Date.now() + 1700);
    const v = GLogic.validate(puzzle, owner);
    if (v.solved) return;
    if (v.filled === 0) { showToast("Tap a dot, then paint its galaxy's cells"); return; }
    const bad = v.regionStatus.filter((s) => s === "bad").length;
    if (bad) showToast(bad + (bad > 1 ? " galaxies aren't" : " galaxy isn't") + " symmetric yet — shown in red", true);
    else if (v.filled < v.total) showToast("Looking good — fill the rest of the grid");
    else showToast("Every cell is filled — check the shapes", true);
  }, [puzzle, owner, showToast]);

  useGE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // fit board to viewport
  const [frameW, setFrameW] = useGS(GDIFFS.easy.maxW);
  useGLE(() => {
    const fit = () => {
      const svg = document.querySelector(".gx-board-svg");
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
      const w = Math.max(220, Math.floor(Math.min(GDIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Galaxies</h1></div></div>;
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="38" height="38" viewBox="0 0 44 44">
            <rect x="4" y="4" width="36" height="36" rx="7" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <path d="M4 16 H40 M4 28 H40 M16 4 V40 M28 4 V40" stroke="#d2dae5" strokeWidth="1.4"/>
            <rect x="4.5" y="4.5" width="11.5" height="11.5" fill="#dce8ff"/>
            <rect x="28" y="28" width="11.5" height="11.5" fill="#dce8ff"/>
            <circle cx="22" cy="22" r="4.6" fill="#fff" stroke="#2f6bff" strokeWidth="2.4"/>
            <circle cx="22" cy="22" r="2.1" fill="#2f6bff"/>
          </svg>
          <h1 className="wordmark">Galaxies</h1>
        </div>
        <div className="tagline">Symmetric regions</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(GDIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {GDIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{GIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{GIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{GIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{GIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("galaxies")}>{GIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{gFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{validation.filled}/{validation.total}</div><div className="lbl">Cells</div></div>
        <div className="stat"><div className="num">{puzzle.centers.length}</div><div className="lbl">Galaxies</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <GalaxiesBoardCmp
            puzzle={puzzle}
            owner={owner}
            selectedG={selectedG}
            validation={validation}
            showErrors={showErrors}
            won={won}
            onGestureStart={onGestureStart}
            onPaint={onPaint}
            onSelect={setSelectedG}
          />
        </div>
      </div>

      <div className="helpline">
        <b>Tap a dot</b> to pick its galaxy, then <b>paint its cells</b> — the symmetric half fills in for you. Each galaxy is one connected shape, identical when spun half-circle around its dot. Right-click clears.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? GIcon.warn : GIcon.info}{toast.msg}
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
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
              <rect x="4" y="4" width="36" height="36" rx="7" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <rect x="4.5" y="4.5" width="11.5" height="11.5" fill="#d8f0e2"/>
              <rect x="28" y="28" width="11.5" height="11.5" fill="#d8f0e2"/>
              <circle cx="22" cy="22" r="4.6" fill="#fff" stroke="#15a05a" strokeWidth="2.4"/>
              <circle cx="22" cy="22" r="2.1" fill="#15a05a"/>
            </svg>
            <h2>Galaxies aligned!</h2>
            <p>Every dot sits at the heart of its own symmetric region — and the whole sky is filled.</p>
            <div className="win-stats">
              <div><div className="num">{gFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{puzzle.centers.length}</div><div className="lbl">Galaxies</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {GIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<GalaxiesApp />);
