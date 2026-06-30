/* ============================================================
   MeanderApp.jsx — game shell, SVG board, state, controls
   ============================================================ */
const LR = window.Meander;
const { useState: lrS, useEffect: lrE, useRef: lrR, useCallback: lrC, useLayoutEffect: lrL } = React;

const DIFF = {
  easy:   { label: 'Small',  rows: 5, cols: 5, diff: 'easy',   maxW: 380 },
  medium: { label: 'Medium', rows: 7, cols: 7, diff: 'medium', maxW: 520 },
  hard:   { label: 'Large',  rows: 9, cols: 9, diff: 'hard',   maxW: 660 },
};

const CELL = 60;
const PAD  = 30;

function lrCx(c) { return PAD + c * CELL + CELL / 2; }
function lrCy(r) { return PAD + r * CELL + CELL / 2; }
function lrFmt(s) {
  const m = (s / 60) | 0, ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

const LRIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  check:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  warn:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
  rules:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
};

function MeanderApp() {
  const [difficulty, setDifficulty] = lrS('easy');
  const [puzzle,     setPuzzle]     = lrS(null);
  const [playerEdges,setPlayerEdges]= lrS([]);
  const [history,    setHistory]    = lrS([]);
  const [moves,      setMoves]      = lrS(0);
  const [seconds,    setSeconds]    = lrS(0);
  const [running,    setRunning]    = lrS(false);
  const [autoCheck,  setAutoCheck]  = lrS(true);
  const [flashUntil, setFlashUntil] = lrS(0);
  const [won,        setWon]        = lrS(false);
  const [toast,      setToast]      = lrS(null);
  const [motes,      setMotes]      = lrS([]);
  const [loading,    setLoading]    = lrS(false);
  const [frameW,     setFrameW]     = lrS(DIFF.easy.maxW);

  const toastTimer = lrR(null);
  const dragRef    = lrR({ active: false, target: 0, visited: null });

  const showToast = lrC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const newPuzzle = lrC((diff) => {
    const cfg = DIFF[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null;
      for (let i = 0; i < 4 && !p; i++) p = LR.generate(cfg);
      if (!p) {
        showToast('Could not build a puzzle — try again', true);
        setLoading(false);
        return;
      }
      const ne = LR.NE(p.rows, p.cols);
      setPuzzle(p);
      setPlayerEdges(new Array(ne).fill(0));
      setHistory([]); setMoves(0); setSeconds(0);
      setRunning(false); setWon(false); setMotes([]);
      setLoading(false);
    }, 50);
  }, [showToast]);

  lrE(() => { newPuzzle(difficulty); }, [difficulty]);

  lrE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const validation = puzzle
    ? LR.validate(puzzle, playerEdges)
    : { cellStatus: [], onEdges: 0, solved: false };
  const showErrors = autoCheck || Date.now() < flashUntil;

  lrE(() => {
    if (!puzzle || won || !validation.solved) return;
    setWon(true); setRunning(false);
    const colors = ['#2f6bff', '#15a05a', '#f5a623', '#e23b2e', '#0ea5c4'];
    setMotes(Array.from({ length: 68 }, (_, i) => ({
      id: i,
      left:  Math.random() * 100,
      size:  7 + Math.random() * 10,
      color: colors[i % colors.length],
      delay: Math.random() * 0.8,
      dur:   2.2 + Math.random() * 2.2,
      rot:   Math.random() * 360,
    })));
  }, [validation.solved, puzzle, won]);

  const edgeFromPoint = lrC((e) => {
    let el = document.elementFromPoint(e.clientX, e.clientY);
    while (el && el.tagName !== 'svg') {
      const v = el.getAttribute && el.getAttribute('data-ei');
      if (v != null) return +v;
      el = el.parentElement;
    }
    return -1;
  }, []);

  const onSvgDown = lrC((e) => {
    if (won) return;
    if (e.button !== 0 && e.button !== 2) return;
    const ei = edgeFromPoint(e);
    if (ei < 0 || !puzzle || puzzle.fixed[ei]) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    const right  = e.button === 2;
    const cur    = playerEdges[ei];
    const target = right ? (cur === 2 ? 0 : 2) : (cur === 1 ? 0 : 1);
    dragRef.current = { active: true, target, visited: new Set([ei]) };
    setHistory(h => [...h, playerEdges.slice()]);
    setPlayerEdges(es => { const n = es.slice(); n[ei] = target; return n; });
    setMoves(m => m + 1);
    if (!running) setRunning(true);
  }, [won, playerEdges, running, puzzle]);

  const onSvgMove = lrC((e) => {
    if (!dragRef.current.active || won) return;
    const ei = edgeFromPoint(e);
    if (ei < 0 || dragRef.current.visited.has(ei)) return;
    if (puzzle && puzzle.fixed[ei]) return;
    dragRef.current.visited.add(ei);
    const tgt = dragRef.current.target;
    setPlayerEdges(es => { const n = es.slice(); n[ei] = tgt; return n; });
  }, [won, puzzle]);

  const onSvgUp = lrC(() => { dragRef.current.active = false; }, []);

  const undo = lrC(() => {
    setHistory(h => {
      if (!h.length) return h;
      setPlayerEdges(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = lrC(() => {
    if (!puzzle) return;
    if (playerEdges.some(e => e > 0)) {
      setHistory(h => [...h, playerEdges.slice()]);
      setPlayerEdges(new Array(LR.NE(puzzle.rows, puzzle.cols)).fill(0));
    }
    setWon(false);
  }, [puzzle, playerEdges]);

  const runCheck = lrC(() => {
    if (!puzzle) return;
    setFlashUntil(Date.now() + 1800);
    const v = LR.validate(puzzle, playerEdges);
    if (v.solved) return;
    const hasAny = playerEdges.some(e => e === 1);
    if (!hasAny) { showToast('Click between cells to draw the river'); return; }
    const errors = v.cellStatus.flat().filter(s => s === 'over').length;
    if (errors) showToast(errors + ' cell' + (errors > 1 ? 's have' : ' has') + ' too many connections', true);
    else showToast('No mistakes yet — keep the river flowing');
  }, [puzzle, playerEdges, showToast]);

  lrE(() => {
    if (Date.now() < flashUntil) {
      const t = setTimeout(() => setFlashUntil(f => f), flashUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [flashUntil]);

  lrL(() => {
    const fit = () => {
      if (!puzzle) return;
      const R = puzzle.rows, C = puzzle.cols;
      const W = PAD * 2 + C * CELL, H = PAD * 2 + R * CELL;
      const A = W / H;
      const frame = document.querySelector('.board-frame');
      if (!frame) return;
      const helpEl = document.querySelector('.helpline');
      const topOff = frame.getBoundingClientRect().top + window.scrollY;
      const below  = (helpEl ? helpEl.offsetHeight : 50) + 36;
      const availH = window.innerHeight - topOff - below;
      const wByH   = (availH - 35) * A + 35;
      const wByW   = window.innerWidth - 24;
      const w = Math.max(220, Math.floor(Math.min(DIFF[difficulty].maxW, wByW, wByH)));
      setFrameW(prev => Math.abs(prev - w) > 1 ? w : prev);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [difficulty, puzzle]);

  /* ---- loading / empty state ---- */
  if (!puzzle || loading) {
    return (
      <div className="wrap">
        <div className="masthead">
          <div className="brandmark">
            <LRBrandIcon />
            <h1 className="wordmark">Meander</h1>
          </div>
          <div className="tagline">{loading ? 'Charting the river\u2026' : 'Guide the river home'}</div>
        </div>
      </div>
    );
  }

  const R  = puzzle.rows, C = puzzle.cols;
  const W  = PAD * 2 + C * CELL, H = PAD * 2 + R * CELL;
  const ne = LR.NE(R, C);
  const N  = R * C;

  let activeEdges = 0;
  for (let i = 0; i < ne; i++) if (playerEdges[i] === 1 || puzzle.fixed[i]) activeEdges++;

  /* ---- lattice tracks (the grid the river runs ON) ---- */
  const trackLines = [];
  for (let ei = 0; ei < ne; ei++) {
    const [tr1, tc1, tr2, tc2] = LR.edgeCoords(R, C, ei);
    trackLines.push(
      <line key={`t_${ei}`} className="lr-track"
        x1={lrCx(tc1)} y1={lrCy(tr1)} x2={lrCx(tc2)} y2={lrCy(tr2)} />
    );
  }

  /* ---- lattice nodes (one dot per cell) ---- */
  const nodeEls = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if ((r === puzzle.startR && c === puzzle.startC) ||
        (r === puzzle.endR   && c === puzzle.endC)) continue; // IN/OUT drawn separately
    const st = (validation.cellStatus[r] && validation.cellStatus[r][c]) || 'empty';
    const touched = st !== 'empty';
    const over = showErrors && st === 'over';
    nodeEls.push(
      <g key={`n_${r}_${c}`} pointerEvents="none">
        {over && (
          <circle cx={lrCx(c)} cy={lrCy(r)} r={CELL * 0.22}
            fill="var(--error-tint)" stroke="var(--error)" strokeWidth={2.4} />
        )}
        <circle cx={lrCx(c)} cy={lrCy(r)} r={touched ? CELL * 0.085 : CELL * 0.06}
          className={touched ? "lr-node on" : "lr-node"}
          style={{ transition: 'r .15s, fill .15s' }} />
      </g>
    );
  }

  /* ---- edge elements ---- */
  const edgeEls = [];
  for (let ei = 0; ei < ne; ei++) {
    const [r1, c1, r2, c2] = LR.edgeCoords(R, C, ei);
    const x1 = lrCx(c1), y1 = lrCy(r1), x2 = lrCx(c2), y2 = lrCy(r2);
    const isFixed = !!puzzle.fixed[ei];
    const pval    = playerEdges[ei];
    const isOn    = pval === 1;
    const isX     = pval === 2;

    edgeEls.push(
      <g key={`e_${ei}`} data-ei={ei}>
        {!isFixed && <line className="lr-hit" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={26} />}
        {isFixed && <line className="lr-line-fixed" x1={x1} y1={y1} x2={x2} y2={y2} />}
        {!isFixed && isOn && <line className="lr-line-player" x1={x1} y1={y1} x2={x2} y2={y2} />}
        {isX && (
          <text className="lr-x" x={(x1 + x2) / 2} y={(y1 + y2) / 2}
            fontSize={CELL * 0.25} pointerEvents="none">✕</text>
        )}
      </g>
    );
  }

  /* ---- IN / OUT markers ---- */
  const MR = CELL * 0.27;
  const entX = lrCx(puzzle.startC), entY = lrCy(puzzle.startR);
  const extX = lrCx(puzzle.endC),   extY = lrCy(puzzle.endR);

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>

      <div className="masthead">
        <div className="brandmark">
          <LRBrandIcon />
          <h1 className="wordmark">Meander</h1>
        </div>
        <div className="tagline">Guide the river home</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(DIFF).map(k => (
            <button key={k} className={difficulty === k ? 'active' : ''}
              onClick={() => k !== difficulty ? setDifficulty(k) : newPuzzle(k)}>
              {DIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>
          {LRIcon.refresh} New
        </button>
        <button className="btn" onClick={undo} disabled={!history.length}>{LRIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll}>{LRIcon.reset} Clear</button>
        <div className={"toggle" + (autoCheck ? " on" : "")} onClick={() => setAutoCheck(a => !a)}>
          <span className="switch"></span> Auto-check
        </div>
        {!autoCheck && (
          <button className="btn" onClick={runCheck}>{LRIcon.check} Check</button>
        )}
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open('meander')}>
          {LRIcon.rules} Rules
        </button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{lrFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{activeEdges}</div><div className="lbl">Segments</div></div>
        <div className="stat"><div className="num">{N - 1}</div><div className="lbl">Needed</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + 'px' }}>
        <div className="board-inner">
          <svg className={"lr-board" + (won ? " won" : "")}
            viewBox={`0 0 ${W} ${H}`}
            onPointerDown={onSvgDown}
            onPointerMove={onSvgMove}
            onPointerUp={onSvgUp}
            onPointerCancel={onSvgUp}
            onContextMenu={e => e.preventDefault()}>

            <rect x={PAD} y={PAD} width={C * CELL} height={R * CELL} fill="var(--panel)" rx={2} />
            <g>{trackLines}</g>
            <g>{edgeEls}</g>
            <g>{nodeEls}</g>

            {/* IN marker */}
            <g pointerEvents="none">
              <circle cx={entX} cy={entY} r={MR} fill="var(--done)" />
              <text x={entX} y={entY} className="lr-ep" fontSize={CELL * 0.21}
                fill="#fff" textAnchor="middle" dominantBaseline="central"
                fontFamily="Nunito, sans-serif" fontWeight="900">IN</text>
            </g>

            {/* OUT marker */}
            <g pointerEvents="none">
              <circle cx={extX} cy={extY} r={MR} fill="var(--gold)" />
              <text x={extX} y={extY} className="lr-ep" fontSize={CELL * 0.195}
                fill="#fff" textAnchor="middle" dominantBaseline="central"
                fontFamily="Nunito, sans-serif" fontWeight="900">OUT</text>
            </g>
          </svg>
        </div>
      </div>

      <div className="helpline">
        Route the river from <b>IN</b> to <b>OUT</b> through every cell exactly once.{' '}
        <b>Click</b> or <b>drag</b> between cells to draw; <b>right-click</b> to mark a gap (✕).
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? LRIcon.warn : LRIcon.info} {toast.msg}
          </div>
        </div>
      )}

      {motes.map(m => (
        <div key={m.id} className="mote" style={{
          left: m.left + 'vw', width: m.size, height: m.size * 0.6,
          background: m.color, transform: `rotate(${m.rot}deg)`,
          animationDuration: m.dur + 's', animationDelay: m.delay + 's',
        }} />
      ))}

      {won && (
        <div className="win-overlay">
          <div className="win-card">
            <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="22" cy="22" r="19" fill="var(--done-tint)" stroke="var(--done)" strokeWidth="2.6"/>
              <path d="M14 22.5L19.5 28L31 16" fill="none" stroke="var(--done)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>River flows!</h2>
            <p>Every cell reached — the river finds its way.</p>
            <div className="win-stats">
              <div><div className="num">{lrFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Moves</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: '12px 22px' }}
              onClick={() => newPuzzle(difficulty)}>
              {LRIcon.refresh} New puzzle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LRBrandIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 44 44" aria-hidden="true">
      <rect x="4" y="4" width="36" height="36" rx="7" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
      <line x1="4"  y1="16" x2="40" y2="16" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="4"  y1="28" x2="40" y2="28" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="16" y1="4"  x2="16" y2="40" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="28" y1="4"  x2="28" y2="40" stroke="#d2dae5" strokeWidth="1.1"/>
      <path d="M10 10 H22 V22 H34 V34" stroke="#0ea5c4" strokeWidth="3.6"
        fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="4.5" fill="#15a05a"/>
      <circle cx="34" cy="34" r="4.5" fill="#f5a623"/>
    </svg>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MeanderApp />);
