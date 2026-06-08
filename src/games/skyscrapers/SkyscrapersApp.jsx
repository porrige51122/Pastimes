/* ============================================================
   SkyscrapersApp.jsx — Latin-square skyline with edge clues
   ============================================================ */
const SK = window.Skyscrapers;
const { useState: skS, useEffect: skE, useRef: skR, useCallback: skC, useLayoutEffect: skL } = React;

const SKDIFF = {
  easy:   { label: "Easy",   n: 4, remove: 0.3 },
  medium: { label: "Medium", n: 5, remove: 0 },
  hard:   { label: "Hard",   n: 6, remove: 0 },
};

const SKIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  erase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 6"/><path d="m18 9-6 6"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function skFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }
const skBlank = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const skClone = (g) => g.map((r) => r.slice());
// pencil marks: an n×n grid where each cell holds a length-n boolean list (index v-1)
const skBlankMarks = (n) => Array.from({ length: n }, () => Array.from({ length: n }, () => new Array(n).fill(false)));
const skCloneMarks = (m) => m.map((row) => row.map((cell) => cell.slice()));

function SkyscrapersApp() {
  const [difficulty, setDifficulty] = skS("easy");
  const [puzzle, setPuzzle] = skS(null);
  const [grid, setGrid] = skS([]);
  const [marks, setMarks] = skS([]);        // pencil candidates per cell
  const [pencil, setPencil] = skS(false);   // pencil (notes) mode
  const [sel, setSel] = skS(null);          // {r,c}
  const [seconds, setSeconds] = skS(0);
  const [running, setRunning] = skS(false);
  const [autoCheck, setAutoCheck] = skS(false);
  const [flashUntil, setFlashUntil] = skS(0);
  const [won, setWon] = skS(false);
  const [toast, setToast] = skS(null);
  const [motes, setMotes] = skS([]);
  const [loading, setLoading] = skS(false);
  const [cell, setCell] = skS(64);

  const gridRef = skR([]); const wonRef = skR(false); const selRef = skR(null);
  const marksRef = skR([]); const pencilRef = skR(false);
  const toastTimer = skR(null);
  skE(() => { gridRef.current = grid; }, [grid]);
  skE(() => { wonRef.current = won; }, [won]);
  skE(() => { selRef.current = sel; }, [sel]);
  skE(() => { marksRef.current = marks; }, [marks]);
  skE(() => { pencilRef.current = pencil; }, [pencil]);

  const showToast = skC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = skC((diff) => {
    setLoading(true);
    setTimeout(() => {
      const p = SK.generate(SKDIFF[diff].n, SKDIFF[diff].remove);
      const blank = skBlank(p.n);
      const blankM = skBlankMarks(p.n);
      gridRef.current = blank; marksRef.current = blankM;
      setPuzzle(p); setGrid(blank); setMarks(blankM); setSel(null);
      setSeconds(0); setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  skE(() => { newPuzzle(difficulty); }, [difficulty]);

  skE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? SK.validate(puzzle, grid)
    : { errRow: [], clueStatus: { top: [], bottom: [], left: [], right: [] }, solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  skE(() => {
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

  const setCellVal = skC((r, c, v) => {
    if (wonRef.current) return;
    const cur = gridRef.current;
    const nv = cur[r][c] === v ? 0 : v;
    if (cur[r][c] === nv) return;
    const n = skClone(cur); n[r][c] = nv;
    gridRef.current = n; setGrid(n);
    // placing a real value clears that cell's pencil marks
    if (nv !== 0) {
      const mm = skCloneMarks(marksRef.current);
      mm[r][c] = mm[r][c].map(() => false);
      marksRef.current = mm; setMarks(mm);
    }
    if (!running) setRunning(true);
  }, [running]);

  // toggle a pencil candidate in a cell (only meaningful while the cell is empty)
  const toggleMark = skC((r, c, v) => {
    if (wonRef.current) return;
    if (gridRef.current[r][c] !== 0) return; // a placed value owns the cell
    const mm = skCloneMarks(marksRef.current);
    mm[r][c][v - 1] = !mm[r][c][v - 1];
    marksRef.current = mm; setMarks(mm);
    if (!running) setRunning(true);
  }, [running]);

  // route a keypad / keyboard digit through the active mode
  const enterDigit = skC((r, c, v) => {
    if (pencilRef.current) toggleMark(r, c, v);
    else setCellVal(r, c, v);
  }, [toggleMark, setCellVal]);

  const clearCell = skC((r, c) => {
    if (wonRef.current) return;
    const g = skClone(gridRef.current); g[r][c] = 0;
    const mm = skCloneMarks(marksRef.current); mm[r][c] = mm[r][c].map(() => false);
    gridRef.current = g; setGrid(g);
    marksRef.current = mm; setMarks(mm);
  }, []);

  // keyboard
  skE(() => {
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

  const clearAll = skC(() => {
    if (!puzzle) return;
    const blank = skBlank(puzzle.n);
    const blankM = skBlankMarks(puzzle.n);
    gridRef.current = blank; setGrid(blank);
    marksRef.current = blankM; setMarks(blankM);
  }, [puzzle]);

  const runCheck = skC(() => {
    setFlashUntil(Date.now() + 1800);
    const v = SK.validate(puzzle, grid);
    if (v.solved) return;
    const anyErr = v.errRow.some((row) => row.some(Boolean));
    const filled = grid.every((row) => row.every((x) => x >= 1));
    const badClue = [].concat(v.clueStatus.top, v.clueStatus.bottom, v.clueStatus.left, v.clueStatus.right).some((s) => s === "bad");
    if (anyErr) showToast("A number repeats in a row or column", true);
    else if (badClue) showToast("A clue doesn't match — check the marked edges", true);
    else if (!filled) showToast("No mistakes yet — keep filling");
    else showToast("Looks good so far");
  }, [puzzle, grid, showToast]);

  skE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  // fit board to viewport
  skL(() => {
    if (!puzzle) return;
    const fit = () => {
      const slots = puzzle.n + 2;
      const avail = Math.min(560, window.innerWidth - 36);
      const byW = Math.floor(avail / slots);
      const topOffset = 360;
      const byH = Math.floor((window.innerHeight - topOffset - 120) / slots);
      const c = Math.max(38, Math.min(72, byW, byH));
      setCell(c);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  if (!puzzle) {
    return <div className="wrap"><div className="masthead"><h1 className="wordmark">Skyscrapers</h1></div></div>;
  }

  const n = puzzle.n;
  const filled = grid.reduce((a, row) => a + row.reduce((b, x) => b + (x ? 1 : 0), 0), 0);
  const C = puzzle.clues, cs = validation.clueStatus;

  const Clue = (val, status) => (
    <div className="sk-slot">
      {val != null && <span className={"sk-clue" + (showErrors && status === "bad" ? " bad" : "") + (status === "ok" ? " ok" : "")}>{val}</span>}
    </div>
  );

  const rows = [];
  // top edge
  rows.push(
    <React.Fragment key="top">
      <div className="sk-slot" />
      {C.top.map((v, c) => <React.Fragment key={"t" + c}>{Clue(v, cs.top[c])}</React.Fragment>)}
      <div className="sk-slot" />
    </React.Fragment>
  );
  for (let r = 0; r < n; r++) {
    rows.push(
      <React.Fragment key={"r" + r}>
        {Clue(C.left[r], cs.left[r])}
        {grid[r].map((v, c) => {
          const isSel = sel && sel.r === r && sel.c === c;
          const isPeer = sel && !isSel && (sel.r === r || sel.c === c);
          const err = showErrors && validation.errRow[r] && validation.errRow[r][c];
          const cm = marks[r] && marks[r][c];
          const hasMarks = v === 0 && cm && cm.some(Boolean);
          return (
            <div className="sk-slot" key={"c" + c}>
              <div className={"sk-cell" + (isSel ? " sel" : "") + (isPeer ? " peer" : "") + (err ? " err" : "")}
                onClick={() => setSel({ r, c })}>
                {v > 0 && <div className="sk-bar" style={{ height: (12 + (v / n) * 78) + "%" }} />}
                {v > 0 && <span className="sk-val">{v}</span>}
                {hasMarks && (
                  <div className="sk-marks">
                    {cm.map((on, i) => <span key={i}>{on ? i + 1 : ""}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {Clue(C.right[r], cs.right[r])}
      </React.Fragment>
    );
  }
  rows.push(
    <React.Fragment key="bot">
      <div className="sk-slot" />
      {C.bottom.map((v, c) => <React.Fragment key={"b" + c}>{Clue(v, cs.bottom[c])}</React.Fragment>)}
      <div className="sk-slot" />
    </React.Fragment>
  );

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <rect x="4" y="24" width="9" height="16" rx="1.5" fill="#cfe0ff" stroke="#283353" strokeWidth="2"/>
            <rect x="14.5" y="10" width="9" height="30" rx="1.5" fill="#2f6bff" stroke="#283353" strokeWidth="2"/>
            <rect x="25" y="18" width="9" height="22" rx="1.5" fill="#9bc0ff" stroke="#283353" strokeWidth="2"/>
            <rect x="35.5" y="30" width="6" height="10" rx="1.5" fill="#cfe0ff" stroke="#283353" strokeWidth="2"/>
          </svg>
          <h1 className="wordmark">Skyscrapers</h1>
        </div>
        <div className="tagline">A skyline of logic</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(SKDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {SKDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{SKIcon.refresh} New</button>
        <button className="btn" onClick={clearAll}>{SKIcon.reset} Clear</button>
        <div className={"toggle" + (pencil ? " on" : "")} onClick={() => setPencil((p) => !p)}
             title="Pencil in candidates instead of placing a final number (Space or P)">
          <span className="switch"></span> Pencil
        </div>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{SKIcon.check} Check</button>}
      <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("skyscrapers")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg> Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{skFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{filled}/{n * n}</div><div className="lbl">Filled</div></div>
        <div className="stat"><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: "auto", maxWidth: "calc(100vw - 24px)" }}>
        <div className={"board-inner" + (won ? " win" : "")} style={{ background: "transparent" }}>
          <div className="sk-board" style={{ "--cell": cell + "px", gridTemplateColumns: "repeat(" + (n + 2) + ", var(--cell))" }}>
            {rows}
          </div>
        </div>
      </div>

      <div className={"sk-pad" + (pencil ? " pencil" : "")}>
        {[...Array(n)].map((_, i) => (
          <button key={i} className="sk-key" disabled={!sel || won}
            onClick={() => sel && enterDigit(sel.r, sel.c, i + 1)}>{i + 1}</button>
        ))}
        <button className="sk-key erase" disabled={!sel || won}
          onClick={() => { if (sel) clearCell(sel.r, sel.c); }}>
          {SKIcon.erase}
        </button>
      </div>

      <div className="helpline">
        Fill each row and column with <b>1–{n}</b>, no repeats. A clue counts how many buildings are <b>visible</b> from that edge — taller ones hide shorter ones behind them. <b>Click</b> a cell, then type or tap a number. Switch on <b>Pencil</b> (or press <b>Space</b>) to jot possible numbers while you work.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? SKIcon.warn : SKIcon.info}{toast.msg}
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
            <h2>Skyline complete!</h2>
            <p>Every clue checks out and each row and column is a clean run.</p>
            <div className="win-stats">
              <div><div className="num">{skFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{n}×{n}</div><div className="lbl">Grid</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {SKIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SkyscrapersApp />);
