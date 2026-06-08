/* ============================================================
   KenKenApp.jsx — KenKen / Calcudoku with pencil marks
   ============================================================ */
const KK = window.KenKen;
const { useState: kkS, useEffect: kkE, useRef: kkR, useCallback: kkC, useLayoutEffect: kkL } = React;

const KKDIFF = {
  easy:   { label: "Easy",   n: 4 },
  medium: { label: "Medium", n: 5 },
  hard:   { label: "Hard",   n: 6 },
};

const KKIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  erase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 6"/><path d="m18 9-6 6"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function kkFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const kkBlank = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const kkClone = (g) => g.map((r) => r.slice());
const kkBlankMarks = (n) => Array.from({ length: n }, () => Array.from({ length: n }, () => new Array(n).fill(false)));
const kkCloneMarks = (m) => m.map((row) => row.map((cell) => cell.slice()));

function KenKenApp() {
  const [difficulty, setDifficulty] = kkS("easy");
  const [puzzle, setPuzzle] = kkS(null);
  const [grid, setGrid] = kkS([]);
  const [marks, setMarks] = kkS([]);
  const [pencil, setPencil] = kkS(false);
  const [sel, setSel] = kkS(null);
  const [seconds, setSeconds] = kkS(0);
  const [running, setRunning] = kkS(false);
  const [autoCheck, setAutoCheck] = kkS(true);
  const [flashUntil, setFlashUntil] = kkS(0);
  const [won, setWon] = kkS(false);
  const [toast, setToast] = kkS(null);
  const [motes, setMotes] = kkS([]);
  const [loading, setLoading] = kkS(false);
  const [cell, setCell] = kkS(64);

  const gridRef = kkR([]); const wonRef = kkR(false); const selRef = kkR(null);
  const marksRef = kkR([]); const pencilRef = kkR(false);
  const toastTimer = kkR(null);
  kkE(() => { gridRef.current = grid; }, [grid]);
  kkE(() => { wonRef.current = won; }, [won]);
  kkE(() => { selRef.current = sel; }, [sel]);
  kkE(() => { marksRef.current = marks; }, [marks]);
  kkE(() => { pencilRef.current = pencil; }, [pencil]);

  const showToast = kkC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = kkC((diff) => {
    setLoading(true);
    setTimeout(() => {
      const p = KK.generate(KKDIFF[diff].n);
      const blank = kkBlank(p.n);
      const blankM = kkBlankMarks(p.n);
      gridRef.current = blank; marksRef.current = blankM;
      setPuzzle(p); setGrid(blank); setMarks(blankM); setSel(null);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  kkE(() => { newPuzzle(difficulty); }, [difficulty]);

  kkE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? KK.validate(puzzle, grid) : { errGrid: [], solved: false, filled: 0 };
  const showErrors = autoCheck || Date.now() < flashUntil;

  kkE(() => {
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

  const setCellVal = kkC((r, c, v) => {
    if (wonRef.current) return;
    const cur = gridRef.current;
    const nv = cur[r][c] === v ? 0 : v;
    if (cur[r][c] === nv) return;
    const g = kkClone(cur); g[r][c] = nv;
    gridRef.current = g; setGrid(g);
    if (nv !== 0) {
      const mm = kkCloneMarks(marksRef.current);
      mm[r][c] = mm[r][c].map(() => false);
      marksRef.current = mm; setMarks(mm);
    }
    if (!running) setRunning(true);
  }, [running]);

  const toggleMark = kkC((r, c, v) => {
    if (wonRef.current) return;
    if (gridRef.current[r][c] !== 0) return;
    const mm = kkCloneMarks(marksRef.current);
    mm[r][c][v - 1] = !mm[r][c][v - 1];
    marksRef.current = mm; setMarks(mm);
    if (!running) setRunning(true);
  }, [running]);

  const enterDigit = kkC((r, c, v) => {
    if (pencilRef.current) toggleMark(r, c, v);
    else setCellVal(r, c, v);
  }, [toggleMark, setCellVal]);

  const clearCell = kkC((r, c) => {
    if (wonRef.current) return;
    const g = kkClone(gridRef.current); g[r][c] = 0;
    const mm = kkCloneMarks(marksRef.current); mm[r][c] = mm[r][c].map(() => false);
    gridRef.current = g; setGrid(g);
    marksRef.current = mm; setMarks(mm);
  }, []);

  kkE(() => {
    if (!puzzle) return;
    const onKey = (e) => {
      const s = selRef.current; if (!s) return;
      const n = puzzle.n;
      if (e.key >= "1" && e.key <= String(n)) { enterDigit(s.r, s.c, +e.key); e.preventDefault(); }
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { clearCell(s.r, s.c); e.preventDefault(); }
      else if (e.key === " " || e.key.toLowerCase() === "p") { setPencil((p) => !p); e.preventDefault(); }
      else if (e.key === "ArrowUp") { setSel({ r: Math.max(0, s.r - 1), c: s.c }); e.preventDefault(); }
      else if (e.key === "ArrowDown") { setSel({ r: Math.min(n - 1, s.r + 1), c: s.c }); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { setSel({ r: s.r, c: Math.max(0, s.c - 1) }); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setSel({ r: s.r, c: Math.min(n - 1, s.c + 1) }); e.preventDefault(); }
      else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [puzzle, enterDigit, clearCell]);

  const clearAll = kkC(() => {
    if (!puzzle) return;
    const blank = kkBlank(puzzle.n);
    const blankM = kkBlankMarks(puzzle.n);
    gridRef.current = blank; setGrid(blank);
    marksRef.current = blankM; setMarks(blankM);
    setWon(false);
  }, [puzzle]);

  const runCheck = kkC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = KK.validate(puzzle, grid);
    if (v.solved) return;
    const anyErr = v.errGrid.some((row) => row.some(Boolean));
    if (anyErr) showToast("A number repeats in a line, or a cage's total is wrong", true);
    else if (v.filled < puzzle.n * puzzle.n) showToast("No mistakes yet — keep going");
    else showToast("Looks good so far");
  }, [puzzle, grid, showToast]);

  kkE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  kkL(() => {
    if (!puzzle) return;
    const fit = () => {
      const avail = Math.min(540, window.innerWidth - 40);
      const byW = Math.floor(avail / puzzle.n);
      const byH = Math.floor((window.innerHeight - 470) / puzzle.n);
      const c = Math.max(40, Math.min(76, byW, byH));
      setCell(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">KenKen</h1></div></div>;
  }

  const n = puzzle.n;
  const filled = validation.filled;
  const selVal = sel ? grid[sel.r][sel.c] : 0;

  // anchor cell (top-left-most) of every cage carries its clue
  const anchorClue = {};
  for (const cage of puzzle.cages) {
    let best = cage.cells[0];
    for (const [r, c] of cage.cells) if (r < best[0] || (r === best[0] && c < best[1])) best = [r, c];
    anchorClue[best[0] + "_" + best[1]] = KK.clueText(cage);
  }

  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      const isSel = sel && sel.r === r && sel.c === c;
      const isPeer = sel && !isSel && (sel.r === r || sel.c === c);
      const sameVal = !isSel && selVal > 0 && v === selVal;
      const err = showErrors && validation.errGrid[r] && validation.errGrid[r][c];
      const cm = marks[r] && marks[r][c];
      const hasMarks = v === 0 && cm && cm.some(Boolean);
      const mine = puzzle.cageOf[r][c];
      // thicken the cage boundary on the right / bottom edges
      const style = {};
      if (c < n - 1 && puzzle.cageOf[r][c + 1] !== mine) style.borderRight = "3px solid var(--cage)";
      if (r < n - 1 && puzzle.cageOf[r + 1][c] !== mine) style.borderBottom = "3px solid var(--cage)";
      let cls = "kk-cell";
      if (isSel) cls += " sel";
      if (isPeer) cls += " peer";
      if (sameVal) cls += " same";
      if (err) cls += " err";
      const clue = anchorClue[r + "_" + c];
      cells.push(
        <div key={r + "_" + c} className={cls} style={style} onClick={() => setSel({ r, c })}>
          {clue && <span className="kk-clue">{clue}</span>}
          {v > 0 && <span className="kk-val">{v}</span>}
          {hasMarks && (
            <div className="kk-marks">{cm.map((on, i) => <span key={i}>{on ? i + 1 : ""}</span>)}</div>
          )}
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
            <path d="M22 5 V39 M5 22 H39" stroke="#283353" strokeWidth="1.4" opacity="0.4"/>
            <path d="M5 16.5 H22 V5" fill="none" stroke="#283353" strokeWidth="2.6" strokeLinejoin="round"/>
            <path d="M39 27.5 H22 V39" fill="none" stroke="#283353" strokeWidth="2.6" strokeLinejoin="round"/>
            <text x="9.5" y="11.5" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="6.5" fill="#2f6bff">6×</text>
            <text x="25" y="33.5" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="6.5" fill="#2f6bff">3−</text>
          </svg>
          <h1 className="wordmark">KenKen</h1>
        </div>
        <div className="tagline">Latin square × arithmetic</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(KKDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {KKDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{KKIcon.refresh} New</button>
        <button className="btn" onClick={clearAll}>{KKIcon.reset} Clear</button>
        <div className={"toggle" + (pencil ? " on" : "")} onClick={() => setPencil((p) => !p)}
             title="Pencil in candidates instead of placing a final number (Space or P)">
          <span className="switch"></span> Pencil
        </div>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{KKIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("kenken")}>{KKIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{kkFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{filled}/{n * n}</div><div className="lbl">Filled</div></div>
        <div className="stat"><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="kk-board" style={{ "--cell": cell + "px", gridTemplateColumns: "repeat(" + n + ", var(--cell))" }}>
            {cells}
          </div>
        </div>
      </div>

      <div className={"kk-pad" + (pencil ? " pencil" : "")}>
        {[...Array(n)].map((_, i) => (
          <button key={i} className="kk-key" disabled={!sel || won}
            onClick={() => sel && enterDigit(sel.r, sel.c, i + 1)}>{i + 1}</button>
        ))}
        <button className="kk-key erase" disabled={!sel || won}
          onClick={() => { if (sel) clearCell(sel.r, sel.c); }}>{KKIcon.erase}</button>
      </div>

      <div className="helpline">
        Fill each row and column with <b>1–{n}</b>, no repeats. Every cage's numbers must combine — by the shown operation — to make its <b>target</b> (e.g. <b>6×</b>, <b>3−</b>, <b>8+</b>). <b>Click</b> a cell, then type or tap a number. Switch on <b>Pencil</b> (or press <b>Space</b>) to jot candidates.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? KKIcon.warn : KKIcon.info}{toast.msg}
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
            <p>Every line is a clean run and every cage adds up.</p>
            <div className="win-stats">
              <div><div className="num">{kkFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {KKIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<KenKenApp />);
