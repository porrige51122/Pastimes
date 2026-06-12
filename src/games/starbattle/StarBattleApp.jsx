/* ============================================================
   StarBattleApp.jsx — place stars in rows, columns & regions
   ============================================================ */
const SB = window.StarBattle;
const { useState: sS, useEffect: sE, useCallback: sC, useLayoutEffect: sL, useRef: sR } = React;

const SBDIFF = {
  easy:   { label: "Easy",   desc: "5×5 · 1★" },
  medium: { label: "Medium", desc: "7×7 · 1★" },
  hard:   { label: "Hard",   desc: "8×8 · 2★" },
};
const REGION_COLORS = ["sb-r0", "sb-r1", "sb-r2", "sb-r3", "sb-r4", "sb-r5", "sb-r6", "sb-r7"];

const SBI = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  book: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function sbFmt(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

function StarBattleApp() {
  const [diff, setDiff] = sS("easy");
  const [puzzle, setPuzzle] = sS(null);
  const [grid, setGrid] = sS([]);       // 0=empty, 1=star, 2=mark
  const [seconds, setSeconds] = sS(0);
  const [running, setRunning] = sS(false);
  const [over, setOver] = sS(null);
  const [mode, setMode] = sS("star");
  const [cs, setCs] = sS(48);
  const [toast, setToast] = sS(null);
  const [motes, setMotes] = sS([]);
  const [loading, setLoading] = sS(false);
  const toastT = sR(null);

  const showToast = sC((msg, w) => {
    setToast({ id: Date.now(), msg, warn: !!w });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const fireWin = sC(() => {
    const cols = ["#f5a623", "#2f6bff", "#15a05a", "#e23b2e", "#7a5af0", "#19b6c9"];
    const arr = [];
    for (let i = 0; i < 80; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: cols[i % cols.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, []);

  const newGame = sC((d) => {
    setLoading(true);
    setTimeout(() => {
      const p = SB.generate(d);
      setPuzzle(p);
      const g = [];
      for (let r = 0; r < p.size; r++) {
        g[r] = [];
        for (let c = 0; c < p.size; c++) g[r][c] = 0;
      }
      setGrid(g); setSeconds(0); setRunning(false); setOver(null); setMotes([]); setLoading(false);
    }, 20);
  }, []);

  sE(() => { newGame(diff); }, [diff]);

  sE(() => {
    if (!running || over) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, over]);

  sL(() => {
    if (!puzzle) return;
    const fit = () => {
      const maxW = Math.min(520, window.innerWidth - 32);
      const maxH = window.innerHeight - 300;
      const n = puzzle.size;
      setCs(Math.max(32, Math.min(56, Math.min(Math.floor(maxW / n), Math.floor(maxH / n)))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [puzzle]);

  const handleCell = sC((r, c, right) => {
    if (over || !puzzle) return;
    if (!running) setRunning(true);
    setGrid(prev => {
      const next = prev.map(row => row.slice());
      if (right || mode === "mark") next[r][c] = next[r][c] === 2 ? 0 : 2;
      else next[r][c] = next[r][c] === 1 ? 0 : 1;
      return next;
    });
  }, [over, puzzle, running, mode]);

  /* Win check */
  sE(() => {
    if (!puzzle || over || !running) return;
    const pg = grid.map(row => row.map(c => c === 1 ? 1 : 0));
    if (SB.checkWin(pg, puzzle)) { setOver("won"); setRunning(false); setTimeout(fireWin, 200); }
  }, [grid]);

  const clearGrid = sC(() => {
    if (!puzzle || over) return;
    setGrid(prev => prev.map(row => row.map(() => 0)));
  }, [puzzle, over]);

  if (!puzzle) return <div className="wrap" style={{ textAlign: "center", paddingTop: 80 }}>Generating puzzle…</div>;

  const n = puzzle.size;
  const ns = puzzle.stars;

  /* Row / col / region star counts */
  const rowCnt = new Array(n).fill(0);
  const colCnt = new Array(n).fill(0);
  const regCnt = new Array(n).fill(0);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === 1) { rowCnt[r]++; colCnt[c]++; regCnt[puzzle.regions[r][c]]++; }
  const totalStars = rowCnt.reduce((a, b) => a + b, 0);
  const targetStars = n * ns;

  /* Build cells */
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const reg = puzzle.regions[r][c];
      let bc = REGION_COLORS[reg % REGION_COLORS.length];
      let borders = "";
      if (r === 0 || puzzle.regions[r - 1][c] !== reg) borders += " bt";
      if (r === n - 1 || puzzle.regions[r + 1][c] !== reg) borders += " bb";
      if (c === 0 || puzzle.regions[r][c - 1] !== reg) borders += " bl";
      if (c === n - 1 || puzzle.regions[r][c + 1] !== reg) borders += " br";
      const val = grid[r][c];
      cells.push(
        <div key={r + "-" + c}
          className={"sb-cell " + bc + borders}
          style={{ width: cs, height: cs }}
          onClick={() => handleCell(r, c, false)}
          onContextMenu={(e) => { e.preventDefault(); handleCell(r, c, true); }}>
          {val === 1 && <span className="sb-star">★</span>}
          {val === 2 && <span className="sb-mark">✕</span>}
        </div>
      );
    }
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../categories/deduction.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        Deduction
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <rect x="2" y="2" width="40" height="40" rx="10" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <polygon points="22,8 25.5,17 35,17 27.5,23 30,32 22,26 14,32 16.5,23 9,17 18.5,17" fill="#f5a623" stroke="#283353" strokeWidth="1.5"/>
          </svg>
          <h1 className="wordmark">Star Battle</h1>
        </div>
        <div className="tagline">Place stars in every region</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(SBDIFF).map(k => (
            <button key={k} className={diff === k ? "active" : ""}
              onClick={() => k !== diff ? setDiff(k) : newGame(k)}>
              {SBDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newGame(diff)}>{SBI.refresh} New</button>
        <button className="btn" onClick={clearGrid} disabled={!!over}>{SBI.undo} Clear</button>
        <div className="sb-mode">
          <button className={mode === "star" ? "active" : ""} onClick={() => setMode("star")}>★ Star</button>
          <button className={mode === "mark" ? "active" : ""} onClick={() => setMode("mark")}>✕ Mark</button>
        </div>
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("starbattle")}>{SBI.book} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{sbFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{totalStars}/{targetStars}</div><div className="lbl">Stars</div></div>
        <div className="stat"><div className="num">{ns}</div><div className="lbl">Per group</div></div>
      </div>

      <div className="sb-wrap">
        {loading
          ? <div style={{ padding: 40, color: "var(--ink-soft)", fontWeight: 700 }}>Generating…</div>
          : <div className="sb-board" style={{
              gridTemplateColumns: "repeat(" + n + ", " + cs + "px)",
              gridTemplateRows: "repeat(" + n + ", " + cs + "px)",
            }}>
              {cells}
            </div>
        }
      </div>

      <div className="helpline">
        Place <b>{ns} star{ns > 1 ? "s" : ""}</b> in every row, column and coloured region. Stars can't touch each other, even diagonally. <b>Click</b> to place a star; <b>right-click</b> to mark a cell empty.
      </div>

      {toast && <div className="toast-zone" key={toast.id}><div className={"toast" + (toast.warn ? " warn" : "")}>{toast.warn ? SBI.warn : SBI.info}{toast.msg}</div></div>}

      {motes.map(m => <div key={m.id} className="mote" style={{
        left: m.left + "vw", width: m.size, height: m.size * 0.6,
        background: m.color, transform: "rotate(" + m.rot + "deg)",
        animationDuration: m.dur + "s", animationDelay: m.delay + "s",
      }} />)}

      {over && (
        <div className="win-overlay">
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
              <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
              <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Stars aligned!</h2>
            <p>Every region, row and column is satisfied.</p>
            <div className="win-stats">
              <div><div className="num">{sbFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{targetStars}</div><div className="lbl">Stars</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newGame(diff)}>
              {SBI.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<StarBattleApp />);
