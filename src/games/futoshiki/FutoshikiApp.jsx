/* ============================================================
   FutoshikiApp.jsx — Latin square with inequality signs
   ============================================================ */
const FT = window.Futoshiki;
const { useState: ftS, useEffect: ftE, useRef: ftR, useCallback: ftC, useLayoutEffect: ftL } = React;

const FTDIFF = {
  easy:   { label: "Easy",   n: 4, diff: "easy" },
  medium: { label: "Medium", n: 5, diff: "medium" },
  hard:   { label: "Hard",   n: 6, diff: "hard" },
};

const FTIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  erase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 6"/><path d="m18 9-6 6"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function ftFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const ftBlank = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const ftClone = (g) => g.map((r) => r.slice());
const ftBlankMarks = (n) => Array.from({ length: n }, () => Array.from({ length: n }, () => new Array(n).fill(false)));
const ftCloneMarks = (m) => m.map((row) => row.map((cell) => cell.slice()));

function FutoshikiApp() {
  const [difficulty, setDifficulty] = ftS("easy");
  const [puzzle, setPuzzle] = ftS(null);
  const [grid, setGrid] = ftS([]);
  const [marks, setMarks] = ftS([]);
  const [pencil, setPencil] = ftS(false);
  const [sel, setSel] = ftS(null);
  const [seconds, setSeconds] = ftS(0);
  const [running, setRunning] = ftS(false);
  const [autoCheck, setAutoCheck] = ftS(true);
  const [flashUntil, setFlashUntil] = ftS(0);
  const [won, setWon] = ftS(false);
  const [toast, setToast] = ftS(null);
  const [motes, setMotes] = ftS([]);
  const [loading, setLoading] = ftS(false);
  const [cell, setCell] = ftS(64);

  const gridRef = ftR([]); const wonRef = ftR(false); const selRef = ftR(null);
  const marksRef = ftR([]); const pencilRef = ftR(false); const givenRef = ftR([]);
  const toastTimer = ftR(null);
  ftE(() => { gridRef.current = grid; }, [grid]);
  ftE(() => { wonRef.current = won; }, [won]);
  ftE(() => { selRef.current = sel; }, [sel]);
  ftE(() => { marksRef.current = marks; }, [marks]);
  ftE(() => { pencilRef.current = pencil; }, [pencil]);

  const showToast = ftC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = ftC((diffKey) => {
    setLoading(true);
    setTimeout(() => {
      const d = FTDIFF[diffKey];
      const p = FT.generate(d.n, d.diff);
      const g = ftClone(p.givens);
      const blankM = ftBlankMarks(p.n);
      gridRef.current = g; marksRef.current = blankM; givenRef.current = p.given;
      setPuzzle(p); setGrid(g); setMarks(blankM); setSel(null);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  ftE(() => { newPuzzle(difficulty); }, [difficulty]);

  ftE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? FT.validate(puzzle, grid) : { errGrid: [], ineqBad: {}, solved: false, filled: 0 };
  const showErrors = autoCheck || Date.now() < flashUntil;

  ftE(() => {
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

  const setCellVal = ftC((r, c, v) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    const cur = gridRef.current;
    const nv = cur[r][c] === v ? 0 : v;
    if (cur[r][c] === nv) return;
    const g = ftClone(cur); g[r][c] = nv;
    gridRef.current = g; setGrid(g);
    if (nv !== 0) {
      const mm = ftCloneMarks(marksRef.current);
      mm[r][c] = mm[r][c].map(() => false);
      marksRef.current = mm; setMarks(mm);
    }
    if (!running) setRunning(true);
  }, [running]);

  const toggleMark = ftC((r, c, v) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    if (gridRef.current[r][c] !== 0) return;
    const mm = ftCloneMarks(marksRef.current);
    mm[r][c][v - 1] = !mm[r][c][v - 1];
    marksRef.current = mm; setMarks(mm);
    if (!running) setRunning(true);
  }, [running]);

  const enterDigit = ftC((r, c, v) => {
    if (pencilRef.current) toggleMark(r, c, v);
    else setCellVal(r, c, v);
  }, [toggleMark, setCellVal]);

  const clearCell = ftC((r, c) => {
    if (wonRef.current || givenRef.current[r][c]) return;
    const g = ftClone(gridRef.current); g[r][c] = 0;
    const mm = ftCloneMarks(marksRef.current); mm[r][c] = mm[r][c].map(() => false);
    gridRef.current = g; setGrid(g);
    marksRef.current = mm; setMarks(mm);
  }, []);

  ftE(() => {
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

  const restart = ftC(() => {
    if (!puzzle) return;
    const g = ftClone(puzzle.givens);
    const blankM = ftBlankMarks(puzzle.n);
    gridRef.current = g; setGrid(g);
    marksRef.current = blankM; setMarks(blankM);
    setWon(false);
  }, [puzzle]);

  const runCheck = ftC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = FT.validate(puzzle, grid);
    if (v.solved) return;
    const anyDup = v.errGrid.some((row) => row.some(Boolean));
    const anyIneq = Object.keys(v.ineqBad).length > 0;
    if (anyIneq) showToast("A number breaks one of the “greater-than” signs", true);
    else if (anyDup) showToast("A number repeats in a row or column", true);
    else if (v.filled < puzzle.n * puzzle.n) showToast("No mistakes yet — keep going");
    else showToast("Looks good so far");
  }, [puzzle, grid, showToast]);

  ftE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  ftL(() => {
    if (!puzzle) return;
    const fit = () => {
      const n = puzzle.n;
      // board width = n cells + (n-1) gaps; gap ≈ 0.42 * cell
      const avail = Math.min(540, window.innerWidth - 40);
      const byW = Math.floor(avail / (n + (n - 1) * 0.42));
      const byH = Math.floor((window.innerHeight - 470) / (n + (n - 1) * 0.42));
      const c = Math.max(42, Math.min(74, byW, byH));
      setCell(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Futoshiki</h1></div></div>;
  }

  const n = puzzle.n;
  const filled = validation.filled;
  const selVal = sel ? grid[sel.r][sel.c] : 0;
  const gap = Math.round(cell * 0.42);

  // build sign lookups from the inequality list
  const hSign = {}, vSign = {}; // key "r_c"
  puzzle.ineqs.forEach((iq, i) => {
    const [ar, ac] = iq.a, [br, bc] = iq.b; // a > b
    if (ar === br) { // horizontal pair
      const cMin = Math.min(ac, bc);
      hSign[ar + "_" + cMin] = { char: ac < bc ? ">" : "<", idx: i };
    } else { // vertical pair
      const rMin = Math.min(ar, br);
      vSign[rMin + "_" + ac] = { char: ar < br ? "∨" : "∧", idx: i };
    }
  });

  // assemble the (2n-1) x (2n-1) grid in row-major order
  const items = [];
  for (let R = 0; R < 2 * n - 1; R++) {
    for (let C = 0; C < 2 * n - 1; C++) {
      const rEven = R % 2 === 0, cEven = C % 2 === 0;
      const r = R >> 1, c = C >> 1;
      if (rEven && cEven) {
        const v = grid[r][c];
        const isGiven = puzzle.given[r][c];
        const isSel = sel && sel.r === r && sel.c === c;
        const isPeer = sel && !isSel && (sel.r === r || sel.c === c);
        const sameVal = !isSel && selVal > 0 && v === selVal;
        const err = showErrors && validation.errGrid[r] && validation.errGrid[r][c];
        const cm = marks[r] && marks[r][c];
        const hasMarks = v === 0 && cm && cm.some(Boolean);
        let cls = "ft-cell";
        if (isGiven) cls += " given";
        if (isSel) cls += " sel";
        if (isPeer) cls += " peer";
        if (sameVal) cls += " same";
        if (err) cls += " err";
        items.push(
          <div key={R + "_" + C} className={cls} onClick={() => setSel({ r, c })}>
            {v > 0 && <span className="ft-val">{v}</span>}
            {hasMarks && <div className="ft-marks">{cm.map((on, i) => <span key={i}>{on ? i + 1 : ""}</span>)}</div>}
          </div>
        );
      } else if (rEven && !cEven) {
        const s = hSign[r + "_" + c];
        const bad = s && showErrors && validation.ineqBad[s.idx];
        items.push(<div key={R + "_" + C} className="ft-slot">{s && <span className={"ft-sign" + (bad ? " bad" : "")}>{s.char}</span>}</div>);
      } else if (!rEven && cEven) {
        const s = vSign[r + "_" + c];
        const bad = s && showErrors && validation.ineqBad[s.idx];
        items.push(<div key={R + "_" + C} className="ft-slot">{s && <span className={"ft-sign" + (bad ? " bad" : "")}>{s.char}</span>}</div>);
      } else {
        items.push(<div key={R + "_" + C} className="ft-slot" />);
      }
    }
  }

  // column / row template: cell gap cell gap ... cell
  const track = [];
  for (let i = 0; i < n; i++) { track.push("var(--cell)"); if (i < n - 1) track.push("var(--gap)"); }
  const template = track.join(" ");

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <rect x="5" y="5" width="14" height="14" rx="3" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <rect x="25" y="5" width="14" height="14" rx="3" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <rect x="5" y="25" width="14" height="14" rx="3" fill="#2f6bff" stroke="#283353" strokeWidth="2.4"/>
            <rect x="25" y="25" width="14" height="14" rx="3" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <text x="22" y="13.5" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="13" fill="#283353" textAnchor="middle" dominantBaseline="central">&gt;</text>
            <text x="12" y="22" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="13" fill="#283353" textAnchor="middle" dominantBaseline="central">∨</text>
          </svg>
          <h1 className="wordmark">Futoshiki</h1>
        </div>
        <div className="tagline">More or less</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(FTDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {FTDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{FTIcon.refresh} New</button>
        <button className="btn" onClick={restart}>{FTIcon.reset} Restart</button>
        <div className={"toggle" + (pencil ? " on" : "")} onClick={() => setPencil((p) => !p)}
             title="Pencil in candidates instead of placing a final number (Space or P)">
          <span className="switch"></span> Pencil
        </div>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{FTIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("futoshiki")}>{FTIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{ftFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{filled}/{n * n}</div><div className="lbl">Filled</div></div>
        <div className="stat"><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="ft-board" style={{ "--cell": cell + "px", "--gap": gap + "px", gridTemplateColumns: template, gridTemplateRows: template }}>
            {items}
          </div>
        </div>
      </div>

      <div className={"ft-pad" + (pencil ? " pencil" : "")}>
        {[...Array(n)].map((_, i) => (
          <button key={i} className="ft-key" disabled={!sel || won}
            onClick={() => sel && enterDigit(sel.r, sel.c, i + 1)}>{i + 1}</button>
        ))}
        <button className="ft-key erase" disabled={!sel || won}
          onClick={() => { if (sel) clearCell(sel.r, sel.c); }}>{FTIcon.erase}</button>
      </div>

      <div className="helpline">
        Fill each row and column with <b>1–{n}</b>, no repeats. Every <b>&gt;</b> or <b>∨</b> sign points from the <b>larger</b> number to the smaller. <b>Click</b> a cell, then type or tap a number. Switch on <b>Pencil</b> (or press <b>Space</b>) to jot candidates.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? FTIcon.warn : FTIcon.info}{toast.msg}
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
            <p>Every line is a clean run and every sign holds true.</p>
            <div className="win-stats">
              <div><div className="num">{ftFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {FTIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FutoshikiApp />);
