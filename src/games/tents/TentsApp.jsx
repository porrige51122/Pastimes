/* ============================================================
   TentsApp.jsx — game shell, state, controls, win
   ============================================================ */
const TentsLogic = window.Tents;
const TentsBoardCmp = window.TentsBoard;
const { useState: useTS, useEffect: useTE, useRef: useTR, useCallback: useTC, useLayoutEffect: useTLE } = React;

const TDIFFS = {
  easy:   { label: "Easy",   rows: 8,  cols: 8,  tents: 10, maxW: 560 },
  medium: { label: "Medium", rows: 12, cols: 12, tents: 20, maxW: 800 },
  hard:   { label: "Hard",   rows: 14, cols: 14, tents: 28, maxW: 940 },
};

const TIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function tFmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

const tBlank = (rows, cols) => {
  const g = [];
  for (let r = 0; r < rows; r++) g.push(new Array(cols).fill(0));
  return g;
};
const tClone = (g) => g.map((row) => row.slice());

function TentsApp() {
  const [difficulty, setDifficulty] = useTS("easy");
  const [puzzle, setPuzzle] = useTS(null);
  const [state, setState] = useTS([]);
  const [history, setHistory] = useTS([]);
  const [moves, setMoves] = useTS(0);
  const [seconds, setSeconds] = useTS(0);
  const [running, setRunning] = useTS(false);
  const [autoCheck, setAutoCheck] = useTS(false);
  const [flashUntil, setFlashUntil] = useTS(0);
  const [toast, setToast] = useTS(null);
  const [won, setWon] = useTS(false);
  const [motes, setMotes] = useTS([]);
  const [loading, setLoading] = useTS(false);
  const [selTree, setSelTree] = useTS(null);   // tree id picked for tying (visual only)
  const [linkMap, setLinkMap] = useTS({});      // treeId -> "r,c" of its tied tent

  const stateRef = useTR([]);
  const dragRef = useTR(null);
  const wonRef = useTR(false);
  const toastTimer = useTR(null);
  const selTreeRef = useTR(null);
  const linkMapRef = useTR({});
  useTE(() => { stateRef.current = state; }, [state]);
  useTE(() => { wonRef.current = won; }, [won]);
  useTE(() => { selTreeRef.current = selTree; }, [selTree]);
  useTE(() => { linkMapRef.current = linkMap; }, [linkMap]);

  const showToast = useTC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = useTC((diff) => {
    const cfg = TDIFFS[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 8) { p = TentsLogic.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const blank = tBlank(p.rows, p.cols);
      stateRef.current = blank;
      setPuzzle(p); setState(blank); setHistory([]);
      setMoves(0); setSeconds(0); setRunning(false);
      setWon(false); setMotes([]); setLoading(false);
      setSelTree(null); setLinkMap({});
    }, 30);
  }, [showToast]);

  useTE(() => { newPuzzle(difficulty); }, [difficulty]);

  // timer
  useTE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle
    ? TentsLogic.validate(puzzle, state)
    : { errGrid: [], rowMet: [], colMet: [], rowOver: [], colOver: [], treeSatisfied: [], solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  // dev/test hook
  useTE(() => {
    if (!puzzle) return;
    window.__solveNow = () => {
      const g = tClone(puzzle.solGrid);
      setHistory((h) => [...h, tClone(stateRef.current)]);
      stateRef.current = g; setState(g); setRunning(true);
    };
  }, [puzzle]);

  // win detection
  useTE(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true); setRunning(false);
      const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
      const arr = [];
      for (let i = 0; i < 70; i++) arr.push({
        id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
        color: colors[i % colors.length], delay: Math.random() * 0.7,
        dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
      });
      setMotes(arr);
    }
  }, [state, puzzle, won]);

  const ensureRunning = useTC(() => { if (!running && !wonRef.current) setRunning(true); }, [running]);

  // ---- pairing aids (visual only — never affects scoring) ----
  const setLink = useTC((treeId, key) => {
    setLinkMap((prev) => {
      const next = {};
      // a tent belongs to at most one tree → drop any tree that owned this tent
      for (const t in prev) { if (prev[t] !== key) next[t] = prev[t]; }
      next[treeId] = key;
      return next;
    });
  }, []);
  const unlink = useTC((treeId) => {
    setLinkMap((prev) => { const n = { ...prev }; delete n[treeId]; return n; });
  }, []);

  // drop any tie whose tent no longer exists (after undo / clear / repaint)
  useTE(() => {
    setLinkMap((prev) => {
      let changed = false; const next = {};
      for (const t in prev) {
        const [r, c] = prev[t].split(",").map(Number);
        if (state[r] && state[r][c] === 1) next[t] = prev[t]; else changed = true;
      }
      return changed ? next : prev;
    });
  }, [state]);

  // Esc clears the picked tree
  useTE(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelTree(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyCell = useTC((r, c, val) => {
    if (puzzle.treeIdAt[r][c] >= 0) return; // never paint on a tree
    const cur = stateRef.current;
    if (cur[r][c] === val) return;
    const n = tClone(cur);
    n[r][c] = val;
    stateRef.current = n;
    setState(n);
    setMoves((m) => m + 1);
    ensureRunning();
  }, [puzzle, ensureRunning]);

  const onBeginDrag = useTC((r, c, button) => {
    if (wonRef.current || !puzzle) return;
    const isTree = puzzle.treeIdAt[r][c] >= 0;

    // LEFT-click a tree → pick / unpick it for tying
    if (button === 0 && isTree) {
      const id = puzzle.treeIdAt[r][c];
      setSelTree((s) => (s === id ? null : id));
      dragRef.current = null;
      return;
    }

    // LEFT-click with a tree picked → tie it to an adjacent square
    if (button === 0 && selTreeRef.current != null) {
      const tid = selTreeRef.current;
      const [tr, tc] = puzzle.trees[tid];
      const adjacent = Math.abs(tr - r) + Math.abs(tc - c) === 1;
      if (adjacent && !isTree) {
        const key = r + "," + c;
        const cur = stateRef.current[r][c];
        if (cur === 1 && linkMapRef.current[tid] === key) {
          unlink(tid); // tap the tied tent again → untie
        } else {
          if (cur !== 1) { setHistory((h) => [...h, tClone(stateRef.current)]); applyCell(r, c, 1); }
          setLink(tid, key);
        }
      }
      setSelTree(null);
      dragRef.current = null;
      return;
    }

    if (isTree) { dragRef.current = null; return; } // right-click on a tree → nothing

    // normal painting
    const cur = stateRef.current[r][c];
    let val;
    if (button === 2) val = cur === 2 ? 0 : 2; // right → grass
    else val = cur === 1 ? 0 : 1;              // left  → tent
    setHistory((h) => [...h, tClone(stateRef.current)]);
    dragRef.current = { val };
    applyCell(r, c, val);
  }, [applyCell, puzzle, setLink, unlink]);

  const onDragOver = useTC((r, c) => {
    if (!dragRef.current || wonRef.current) return;
    applyCell(r, c, dragRef.current.val);
  }, [applyCell]);

  const onEndDrag = useTC(() => { dragRef.current = null; }, []);

  const undo = useTC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      stateRef.current = prev; setState(prev);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = useTC(() => {
    if (!puzzle) return;
    const cur = stateRef.current;
    if (cur.some((row) => row.some((v) => v !== 0))) {
      setHistory((h) => [...h, tClone(cur)]);
      const blank = tBlank(puzzle.rows, puzzle.cols);
      stateRef.current = blank; setState(blank);
    }
  }, [puzzle]);

  const runCheck = useTC(() => {
    setFlashUntil(Date.now() + 1700);
    const v = TentsLogic.validate(puzzle, state);
    if (v.solved) return;
    const tents = state.reduce((a, row) => a + row.reduce((b, x) => b + (x === 1 ? 1 : 0), 0), 0);
    const hasErr = v.errGrid.some((row) => row.some(Boolean));
    const over = v.rowOver.some(Boolean) || v.colOver.some(Boolean);
    if (!tents) showToast("Pitch a tent beside a tree to get started");
    else if (hasErr) showToast("Some tents break the rules — they're marked red", true);
    else if (over) showToast("A row or column has too many tents", true);
    else showToast("No mistakes so far — keep pitching");
  }, [puzzle, state, showToast]);

  useTE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // ---- fit board to viewport ----
  const [frameW, setFrameW] = useTS(TDIFFS.easy.maxW);
  useTLE(() => {
    const fit = () => {
      const svg = document.querySelector(".tn-board-svg");
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
      const w = Math.max(200, Math.floor(Math.min(TDIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Tents</h1></div></div>;
  }

  const tentsPlaced = state.reduce((a, row) => a + row.reduce((b, x) => b + (x === 1 ? 1 : 0), 0), 0);

  // pairing render data (visual only)
  const selTreeRC = selTree != null ? { r: puzzle.trees[selTree][0], c: puzzle.trees[selTree][1] } : null;
  const linkPairs = Object.keys(linkMap).map((tid) => {
    const [tr, tc] = puzzle.trees[tid];
    const [er, ec] = linkMap[tid].split(",").map(Number);
    return { tr, tc, er, ec };
  });
  let linkTargets = [];
  if (selTreeRC) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    linkTargets = dirs
      .map(([dr, dc]) => [selTreeRC.r + dr, selTreeRC.c + dc])
      .filter(([r, c]) => r >= 0 && r < puzzle.rows && c >= 0 && c < puzzle.cols && puzzle.treeIdAt[r][c] < 0);
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
            <rect x="6.5" y="22" width="2.6" height="6" rx="1" fill="#9a6533"/>
            <circle cx="7.8" cy="17" r="6.2" fill="#2f9e63"/>
            <polygon points="30,11 39,32 21,32" fill="#2f6bff"/>
            <polygon points="30,11 33,32 27,32" fill="#1b49ad"/>
          </svg>
          <h1 className="wordmark">Tents</h1>
        </div>
        <div className="tagline">Pitch a tent by every tree</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(TDIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {TDIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{TIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{TIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{TIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{TIcon.check} Check</button>}
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{tFmtTime(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{tentsPlaced}/{puzzle.trees.length}</div><div className="lbl">Tents</div></div>
        <div className="stat"><div className="num">{puzzle.rows}×{puzzle.cols}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <TentsBoardCmp
            puzzle={puzzle}
            state={state}
            validation={validation}
            showErrors={showErrors}
            won={won}
            links={linkPairs}
            selTreeRC={selTreeRC}
            linkTargets={linkTargets}
            onBeginDrag={onBeginDrag}
            onDragOver={onDragOver}
            onEndDrag={onEndDrag}
          />
        </div>
      </div>

      <div className="helpline">
        <b>Click</b> a square to pitch a tent; <b>right-click</b> to mark grass. Tents never touch — not even diagonally — and the clues count the tents in each line. <b>Click a tree</b>, then an adjacent square, to tie its tent — a personal aid for working out which tree owns which tent.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? TIcon.warn : TIcon.info}{toast.msg}
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
              <rect x="6" y="6" width="32" height="32" rx="9" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <polygon points="22,13 31,30 13,30" fill="#15a05a"/>
              <polygon points="22,13 25,30 19,30" fill="#0f7e46"/>
            </svg>
            <h2>Camp's set!</h2>
            <p>Every tree has its tent — and not one of them touches.</p>
            <div className="win-stats">
              <div><div className="num">{tFmtTime(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{puzzle.trees.length}</div><div className="lbl">Tents</div></div>
            </div>
            <button className="btn primary" style={{fontSize:15, padding:"12px 22px"}} onClick={() => newPuzzle(difficulty)}>
              {TIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<TentsApp />);
