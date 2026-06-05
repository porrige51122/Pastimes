/* ============================================================
   ShikakuApp.jsx — game shell, state, controls, win
   ============================================================ */
const ShikakuLogic = window.Shikaku;
const ShikakuBoardCmp = window.ShikakuBoard;
const { useState: useKS, useEffect: useKE, useRef: useKR, useCallback: useKC, useLayoutEffect: useKLE } = React;

const KDIFFS = {
  easy:   { label: "Easy",   rows: 7,  cols: 7,  maxDim: 4, maxArea: 9,  maxW: 560 },
  medium: { label: "Medium", rows: 10, cols: 10, maxDim: 4, maxArea: 12, maxW: 720 },
  hard:   { label: "Hard",   rows: 13, cols: 13, maxDim: 5, maxArea: 12, maxW: 880 },
};

const KIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function kFmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

const overlaps = (a, b) => !(
  a.c0 + a.w - 1 < b.c0 || b.c0 + b.w - 1 < a.c0 ||
  a.r0 + a.h - 1 < b.r0 || b.r0 + b.h - 1 < a.r0
);
const covers = (R, r, c) => r >= R.r0 && r < R.r0 + R.h && c >= R.c0 && c < R.c0 + R.w;

function ShikakuApp() {
  const [difficulty, setDifficulty] = useKS("easy");
  const [puzzle, setPuzzle] = useKS(null);
  const [rects, setRects] = useKS([]);
  const [history, setHistory] = useKS([]);
  const [moves, setMoves] = useKS(0);
  const [seconds, setSeconds] = useKS(0);
  const [running, setRunning] = useKS(false);
  const [autoCheck, setAutoCheck] = useKS(false);
  const [flashUntil, setFlashUntil] = useKS(0);
  const [toast, setToast] = useKS(null);
  const [won, setWon] = useKS(false);
  const [motes, setMotes] = useKS([]);
  const [loading, setLoading] = useKS(false);

  const rectsRef = useKR([]);
  const wonRef = useKR(false);
  const toastTimer = useKR(null);
  useKE(() => { rectsRef.current = rects; }, [rects]);
  useKE(() => { wonRef.current = won; }, [won]);

  const showToast = useKC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = useKC((diff) => {
    const cfg = KDIFFS[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 10) { p = ShikakuLogic.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      rectsRef.current = [];
      setPuzzle(p); setRects([]); setHistory([]);
      setMoves(0); setSeconds(0); setRunning(false);
      setWon(false); setMotes([]); setLoading(false);
    }, 30);
  }, [showToast]);

  useKE(() => { newPuzzle(difficulty); }, [difficulty]);

  useKE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle
    ? ShikakuLogic.validate(puzzle, rects)
    : { cover: [], rectStatus: [], filled: 0, total: 0, solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  // dev/test hook
  useKE(() => {
    if (!puzzle) return;
    window.__solveNow = () => {
      const g = puzzle.solRects.map((R) => ({ r0: R.r0, c0: R.c0, w: R.w, h: R.h }));
      setHistory((h) => [...h, rectsRef.current.slice()]);
      rectsRef.current = g; setRects(g); setRunning(true);
    };
  }, [puzzle]);

  // win detection
  useKE(() => {
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
  }, [rects, puzzle, won]);

  const commit = useKC((next) => {
    setHistory((h) => [...h, rectsRef.current.slice()]);
    rectsRef.current = next;
    setRects(next);
    setMoves((m) => m + 1);
    if (!running && !wonRef.current) setRunning(true);
  }, [running]);

  const onDraw = useKC((top, left, bottom, right) => {
    if (wonRef.current || !puzzle) return;
    const cur = rectsRef.current;
    const single = top === bottom && left === right;
    if (single) {
      const idx = cur.findIndex((R) => covers(R, top, left));
      if (idx >= 0) { commit(cur.filter((_, i) => i !== idx)); return; } // tap a box to remove it
      commit([...cur, { r0: top, c0: left, w: 1, h: 1 }]);               // tap empty → 1×1
      return;
    }
    const nr = { r0: top, c0: left, w: right - left + 1, h: bottom - top + 1 };
    commit([...cur.filter((R) => !overlaps(R, nr)), nr]);                 // replace overlaps
  }, [puzzle, commit]);

  const undo = useKC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      rectsRef.current = prev; setRects(prev);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = useKC(() => {
    if (rectsRef.current.length) {
      setHistory((h) => [...h, rectsRef.current.slice()]);
      rectsRef.current = []; setRects([]);
    }
  }, []);

  const runCheck = useKC(() => {
    setFlashUntil(Date.now() + 1700);
    const v = ShikakuLogic.validate(puzzle, rects);
    if (v.solved) return;
    if (!rects.length) { showToast("Drag around a number to box it in"); return; }
    const bad = v.rectStatus.filter((s) => s === "bad").length;
    if (bad) showToast(bad + (bad > 1 ? " boxes don't" : " box doesn't") + " match their number — shown in red", true);
    else if (v.filled < v.total) showToast("No mistakes yet — keep boxing in the rest");
    else showToast("Every cell is boxed — check the counts", true);
  }, [puzzle, rects, showToast]);

  useKE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // fit board to viewport
  const [frameW, setFrameW] = useKS(KDIFFS.easy.maxW);
  useKLE(() => {
    const fit = () => {
      const svg = document.querySelector(".sk-board-svg");
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
      const w = Math.max(200, Math.floor(Math.min(KDIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Shikaku</h1></div></div>;
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
            <rect x="5" y="5" width="20" height="34" rx="3" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <rect x="25" y="5" width="14" height="14" rx="3" fill="#e6eeff" stroke="#283353" strokeWidth="2.5"/>
            <rect x="25" y="19" width="14" height="20" rx="3" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <text x="15" y="23" textAnchor="middle" dominantBaseline="central" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="15" fill="#2f6bff">6</text>
          </svg>
          <h1 className="wordmark">Shikaku</h1>
        </div>
        <div className="tagline">Divide into rectangles</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(KDIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {KDIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{KIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{KIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{KIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{KIcon.check} Check</button>}
      <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("shikaku")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg> Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{kFmtTime(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{rects.length}/{puzzle.clues.length}</div><div className="lbl">Boxes</div></div>
        <div className="stat"><div className="num">{puzzle.rows}×{puzzle.cols}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <ShikakuBoardCmp
            puzzle={puzzle}
            rects={rects}
            validation={validation}
            showErrors={showErrors}
            won={won}
            onDraw={onDraw}
          />
        </div>
      </div>

      <div className="helpline">
        <b>Drag</b> across the grid to box a rectangle around a number — its area must equal that number. <b>Tap a box</b> to remove it. Every cell ends up inside exactly one rectangle.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? KIcon.warn : KIcon.info}{toast.msg}
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
              <rect x="5" y="6" width="20" height="32" rx="3" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <rect x="25" y="6" width="14" height="14" rx="3" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <rect x="25" y="20" width="14" height="18" rx="3" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
            </svg>
            <h2>Perfectly divided!</h2>
            <p>Every number sits in its own rectangle — and the whole grid is covered.</p>
            <div className="win-stats">
              <div><div className="num">{kFmtTime(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{puzzle.clues.length}</div><div className="lbl">Boxes</div></div>
            </div>
            <button className="btn primary" style={{fontSize:15, padding:"12px 22px"}} onClick={() => newPuzzle(difficulty)}>
              {KIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ShikakuApp />);
