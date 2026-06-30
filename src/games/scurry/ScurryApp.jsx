/* ============================================================
   ScurryApp.jsx — game shell, board, repulsion play, win
   ============================================================ */
const SC = window.Scurry;
const { useState: scS, useEffect: scE, useRef: scR, useCallback: scC, useLayoutEffect: scL } = React;

const SC_DIFF = {
  easy:   { label: 'Small',  rows: 5, cols: 5, k: 6,  maxW: 380 },
  medium: { label: 'Medium', rows: 6, cols: 6, k: 8,  maxW: 480 },
  hard:   { label: 'Large',  rows: 7, cols: 7, k: 11, maxW: 588 },
};

function scFmt(s) {
  const m = (s / 60) | 0, ss = s % 60;
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}

const SCIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  rules:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>,
  info:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

/* the little beetle token */
function Bug({ settled }) {
  return (
    <svg className={"sc-bug-svg" + (settled ? " settled" : "")} viewBox="0 0 32 32" aria-hidden="true">
      <g className="sc-legs" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <line x1="9.5" y1="15" x2="3" y2="11.5"/><line x1="9.5" y1="19" x2="2.6" y2="19.5"/><line x1="9.5" y1="23" x2="4" y2="26.5"/>
        <line x1="22.5" y1="15" x2="29" y2="11.5"/><line x1="22.5" y1="19" x2="29.4" y2="19.5"/><line x1="22.5" y1="23" x2="28" y2="26.5"/>
      </g>
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <line x1="13.4" y1="6.5" x2="10.5" y2="2.2"/><line x1="18.6" y1="6.5" x2="21.5" y2="2.2"/>
      </g>
      <circle cx="16" cy="9.2" r="4.1" fill="currentColor"/>
      <ellipse cx="16" cy="19.4" rx="8.6" ry="10.1" fill="currentColor"/>
      <line className="sc-seam" x1="16" y1="11.5" x2="16" y2="28.6" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ScurryApp() {
  const [difficulty, setDifficulty] = scS('easy');
  const [puzzle,  setPuzzle]  = scS(null);
  const [bugs,    setBugs]    = scS([]);
  const [history, setHistory] = scS([]);
  const [moves,   setMoves]   = scS(0);
  const [seconds, setSeconds] = scS(0);
  const [running, setRunning] = scS(false);
  const [won,     setWon]     = scS(false);
  const [toast,   setToast]   = scS(null);
  const [motes,   setMotes]   = scS([]);
  const [loading, setLoading] = scS(false);
  const [frameW,  setFrameW]  = scS(SC_DIFF.easy.maxW);

  const idRef = scR(1);
  const toastTimer = scR(null);

  const showToast = scC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newPuzzle = scC((diff) => {
    const cfg = SC_DIFF[diff];
    setLoading(true);
    setTimeout(() => {
      let p = null;
      for (let i = 0; i < 3 && !p; i++) p = SC.generate(cfg);
      if (!p) { showToast('Could not build a puzzle — try again', true); setLoading(false); return; }
      idRef.current = 1;
      setPuzzle(p);
      setBugs([]); setHistory([]); setMoves(0); setSeconds(0);
      setRunning(false); setWon(false); setMotes([]); setLoading(false);
    }, 40);
  }, [showToast]);

  scE(() => { newPuzzle(difficulty); }, [difficulty]);

  scE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const yellowSet = puzzle ? new Set(puzzle.yellow) : new Set();
  const cols = puzzle ? puzzle.cols : 0;
  const rows = puzzle ? puzzle.rows : 0;

  const solved = !!puzzle && bugs.length === puzzle.k &&
    bugs.every(b => yellowSet.has(b.r * cols + b.c));

  scE(() => {
    if (!puzzle || won || !solved) return;
    setWon(true); setRunning(false);
    const colors = ['#2f6bff', '#15a05a', '#f5a623', '#e23b2e', '#0ea5c4'];
    setMotes(Array.from({ length: 70 }, (_, i) => ({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 10,
      color: colors[i % colors.length], delay: Math.random() * 0.8,
      dur: 2.2 + Math.random() * 2.2, rot: Math.random() * 360,
    })));
  }, [solved, puzzle, won]);

  const placeAt = scC((idx) => {
    if (!puzzle || won || loading) return;
    const occupied = bugs.some(b => b.r * cols + b.c === idx);
    if (occupied) { showToast('That tile is taken — place on an empty square'); return; }
    setHistory(h => [...h, bugs.map(b => ({ id: b.id, r: b.r, c: b.c }))]);
    const next = SC.step(bugs, idx, rows, cols, idRef.current++);
    setBugs(next);
    setMoves(m => m + 1);
    if (!running) setRunning(true);
  }, [puzzle, won, loading, bugs, cols, rows, running, showToast]);

  const undo = scC(() => {
    setHistory(h => {
      if (!h.length) return h;
      setBugs(h[h.length - 1]);
      setWon(false);
      return h.slice(0, -1);
    });
  }, []);

  const clearAll = scC(() => {
    if (!bugs.length) return;
    setHistory(h => [...h, bugs.map(b => ({ id: b.id, r: b.r, c: b.c }))]);
    setBugs([]); setWon(false);
  }, [bugs]);

  /* responsive fit (mirrors the other games) */
  scL(() => {
    const fit = () => {
      if (!puzzle) return;
      const frame = document.querySelector('.board-frame');
      if (!frame) return;
      const helpEl = document.querySelector('.helpline');
      const topOff = frame.getBoundingClientRect().top + window.scrollY;
      const below  = (helpEl ? helpEl.offsetHeight : 50) + 36;
      const availH = window.innerHeight - topOff - below;
      const A = puzzle.cols / puzzle.rows;       /* width / height of board */
      const wByH = (availH - 35) * A + 35;
      const wByW = window.innerWidth - 24;
      const w = Math.max(220, Math.floor(Math.min(SC_DIFF[difficulty].maxW, wByW, wByH)));
      setFrameW(prev => Math.abs(prev - w) > 1 ? w : prev);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [difficulty, puzzle]);

  if (!puzzle || loading) {
    return (
      <div className="wrap">
        <div className="masthead">
          <div className="brandmark"><SCBrandIcon /><h1 className="wordmark">Scurry</h1></div>
          <div className="tagline">{loading ? 'Scattering the bugs\u2026' : 'Crowd a bug onto every square'}</div>
        </div>
      </div>
    );
  }

  const innerW = frameW - 32;                       /* board-frame padding 16 */
  const cell = Math.max(28, Math.floor(innerW / cols));
  const W = cell * cols, H = cell * rows;
  const settledCount = bugs.reduce((n, b) => n + (yellowSet.has(b.r * cols + b.c) ? 1 : 0), 0);

  const cellEls = [];
  for (let i = 0; i < rows * cols; i++) {
    const r = (i / cols) | 0, c = i % cols;
    const isTarget = yellowSet.has(i);
    const hasBug = bugs.some(b => b.r * cols + b.c === i);
    const filled = isTarget && hasBug;
    cellEls.push(
      <div key={i}
        className={"sc-cell" + (isTarget ? " target" : "") + (filled ? " filled" : "")}
        onClick={() => placeAt(i)}>
        {isTarget && <span className="sc-mark"></span>}
      </div>
    );
  }

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>

      <div className="masthead">
        <div className="brandmark"><SCBrandIcon /><h1 className="wordmark">Scurry</h1></div>
        <div className="tagline">Crowd a bug onto every square</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(SC_DIFF).map(kk => (
            <button key={kk} className={difficulty === kk ? 'active' : ''}
              onClick={() => kk !== difficulty ? setDifficulty(kk) : newPuzzle(kk)}>
              {SC_DIFF[kk].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newPuzzle(difficulty)} disabled={loading}>{SCIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{SCIcon.undo} Undo</button>
        <button className="btn" onClick={clearAll} disabled={!bugs.length}>{SCIcon.reset} Clear</button>
        <button className="btn" onClick={() => window.PastimesRules && window.PastimesRules.open('scurry')}>{SCIcon.rules} Rules</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{scFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{settledCount}<span className="sc-of">/{puzzle.k}</span></div><div className="lbl">Settled</div></div>
        <div className="stat"><div className="num">{bugs.length}</div><div className="lbl">Bugs</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + 'px' }}>
        <div className="board-inner">
          <div className={"sc-board" + (won ? " won" : "")} style={{ width: W, height: H }}
            onContextMenu={e => e.preventDefault()}>
            <div className="sc-cells" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}>
              {cellEls}
            </div>
            <div className="sc-bugs">
              {bugs.map(b => {
                const settled = yellowSet.has(b.r * cols + b.c);
                return (
                  <div key={b.id} className="sc-bug" style={{ left: b.c * cell, top: b.r * cell, width: cell, height: cell }}>
                    <Bug settled={settled} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="helpline">
        <b>Click</b> a square to drop a bug. Any bugs in the eight squares around it <b>scurry one step away</b> —
        shoving others along in a chain unless the wall stops them. Land a bug on <b>every yellow square</b>, and nowhere else.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>{SCIcon.info} {toast.msg}</div>
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
            <h2>All settled!</h2>
            <p>Every square has its bug — and not one to spare.</p>
            <div className="win-stats">
              <div><div className="num">{scFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{moves}</div><div className="lbl">Bugs placed</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: '12px 22px' }}
              onClick={() => newPuzzle(difficulty)}>{SCIcon.refresh} New puzzle</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SCBrandIcon() {
  return (
    <svg width="38" height="38" viewBox="0 0 44 44" aria-hidden="true">
      <rect x="4" y="4" width="36" height="36" rx="7" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
      <line x1="4" y1="16" x2="40" y2="16" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="4" y1="28" x2="40" y2="28" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="16" y1="4" x2="16" y2="40" stroke="#d2dae5" strokeWidth="1.1"/>
      <line x1="28" y1="4" x2="28" y2="40" stroke="#d2dae5" strokeWidth="1.1"/>
      <rect x="28" y="4" width="12" height="12" fill="#f5a623" opacity="0.5"/>
      <g transform="translate(16,22)">
        <g stroke="#1d2740" strokeWidth="1.8" strokeLinecap="round">
          <line x1="-3.5" y1="-2" x2="-7.5" y2="-4"/><line x1="-3.5" y1="1" x2="-8" y2="1"/><line x1="-3.5" y1="4" x2="-7" y2="6.5"/>
          <line x1="3.5" y1="-2" x2="7.5" y2="-4"/><line x1="3.5" y1="1" x2="8" y2="1"/><line x1="3.5" y1="4" x2="7" y2="6.5"/>
          <line x1="-1.6" y1="-7.5" x2="-3.4" y2="-10.5"/><line x1="1.6" y1="-7.5" x2="3.4" y2="-10.5"/>
        </g>
        <circle cx="0" cy="-5.5" r="2.7" fill="#1d2740"/>
        <ellipse cx="0" cy="1.6" rx="5.4" ry="6.5" fill="#1d2740"/>
      </g>
    </svg>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ScurryApp />);
