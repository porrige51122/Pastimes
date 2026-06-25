/* ============================================================
   MasyuApp.jsx — game shell, SVG board, state, controls
   ============================================================ */
const MA = window.Masyu;
const { useState: maS, useEffect: maE, useRef: maR, useCallback: maC, useLayoutEffect: maL } = React;

const MADIFF = {
  easy:   { label: "Small",  rows: 6,  cols: 6,  diff: "easy",   maxW: 480  },
  medium: { label: "Medium", rows: 8,  cols: 8,  diff: "medium", maxW: 620  },
  hard:   { label: "Large",  rows: 10, cols: 10, diff: "hard",   maxW: 780  },
};

const MAIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function maFmt(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

const MCELL = 56;
const MPAD = 40;

function MasyuApp() {
  const [difficulty, setDifficulty] = maS("easy");
  const [puzzle, setPuzzle] = maS(null);
  const [edges, setEdges] = maS([]);
  const [history, setHistory] = maS([]);
  const [moves, setMoves] = maS(0);
  const [seconds, setSeconds] = maS(0);
  const [running, setRunning] = maS(false);
  const [autoCheck, setAutoCheck] = maS(true);
  const [flashUntil, setFlashUntil] = maS(0);
  const [won, setWon] = maS(false);
  const [toast, setToast] = maS(null);
  const [motes, setMotes] = maS([]);
  const [loading, setLoading] = maS(false);

  const toastTimer = maR(null);
  const dragRef = maR({ active: false, target: 0, visited: null });

  const showToast = maC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = maC((diff) => {
    const cfg = MADIFF[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 5) { p = MA.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const ne = MA.MNE(p.rows, p.cols);
      setPuzzle(p);
      setEdges(new Array(ne).fill(0));
      setHistory([]);
      setMoves(0); setSeconds(0); setRunning(false);
      setWon(false); setMotes([]); setLoading(false);
    }, 30);
  }, [showToast]);

  maE(() => { newPuzzle(difficulty); }, [difficulty]);

  maE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? MA.validate(puzzle, edges) : { pearlStatus: [], onEdges: 0, solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  maE(() => {
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
  }, [edges, puzzle, won]);

  const maEdgeFromPoint = (e) => {
    let el = document.elementFromPoint(e.clientX, e.clientY);
    while (el && el.tagName !== 'svg') {
      const v = el.getAttribute && el.getAttribute('data-ei');
      if (v != null) return +v;
      el = el.parentElement;
    }
    return -1;
  };
  const onSvgDown = maC((e) => {
    if (won) return;
    if (e.button !== 0 && e.button !== 2) return;
    const ei = maEdgeFromPoint(e);
    if (ei < 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    const right = e.button === 2;
    const curVal = edges[ei];
    const target = right ? (curVal === 2 ? 0 : 2) : (curVal === 1 ? 0 : 1);
    dragRef.current = { active: true, target, visited: new Set([ei]) };
    setHistory((h) => [...h, edges.slice()]);
    setEdges((es) => { const n = es.slice(); n[ei] = target; return n; });
    setMoves((m) => m + 1);
    if (!running) setRunning(true);
  }, [won, edges, running]);
  const onSvgMove = maC((e) => {
    if (!dragRef.current.active || won) return;
    const ei = maEdgeFromPoint(e);
    if (ei < 0 || dragRef.current.visited.has(ei)) return;
    dragRef.current.visited.add(ei);
    const tgt = dragRef.current.target;
    setEdges((es) => { const n = es.slice(); n[ei] = tgt; return n; });
  }, [won]);
  const onSvgUp = maC(() => { dragRef.current.active = false; }, []);

  const undo = maC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setEdges(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = maC(() => {
    if (!puzzle) return;
    const ne = MA.MNE(puzzle.rows, puzzle.cols);
    if (edges.some((e) => e > 0)) {
      setHistory((h) => [...h, edges.slice()]);
      setEdges(new Array(ne).fill(0));
    }
    setWon(false);
  }, [puzzle, edges]);

  const runCheck = maC(() => {
    setFlashUntil(Date.now() + 1700);
    const v = MA.validate(puzzle, edges);
    if (v.solved) return;
    const placed = edges.some((e) => e === 1);
    if (!placed) showToast("Click edges between cells to draw the loop");
    else {
      const errs = v.pearlStatus.flat().filter((s) => s === "error").length;
      if (errs) showToast(errs + " pearl" + (errs > 1 ? "s" : "") + " not satisfied yet — check the red ones", true);
      else showToast("No mistakes yet — keep going");
    }
  }, [puzzle, edges, showToast]);

  maE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  /* count pearls */
  const pearlCount = puzzle ? puzzle.pearls.flat().filter((p) => p > 0).length : 0;

  const [frameW, setFrameW] = maS(MADIFF.easy.maxW);
  maL(() => {
    const fit = () => {
      if (!puzzle) return;
      const R = puzzle.rows, C = puzzle.cols;
      const W = MPAD * 2 + (C - 1) * MCELL, H = MPAD * 2 + (R - 1) * MCELL;
      const A = W / H;
      const frame = document.querySelector(".board-frame");
      if (!frame) return;
      const help = document.querySelector(".helpline");
      const topOff = frame.getBoundingClientRect().top + window.scrollY;
      const below = (help ? help.offsetHeight : 50) + 36;
      const availH = window.innerHeight - topOff - below;
      const wByH = (availH - 35) * A + 35;
      const wByW = window.innerWidth - 24;
      const w = Math.max(220, Math.floor(Math.min(MADIFF[difficulty].maxW, wByW, wByH)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) return <div className="wrap"><div className="masthead"><h1 className="wordmark">Masyu</h1></div></div>;

  const R = puzzle.rows, C = puzzle.cols;
  const W = MPAD * 2 + (C - 1) * MCELL, H = MPAD * 2 + (R - 1) * MCELL;
  const ne = MA.MNE(R, C), nh = MA.MNH(R, C);
  const cx = (c) => MPAD + c * MCELL, cy = (r) => MPAD + r * MCELL;
  const PR = MCELL * 0.21; // pearl radius

  /* grid lines */
  const gridLines = [];
  for (let r = 0; r < R; r++) gridLines.push(<line key={"gh" + r} className="ma-grid" x1={cx(0)} y1={cy(r)} x2={cx(C - 1)} y2={cy(r)} />);
  for (let c = 0; c < C; c++) gridLines.push(<line key={"gv" + c} className="ma-grid" x1={cx(c)} y1={cy(0)} x2={cx(c)} y2={cy(R - 1)} />);

  /* cell dots */
  const dots = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (puzzle.pearls[r][c]) continue;
    dots.push(<circle key={"d" + r + "_" + c} className="ma-dot" cx={cx(c)} cy={cy(r)} r={3} />);
  }

  /* edges */
  const edgeEls = [];
  for (let ei = 0; ei < ne; ei++) {
    let r1, c1, r2, c2;
    if (ei < nh) { r1 = Math.floor(ei / (C - 1)); c1 = ei % (C - 1); r2 = r1; c2 = c1 + 1; }
    else { const idx = ei - nh; r1 = Math.floor(idx / C); c1 = idx % C; r2 = r1 + 1; c2 = c1; }
    const x1 = cx(c1), y1 = cy(r1), x2 = cx(c2), y2 = cy(r2);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const st = edges[ei];
    edgeEls.push(
      <g key={"e" + ei} data-ei={ei}>
        <line className="ma-hit" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={20} />
        <g className="ma-vis">
          {st === 1 && <line className="ma-line" x1={x1} y1={y1} x2={x2} y2={y2} />}
          {st === 2 && <text className="ma-x" x={mx} y={my} fontSize={MCELL * 0.24}>✕</text>}
        </g>
      </g>
    );
  }

  /* pearls */
  const pearlEls = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const p = puzzle.pearls[r][c];
    if (!p) continue;
    const ps = showErrors ? validation.pearlStatus[r][c] : "none";
    const cls = "ma-pearl" + (ps === "done" ? " done" : ps === "error" ? " error" : "");
    pearlEls.push(
      <g key={"p" + r + "_" + c} className={cls}>
        <circle className={p === 1 ? "ma-pearl-white" : "ma-pearl-black"}
          cx={cx(c)} cy={cy(r)} r={PR} />
      </g>
    );
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
            <line x1="4" y1="22" x2="40" y2="22" stroke="#d2dae5" strokeWidth="1.2"/>
            <line x1="22" y1="4" x2="22" y2="40" stroke="#d2dae5" strokeWidth="1.2"/>
            <circle cx="22" cy="10" r="6" fill="#fff" stroke="#283353" strokeWidth="2.4"/>
            <circle cx="34" cy="22" r="6" fill="#283353" stroke="#283353" strokeWidth="2.4"/>
          </svg>
          <h1 className="wordmark">Masyu</h1>
        </div>
        <div className="tagline">Thread the pearls</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(MADIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {MADIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{MAIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{MAIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{MAIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{MAIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("masyu")}>{MAIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{maFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{validation.onEdges}</div><div className="lbl">Lines</div></div>
        <div className="stat"><div className="num">{pearlCount}</div><div className="lbl">Pearls</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <svg className={"ma-board" + (won ? " won" : "")} viewBox={"0 0 " + W + " " + H}
            onPointerDown={onSvgDown} onPointerMove={onSvgMove}
            onPointerUp={onSvgUp} onPointerCancel={onSvgUp}
            onContextMenu={(e) => e.preventDefault()}>
            <g>{gridLines}</g>
            <g>{dots}</g>
            <g>{edgeEls}</g>
            <g>{pearlEls}</g>
          </svg>
        </div>
      </div>

      <div className="helpline">
        <b>Click</b> edges between cells to draw lines; <b>right-click</b> to mark an edge as empty (✕). Form a single closed loop. <b>White pearls</b>: go straight through, turn before or after. <b>Black pearls</b>: turn on it, go straight before and after.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? MAIcon.warn : MAIcon.info}{toast.msg}
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
            <h2>Pearls strung!</h2>
            <p>Every pearl is satisfied and the loop is complete.</p>
            <div className="win-stats">
              <div><div className="num">{maFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Moves</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {MAIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MasyuApp />);
