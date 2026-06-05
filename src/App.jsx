/* ============================================================
   App.jsx — game shell, state, controls, win
   ============================================================ */
const Hashi = window.Hashi;
const BoardCmp = window.Board;
const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React;

const DIFFS = {
  easy:   { label: "Easy",   rows: 7,  cols: 7,  islands: 9,  maxW: 720  },
  medium: { label: "Medium", rows: 9,  cols: 9,  islands: 16, maxW: 980  },
  hard:   { label: "Hard",   rows: 11, cols: 11, islands: 24, maxW: 1200 },
};

function edgeMapOf(puzzle) {
  const m = {};
  puzzle.edges.forEach((e, i) => { m[e.a + "-" + e.b] = i; });
  return m;
}

/* ---- tiny inline icons ---- */
const Icon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

function App() {
  const [difficulty, setDifficulty] = useState("easy");
  const [puzzle, setPuzzle] = useState(null);
  const [crosses, setCrosses] = useState([]);
  const [counts, setCounts] = useState([]);
  const [selected, setSelected] = useState(null);
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

  const edgeMap = useRef({});
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = useCallback((diff) => {
    const cfg = DIFFS[diff];
    setLoading(true);
    // generate (sync, fast) — defer a tick so loading paints
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 4) { p = Hashi.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      edgeMap.current = edgeMapOf(p);
      setPuzzle(p);
      setCrosses(Hashi.computeCrossings(p.edges, p.islands));
      setCounts(new Array(p.edges.length).fill(0));
      setSelected(null);
      setHistory([]);
      setMoves(0);
      setSeconds(0);
      setRunning(false);
      setWon(false);
      setMotes([]);
      setLoading(false);
    }, 30);
  }, [showToast]);

  // init + difficulty change
  useEffect(() => { newPuzzle(difficulty); }, [difficulty]);

  // timer
  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? Hashi.validate(puzzle, counts) : { islandStatus: [], deg: [], solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  // dev/test hook: instantly fill the solution
  useEffect(() => {
    if (!puzzle) return;
    window.__solveNow = () => {
      setHistory((h) => [...h, counts.slice()]);
      setCounts(puzzle.solution.slice());
      setRunning(true);
    };
  }, [puzzle, counts]);

  // win detection
  useEffect(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true);
      setRunning(false);
      setSelected(null);
      // confetti
      const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
      const arr = [];
      for (let i = 0; i < 70; i++) {
        arr.push({
          id: i,
          left: Math.random() * 100,
          size: 7 + Math.random() * 9,
          color: colors[i % colors.length],
          delay: Math.random() * 0.7,
          dur: 2.4 + Math.random() * 2.2,
          rot: Math.random() * 360,
        });
      }
      setMotes(arr);
    }
  }, [counts, puzzle, won]);

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h, counts.slice()]);
  }, [counts]);

  const ensureRunning = useCallback(() => {
    if (!running && !won) setRunning(true);
  }, [running, won]);

  const setEdge = useCallback((ei, val) => {
    setHistory((h) => [...h, counts.slice()]);
    setCounts((cs) => { const n = cs.slice(); n[ei] = val; return n; });
    setMoves((m) => m + 1);
    ensureRunning();
  }, [counts, ensureRunning]);

  // returns true if a bridge was added/maxed (consume), false if illegal target
  const tryBuild = useCallback((a, b) => {
    if (a === b) return "self";
    const ei = edgeMap.current[Math.min(a, b) + "-" + Math.max(a, b)];
    if (ei === undefined) {
      showToast("No straight line between those islands", true);
      return "illegal";
    }
    const cur = counts[ei] || 0;
    if (cur >= 2) {
      showToast("That link already has two bridges — click it to remove", true);
      return "done";
    }
    // crossing check
    const cr = crosses[ei] || [];
    for (let k = 0; k < cr.length; k++) {
      if ((counts[cr[k]] || 0) > 0) {
        showToast("A bridge already crosses there", true);
        return "done";
      }
    }
    setEdge(ei, cur + 1);
    return "built";
  }, [counts, crosses, setEdge, showToast]);

  const onIslandClick = useCallback((id) => {
    if (won) return;
    if (id == null) { setSelected(null); return; }
    if (selected == null) { setSelected(id); return; }
    if (selected === id) { setSelected(null); return; }
    const res = tryBuild(selected, id);
    if (res === "illegal") { setSelected(id); }   // chain from the new island
    else { setSelected(null); }
  }, [won, selected, tryBuild]);

  const onEdgeClick = useCallback((ei) => {
    if (won) return;
    const cur = counts[ei] || 0;
    if (cur <= 0) return;
    setEdge(ei, cur - 1);   // click a bridge to remove one span
    setSelected(null);
  }, [won, counts, setEdge]);

  const onEdgeRightClick = useCallback((ei) => {
    if (won) return;
    if ((counts[ei] || 0) === 0) return;
    setEdge(ei, 0);
    setSelected(null);
  }, [won, counts, setEdge]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setCounts(prev);
      setSelected(null);
      return h.slice(0, -1);
    });
  }, []);

  const reset = useCallback(() => {
    if (!puzzle) return;
    if (counts.some((c) => c > 0)) {
      setHistory((h) => [...h, counts.slice()]);
      setCounts(new Array(puzzle.edges.length).fill(0));
    }
    setSelected(null);
  }, [puzzle, counts]);

  const runCheck = useCallback(() => {
    setFlashUntil(Date.now() + 1700);
    setTimeout(() => setFlashUntil((f) => f), 1750); // force re-render after flash
    const v = Hashi.validate(puzzle, counts);
    if (v.solved) return; // win effect handles it
    const over = v.islandStatus.filter((s) => s === "over").length;
    const placed = counts.some((c) => c > 0);
    if (!placed) showToast("Tap an island, then a neighbour, to lay a bridge");
    else if (over) showToast(over + (over > 1 ? " islands have" : " island has") + " too many bridges", true);
    else if (v.allMatch && !v.connected) showToast("All counts match — but the islands aren't all connected yet", true);
    else showToast("Looking good — keep going");
  }, [puzzle, counts, showToast]);

  // re-render tick so flash window expiry updates colours
  useEffect(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f - 0), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // ---- fit the board to the viewport so it never needs scrolling ----
  const [frameW, setFrameW] = useState(DIFFS.easy.maxW);
  useLayoutEffect(() => {
    const fit = () => {
      const svg = document.querySelector(".board-svg");
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
      const w = Math.max(160, Math.floor(Math.min(DIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Crossings</h1></div></div>;
  }

  return (
    <div className="wrap">
      <a className="backlink" href="index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="36" height="36" viewBox="0 0 44 44">
            <line x1="9" y1="22" x2="35" y2="22" stroke="#2b3550" strokeWidth="3" strokeLinecap="round"/>
            <line x1="9" y1="16" x2="35" y2="16" stroke="#2b3550" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="9" cy="19" r="8" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <circle cx="35" cy="19" r="8" fill="#2f6bff" stroke="#283353" strokeWidth="2.5"/>
          </svg>
          <h1 className="wordmark">Crossings</h1>
        </div>
        <div className="tagline">Connect every island</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(DIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {DIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>
          {Icon.refresh} New
        </button>
        <button className="btn" onClick={undo} disabled={!history.length}>{Icon.undo} Undo</button>
        <button className="btn" onClick={reset}>{Icon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{Icon.check} Check</button>}
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{fmtTime(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{moves}</div><div className="lbl">Moves</div></div>
        <div className="stat"><div className="num">{puzzle.islands.length}</div><div className="lbl">Islands</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <BoardCmp
            puzzle={puzzle}
            counts={counts}
            validation={validation}
            selected={selected}
            showErrors={showErrors}
            won={won}
            onIslandClick={onIslandClick}
            onEdgeClick={onEdgeClick}
            onEdgeRightClick={onEdgeRightClick}
          />
        </div>
      </div>

      <div className="helpline">
        Tap an <b>island</b>, then a neighbour, to lay a bridge — tap again for a second. <b>Click a bridge</b> to remove it. Join every island into one connected network.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? Icon.warn : Icon.info}{toast.msg}
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
        <div className="win-overlay" onClick={() => {}}>
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{margin:"0 auto"}}>
              <line x1="9" y1="22" x2="35" y2="22" stroke="#2f6bff" strokeWidth="3.4" strokeLinecap="round"/>
              <line x1="9" y1="15" x2="35" y2="15" stroke="#2f6bff" strokeWidth="3.4" strokeLinecap="round"/>
              <circle cx="9" cy="18.5" r="8.5" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <circle cx="35" cy="18.5" r="8.5" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
            </svg>
            <h2>Solved!</h2>
            <p>Every island is connected into one network.</p>
            <div className="win-stats">
              <div><div className="num">{fmtTime(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Moves</div></div>
            </div>
            <button className="btn primary" style={{fontSize:15, padding:"12px 22px"}} onClick={() => newPuzzle(difficulty)}>
              {Icon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
