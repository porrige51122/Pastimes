/* ============================================================
   KillerApp.jsx — Killer Sudoku with cage sums and pencil marks
   ============================================================ */
const KL = window.Killer;
const { useState: klS, useEffect: klE, useRef: klR, useCallback: klC, useLayoutEffect: klL } = React;

const KLDIFF = { easy: { label: "Easy" }, medium: { label: "Medium" }, hard: { label: "Hard" } };
const KL_DASH = "1.6px dashed #8a96ac";

const KLIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  erase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 6"/><path d="m18 9-6 6"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function klFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const klClone = (g) => g.map((r) => r.slice());
const klBlankMarks = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Array(9).fill(false)));
const klCloneMarks = (m) => m.map((row) => row.map((cell) => cell.slice()));
const boxOf = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

function KillerApp() {
  const [difficulty, setDifficulty] = klS("easy");
  const [puzzle, setPuzzle] = klS(null);
  const [grid, setGrid] = klS([]);
  const [marks, setMarks] = klS([]);
  const [pencil, setPencil] = klS(false);
  const [sel, setSel] = klS(null);
  const [seconds, setSeconds] = klS(0);
  const [running, setRunning] = klS(false);
  const [autoCheck, setAutoCheck] = klS(true);
  const [flashUntil, setFlashUntil] = klS(0);
  const [won, setWon] = klS(false);
  const [toast, setToast] = klS(null);
  const [motes, setMotes] = klS([]);
  const [loading, setLoading] = klS(false);
  const [cell, setCell] = klS(54);

  const gridRef = klR([]); const marksRef = klR([]); const givenRef = klR([]);
  const wonRef = klR(false); const selRef = klR(null); const pencilRef = klR(false);
  const toastTimer = klR(null);
  klE(() => { gridRef.current = grid; }, [grid]);
  klE(() => { marksRef.current = marks; }, [marks]);
  klE(() => { wonRef.current = won; }, [won]);
  klE(() => { selRef.current = sel; }, [sel]);
  klE(() => { pencilRef.current = pencil; }, [pencil]);

  const showToast = klC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = klC((diff) => {
    setLoading(true);
    setTimeout(() => {
      const p = KL.generate(diff);
      const g = klClone(p.givens);
      const m = klBlankMarks();
      gridRef.current = g; marksRef.current = m; givenRef.current = p.given;
      setPuzzle(p); setGrid(g); setMarks(m); setSel(null);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  klE(() => { newPuzzle(difficulty); }, [difficulty]);

  klE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? KL.validate(puzzle, grid) : { errGrid: [], solved: false, filled: 0 };
  const showErrors = autoCheck || Date.now() < flashUntil;

  klE(() => {
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
  }, [grid, puzzle, won]);

  const setCellVal = klC((r, c, v) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    const cur = gridRef.current;
    const nv = cur[r][c] === v ? 0 : v;
    const g = klClone(cur); g[r][c] = nv;
    gridRef.current = g; setGrid(g);
    const mm = klCloneMarks(marksRef.current);
    mm[r][c] = mm[r][c].map(() => false);
    if (nv !== 0) {
      for (let i = 0; i < 9; i++) { mm[r][i][nv - 1] = false; mm[i][c][nv - 1] = false; }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) mm[br + dr][bc + dc][nv - 1] = false;
    }
    marksRef.current = mm; setMarks(mm);
    if (!running) setRunning(true);
  }, [running]);

  const toggleMark = klC((r, c, v) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    if (gridRef.current[r][c] !== 0) return;
    const mm = klCloneMarks(marksRef.current);
    mm[r][c][v - 1] = !mm[r][c][v - 1];
    marksRef.current = mm; setMarks(mm);
    if (!running) setRunning(true);
  }, [running]);

  const enterDigit = klC((r, c, v) => {
    if (pencilRef.current) toggleMark(r, c, v);
    else setCellVal(r, c, v);
  }, [toggleMark, setCellVal]);

  const clearCell = klC((r, c) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    const g = klClone(gridRef.current); g[r][c] = 0;
    const mm = klCloneMarks(marksRef.current); mm[r][c] = mm[r][c].map(() => false);
    gridRef.current = g; setGrid(g);
    marksRef.current = mm; setMarks(mm);
  }, []);

  klE(() => {
    if (!puzzle) return;
    const onKey = (e) => {
      const s = selRef.current; if (!s) return;
      if (e.key >= "1" && e.key <= "9") { enterDigit(s.r, s.c, +e.key); e.preventDefault(); }
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { clearCell(s.r, s.c); e.preventDefault(); }
      else if (e.key === " " || e.key.toLowerCase() === "p") { setPencil((p) => !p); e.preventDefault(); }
      else if (e.key === "ArrowUp") { setSel({ r: Math.max(0, s.r - 1), c: s.c }); e.preventDefault(); }
      else if (e.key === "ArrowDown") { setSel({ r: Math.min(8, s.r + 1), c: s.c }); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { setSel({ r: s.r, c: Math.max(0, s.c - 1) }); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setSel({ r: s.r, c: Math.min(8, s.c + 1) }); e.preventDefault(); }
      else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puzzle, enterDigit, clearCell]);

  const restart = klC(() => {
    if (!puzzle) return;
    const g = klClone(puzzle.givens);
    const m = klBlankMarks();
    gridRef.current = g; marksRef.current = m;
    setGrid(g); setMarks(m); setWon(false);
  }, [puzzle]);

  const runCheck = klC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = KL.validate(puzzle, grid);
    if (v.solved) return;
    const anyErr = v.errGrid.some((row) => row.some(Boolean));
    if (anyErr) showToast("A digit repeats, or a cage's total is off", true);
    else if (v.filled < 81) showToast("No mistakes yet — keep going");
    else showToast("Looks good so far");
  }, [puzzle, grid, showToast]);

  klE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  klL(() => {
    const fit = () => {
      const avail = Math.min(560, window.innerWidth - 36);
      const byW = Math.floor(avail / 9);
      const byH = Math.floor((window.innerHeight - 470) / 9);
      const c = Math.max(32, Math.min(60, byW, byH));
      setCell(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Killer Sudoku</h1></div></div>;
  }

  const filled = validation.filled;
  const selVal = sel ? grid[sel.r][sel.c] : 0;

  const counts = new Array(10).fill(0);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (grid[r][c]) counts[grid[r][c]]++;

  // cage anchors carry the sum label
  const sumAt = {};
  for (const cage of puzzle.cages) {
    const [ar, ac] = KL.cageAnchor(cage);
    sumAt[ar + "_" + ac] = cage.target;
  }
  const cageOf = puzzle.cageOf;

  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      const isGiven = puzzle.given[r][c];
      const isSel = sel && sel.r === r && sel.c === c;
      const isPeer = sel && !isSel && (sel.r === r || sel.c === c || boxOf(sel.r, sel.c) === boxOf(r, c));
      const sameVal = !isSel && selVal > 0 && v === selVal;
      const err = showErrors && validation.errGrid[r] && validation.errGrid[r][c];
      const cm = marks[r] && marks[r][c];
      const hasMarks = v === 0 && cm && cm.some(Boolean);
      const m = cageOf[r][c];
      let cls = "kl-cell";
      if (isGiven) cls += " given";
      if (isSel) cls += " sel";
      if (isPeer) cls += " peer";
      if (sameVal) cls += " same";
      if (err) cls += " err";
      if (c % 3 === 2 && c !== 8) cls += " box-r";
      if (r % 3 === 2 && r !== 8) cls += " box-b";
      const cageStyle = {
        borderTop: (r === 0 || cageOf[r - 1][c] !== m) ? KL_DASH : "none",
        borderBottom: (r === 8 || cageOf[r + 1][c] !== m) ? KL_DASH : "none",
        borderLeft: (c === 0 || cageOf[r][c - 1] !== m) ? KL_DASH : "none",
        borderRight: (c === 8 || cageOf[r][c + 1] !== m) ? KL_DASH : "none",
      };
      const sum = sumAt[r + "_" + c];
      cells.push(
        <div key={r + "_" + c} className={cls} onClick={() => setSel({ r, c })}>
          <span className="kl-cage" style={cageStyle} />
          {sum != null && <span className="kl-sum">{sum}</span>}
          {v > 0 && <span className="kl-val">{v}</span>}
          {hasMarks && <div className="kl-marks">{cm.map((on, i) => <span key={i}>{on ? i + 1 : ""}</span>)}</div>}
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
          <svg width="38" height="38" viewBox="0 0 44 44">
            <rect x="5" y="5" width="34" height="34" rx="6" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <g stroke="#283353" strokeWidth="1.6" opacity="0.45">
              <line x1="16.3" y1="6" x2="16.3" y2="38"/><line x1="27.6" y1="6" x2="27.6" y2="38"/>
              <line x1="6" y1="16.3" x2="38" y2="16.3"/><line x1="6" y1="27.6" x2="38" y2="27.6"/>
            </g>
            <rect x="8" y="8" width="17" height="11" rx="2" fill="none" stroke="#2f6bff" strokeWidth="1.6" strokeDasharray="2.4 2.2"/>
            <text x="10.5" y="12.5" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="6" fill="#2f6bff">15</text>
          </svg>
          <h1 className="wordmark">Killer Sudoku</h1>
        </div>
        <div className="tagline">Sudoku, plus sums</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(KLDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {KLDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{KLIcon.refresh} New</button>
        <button className="btn" onClick={restart}>{KLIcon.reset} Restart</button>
        <div className={"toggle" + (pencil ? " on" : "")} onClick={() => setPencil((p) => !p)}
             title="Pencil in candidates instead of placing a final number (Space or P)">
          <span className="switch"></span> Pencil
        </div>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{KLIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("killer")}>{KLIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{klFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{filled}/81</div><div className="lbl">Filled</div></div>
        <div className="stat"><div className="num">{KLDIFF[difficulty].label}</div><div className="lbl">Level</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="kl-board" style={{ "--cell": cell + "px" }}>
            {cells}
          </div>
        </div>
      </div>

      <div className={"kl-pad" + (pencil ? " pencil" : "")}>
        {[...Array(9)].map((_, i) => (
          <button key={i} className={"kl-key" + (counts[i + 1] >= 9 ? " full" : "")} disabled={!sel || won}
            onClick={() => sel && enterDigit(sel.r, sel.c, i + 1)}>{i + 1}</button>
        ))}
        <button className="kl-key erase" disabled={!sel || won}
          onClick={() => { if (sel) clearCell(sel.r, sel.c); }}>{KLIcon.erase}</button>
      </div>

      <div className="helpline">
        Fill every <b>row</b>, <b>column</b> and <b>3×3 box</b> with 1–9. Each dashed <b>cage</b> must sum to its corner number, and <b>no digit repeats inside a cage</b>. <b>Click</b> a cell, then type or tap a number. Switch on <b>Pencil</b> (or press <b>Space</b>) to jot candidates.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? KLIcon.warn : KLIcon.info}{toast.msg}
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
            <h2>Solved!</h2>
            <p>Every line, every box and every cage total checks out.</p>
            <div className="win-stats">
              <div><div className="num">{klFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{KLDIFF[difficulty].label}</div><div className="lbl">Level</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {KLIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<KillerApp />);
