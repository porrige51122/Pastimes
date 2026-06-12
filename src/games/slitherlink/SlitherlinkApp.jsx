/* ============================================================
   SlitherlinkApp.jsx — game shell, SVG board, state, controls
   ============================================================ */
const SL = window.Slitherlink;
const { useState: slS, useEffect: slE, useRef: slR, useCallback: slC, useLayoutEffect: slL } = React;

const SLDIFF = {
  easy:   { label: "Small",  rows: 5,  cols: 5,  diff: "easy",   maxW: 480  },
  medium: { label: "Medium", rows: 7,  cols: 7,  diff: "medium", maxW: 660  },
  hard:   { label: "Large",  rows: 10, cols: 10, diff: "hard",   maxW: 900  },
};

const SLIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function slFmt(s) { var m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

const CELL = 52;
const PAD = 32;

function SlitherlinkApp() {
  const [difficulty, setDifficulty] = slS("easy");
  const [puzzle, setPuzzle] = slS(null);
  const [edges, setEdges] = slS([]);
  const [history, setHistory] = slS([]);
  const [moves, setMoves] = slS(0);
  const [seconds, setSeconds] = slS(0);
  const [running, setRunning] = slS(false);
  const [autoCheck, setAutoCheck] = slS(true);
  const [flashUntil, setFlashUntil] = slS(0);
  const [won, setWon] = slS(false);
  const [toast, setToast] = slS(null);
  const [motes, setMotes] = slS([]);
  const [loading, setLoading] = slS(false);

  const toastTimer = slR(null);

  const showToast = slC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = slC((diff) => {
    const cfg = SLDIFF[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null, tries = 0;
      while (!p && tries < 5) { p = SL.generate(cfg); tries++; }
      if (!p) { showToast("Couldn't build a puzzle — try again", true); setLoading(false); return; }
      const ne = SL.NE(p.rows, p.cols);
      setPuzzle(p);
      setEdges(new Array(ne).fill(0));
      setHistory([]);
      setMoves(0); setSeconds(0); setRunning(false);
      setWon(false); setMotes([]); setLoading(false);
    }, 30);
  }, [showToast]);

  slE(() => { newPuzzle(difficulty); }, [difficulty]);

  slE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle ? SL.validate(puzzle, edges) : { clueStatus: [], onEdges: 0, solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  slE(() => {
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

  const onEdgeClick = slC((ei, ev) => {
    if (won) return;
    ev.preventDefault();
    const right = ev.type === "contextmenu";
    setHistory((h) => [...h, edges.slice()]);
    setEdges((es) => {
      const n = es.slice();
      if (right) n[ei] = n[ei] === 2 ? 0 : 2;
      else n[ei] = n[ei] === 1 ? 0 : 1;
      return n;
    });
    setMoves((m) => m + 1);
    if (!running && !won) setRunning(true);
  }, [won, edges, running]);

  const undo = slC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      setEdges(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = slC(() => {
    if (!puzzle) return;
    const ne = SL.NE(puzzle.rows, puzzle.cols);
    if (edges.some((e) => e > 0)) {
      setHistory((h) => [...h, edges.slice()]);
      setEdges(new Array(ne).fill(0));
    }
    setWon(false);
  }, [puzzle, edges]);

  const runCheck = slC(() => {
    setFlashUntil(Date.now() + 1700);
    const v = SL.validate(puzzle, edges);
    if (v.solved) return;
    const placed = edges.some((e) => e === 1);
    if (!placed) showToast("Click edges between dots to draw the loop");
    else {
      const errs = v.clueStatus.flat().filter((s) => s === "error").length;
      if (errs) showToast(errs + " clue" + (errs > 1 ? "s" : "") + " can't be met — check the red numbers", true);
      else showToast("No mistakes yet — keep going");
    }
  }, [puzzle, edges, showToast]);

  slE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil((f) => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  const [frameW, setFrameW] = slS(SLDIFF.easy.maxW);
  slL(() => {
    const fit = () => {
      if (!puzzle) return;
      const R = puzzle.rows, C = puzzle.cols;
      const W = PAD * 2 + C * CELL, H = PAD * 2 + R * CELL;
      const A = W / H;
      const frame = document.querySelector(".board-frame");
      if (!frame) return;
      const help = document.querySelector(".helpline");
      const topOff = frame.getBoundingClientRect().top + window.scrollY;
      const below = (help ? help.offsetHeight : 50) + 36;
      const availH = window.innerHeight - topOff - below;
      const wByH = (availH - 35) * A + 35;
      const wByW = window.innerWidth - 24;
      const w = Math.max(220, Math.floor(Math.min(SLDIFF[difficulty].maxW, wByW, wByH)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, puzzle]);

  if (!puzzle) return <div className="wrap"><div className="masthead"><h1 className="wordmark">Slitherlink</h1></div></div>;

  const R = puzzle.rows, C = puzzle.cols;
  const W = PAD * 2 + C * CELL, H = PAD * 2 + R * CELL;
  const ne = SL.NE(R, C), nh = SL.NH(R, C);
  const vx = (vc) => PAD + vc * CELL, vy = (vr) => PAD + vr * CELL;

  /* dots */
  const dots = [];
  for (let vr = 0; vr <= R; vr++) for (let vc = 0; vc <= C; vc++)
    dots.push(<circle key={"d" + vr + "_" + vc} className="sl-dot" cx={vx(vc)} cy={vy(vr)} r={3} />);

  /* clues */
  const clues = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const k = puzzle.clues[r][c];
    if (k == null) continue;
    const st = showErrors ? validation.clueStatus[r][c] : "wip";
    clues.push(
      <text key={"c" + r + "_" + c} className={"sl-clue" + (st === "done" ? " done" : st === "error" ? " error" : "")}
        x={vx(c) + CELL / 2} y={vy(r) + CELL / 2}
        fontSize={CELL * 0.48}>{k}</text>
    );
  }

  /* edges */
  const edgeEls = [];
  for (let ei = 0; ei < ne; ei++) {
    const vs = SL.edgeVerts(R, C, ei);
    const x1 = vx(vs[0][1]), y1 = vy(vs[0][0]), x2 = vx(vs[1][1]), y2 = vy(vs[1][0]);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const st = edges[ei];
    edgeEls.push(
      <g key={"e" + ei}>
        <line className="sl-hit" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={18}
          onClick={(ev) => onEdgeClick(ei, ev)}
          onContextMenu={(ev) => onEdgeClick(ei, ev)} />
        <g className="sl-vis">
          {st === 1 && <line className="sl-line" x1={x1} y1={y1} x2={x2} y2={y2} />}
          {st === 2 && <text className="sl-x" x={mx} y={my} fontSize={CELL * 0.28}>✕</text>}
        </g>
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
            <path d="M8 8 H36 V28 H24 V36 H8 Z" fill="none" stroke="#283353" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="8" r="3.5" fill="#fff" stroke="#283353" strokeWidth="2"/>
            <circle cx="36" cy="8" r="3.5" fill="#fff" stroke="#283353" strokeWidth="2"/>
            <circle cx="36" cy="28" r="3.5" fill="#fff" stroke="#283353" strokeWidth="2"/>
            <circle cx="24" cy="28" r="3.5" fill="#2f6bff" stroke="#283353" strokeWidth="2"/>
            <circle cx="24" cy="36" r="3.5" fill="#fff" stroke="#283353" strokeWidth="2"/>
            <circle cx="8" cy="36" r="3.5" fill="#fff" stroke="#283353" strokeWidth="2"/>
          </svg>
          <h1 className="wordmark">Slitherlink</h1>
        </div>
        <div className="tagline">Close the loop</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(SLDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newPuzzle(k); }}>
              {SLDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{SLIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{SLIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{SLIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck((a) => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && <button className="btn" onClick={runCheck}>{SLIcon.check} Check</button>}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open("slitherlink")}>{SLIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{slFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{validation.onEdges}</div><div className="lbl">Lines</div></div>
        <div className="stat"><div className="num">{R}×{C}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <svg className={"sl-board" + (won ? " won" : "")} viewBox={"0 0 " + W + " " + H}
            onContextMenu={(e) => e.preventDefault()}>
            <g>{dots}</g>
            <g>{edgeEls}</g>
            <g>{clues}</g>
          </svg>
        </div>
      </div>

      <div className="helpline">
        <b>Click</b> an edge between dots to draw a line; click again to remove it. <b>Right-click</b> to mark an edge as empty (✕). Form a single closed loop that satisfies every number.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? SLIcon.warn : SLIcon.info}{toast.msg}
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
            <h2>Loop closed!</h2>
            <p>Every clue is satisfied and the loop is complete.</p>
            <div className="win-stats">
              <div><div className="num">{slFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Moves</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newPuzzle(difficulty)}>
              {SLIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SlitherlinkApp />);
