/* ============================================================
   MosaicApp.jsx — Fill-a-Pix: shade cells to match 3×3 clues
   ============================================================ */
const MO = window.Mosaic;
const { useState: moS, useEffect: moE, useRef: moR, useCallback: moC, useLayoutEffect: moL } = React;

const MODIFF = {
  easy:   { label: "Small",  n: 5,  diff: "easy" },
  medium: { label: "Medium", n: 10, diff: "medium" },
  hard:   { label: "Large",  n: 12, diff: "hard" },
};

const MOIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function moFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const moBlank = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const moClone = (g) => g.map((r) => r.slice());

function MosaicApp() {
  const [difficulty, setDifficulty] = moS("easy");
  const [puzzle, setPuzzle] = moS(null);
  const [state, setState] = moS([]);
  const [seconds, setSeconds] = moS(0);
  const [running, setRunning] = moS(false);
  const [autoCheck, setAutoCheck] = moS(true);
  const [flashUntil, setFlashUntil] = moS(0);
  const [won, setWon] = moS(false);
  const [toast, setToast] = moS(null);
  const [motes, setMotes] = moS([]);
  const [loading, setLoading] = moS(false);
  const [cell, setCell] = moS(46);

  const stateRef = moR([]); const wonRef = moR(false);
  const paintRef = moR({ active: false, target: 0 });
  const toastTimer = moR(null);
  moE(() => { stateRef.current = state; }, [state]);
  moE(() => { wonRef.current = won; }, [won]);

  const showToast = moC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = moC((diffKey) => {
    setLoading(true);
    setTimeout(() => {
      const d = MODIFF[diffKey];
      const p = MO.generate(d.n, d.diff);
      const blank = moBlank(p.n);
      stateRef.current = blank;
      setPuzzle(p); setState(blank);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  moE(() => { newPuzzle(difficulty); }, [difficulty]);

  moE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? MO.validate(puzzle, state)
    : { errClue: [], doneClue: [], solved: false, shaded: 0 };
  const showErrors = autoCheck || Date.now() < flashUntil;

  moE(() => {
    if (!puzzle || won) return;
    if (validation.solved) {
      setWon(true); setRunning(false);
      const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
      const arr = [];
      for (let i = 0; i < 80; i++) arr.push({
        id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
        color: colors[i % colors.length], delay: Math.random() * 0.7,
        dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
      });
      setMotes(arr);
    }
  }, [state, puzzle, won]);

  const applyPaint = moC((r, c, target) => {
    const cur = stateRef.current;
    if (cur[r][c] === target) return;
    const ns = moClone(cur); ns[r][c] = target;
    stateRef.current = ns; setState(ns);
    if (!running && !wonRef.current) setRunning(true);
  }, [running]);

  const onPointerDown = moC((e, r, c) => {
    if (wonRef.current) return;
    e.preventDefault();
    const cur = stateRef.current[r][c];
    let target;
    if (e.button === 2 || e.ctrlKey) target = cur === 2 ? 0 : 2;   // right → mark / unmark blank
    else target = cur === 1 ? 0 : 1;                               // left  → shade / unshade
    paintRef.current = { active: true, target };
    applyPaint(r, c, target);
  }, [applyPaint]);

  const onPointerEnter = moC((r, c) => {
    if (!paintRef.current.active || wonRef.current) return;
    applyPaint(r, c, paintRef.current.target);
  }, [applyPaint]);

  moE(() => {
    const up = () => { paintRef.current.active = false; };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);

  const clearAll = moC(() => {
    if (!puzzle) return;
    const blank = moBlank(puzzle.n);
    stateRef.current = blank; setState(blank); setWon(false);
  }, [puzzle]);

  const runCheck = moC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = MO.validate(puzzle, state);
    if (v.solved) return;
    const anyErr = v.errClue.some((row) => row.some(Boolean));
    if (anyErr) showToast("A clue's count can no longer be met — check the red numbers", true);
    else showToast("No mistakes yet — keep going");
  }, [puzzle, state, showToast]);

  moE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  moL(() => {
    if (!puzzle) return;
    const fit = () => {
      const avail = Math.min(560, window.innerWidth - 36);
      const byW = Math.floor(avail / puzzle.n);
      const byH = Math.floor((window.innerHeight - 430) / puzzle.n);
      const lo = puzzle.n >= 15 ? 26 : puzzle.n >= 10 ? 34 : 48;
      const hi = puzzle.n >= 15 ? 40 : puzzle.n >= 10 ? 52 : 78;
      const c = Math.max(lo, Math.min(hi, byW, byH));
      setCell(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Mosaic</h1></div></div>;
  }

  const n = puzzle.n;

  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const st = state[r][c];
      const k = puzzle.clues[r][c];
      const err = showErrors && validation.errClue[r] && validation.errClue[r][c];
      const done = !err && validation.doneClue[r] && validation.doneClue[r][c];
      let cls = "mo-cell";
      if (st === 1) cls += " shaded";
      else if (st === 2) cls += " blank";
      if ((c + 1) % 5 === 0 && c !== n - 1) cls += " major-r";
      if ((r + 1) % 5 === 0 && r !== n - 1) cls += " major-b";
      cells.push(
        <div key={r + "_" + c} className={cls}
          onPointerDown={(e) => onPointerDown(e, r, c)}
          onPointerEnter={() => onPointerEnter(r, c)}>
          {k != null && <span className={"mo-clue" + (err ? " err" : done ? " done" : "")}>{k}</span>}
          {st === 2 && k == null && <span className="mo-x" />}
        </div>
      );
    }
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <rect x="5" y="5" width="34" height="34" rx="6" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <g fill="#283353">
              <rect x="5" y="16" width="11" height="11"/><rect x="16" y="5" width="12" height="11"/>
              <rect x="16" y="27" width="12" height="12"/><rect x="28" y="16" width="11" height="11"/>
            </g>
            <text x="21.5" y="22" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="11" fill="#2f6bff" textAnchor="middle" dominantBaseline="central">4</text>
          </svg>
          <h1 className="wordmark">Mosaic</h1>
        </div>
        <div className="tagline">Count the neighbours</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(MODIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {MODIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{MOIcon.refresh} New</button>
        <button className="btn" onClick={clearAll}>{MOIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{MOIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("mosaic")}>{MOIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{moFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{validation.shaded}</div><div className="lbl">Shaded</div></div>
        <div className="stat"><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="mo-board" style={{ "--cell": cell + "px", gridTemplateColumns: "repeat(" + n + ", var(--cell))" }}
            onContextMenu={(e) => e.preventDefault()}>
            {cells}
          </div>
        </div>
      </div>

      <div className="helpline">
        Each number is how many cells are <b>shaded</b> in the 3×3 block centred on it (itself included). <b>Click or drag</b> to shade; <b>right-click</b> (or Ctrl-click) to mark a cell empty. Shade every cell the clues demand — no more, no less.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? MOIcon.warn : MOIcon.info}{toast.msg}
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
              <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Picture complete!</h2>
            <p>Every clue is satisfied — the mosaic is revealed.</p>
            <div className="win-stats">
              <div><div className="num">{moFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {MOIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MosaicApp />);
