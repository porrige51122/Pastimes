/* ============================================================
   MinesweeperApp.jsx — game shell, state, controls, win/lose
   ============================================================ */
const Mines = window.Mines;
const MinesBoardCmp = window.MinesBoard;
const { useState: useS, useEffect: useE, useRef: useR, useCallback: useCb, useLayoutEffect: useLE } = React;

const MDIFFS = {
  easy:   { label: "Easy",   rows: 9,  cols: 9,  mines: 10, maxW: 560  },
  medium: { label: "Medium", rows: 16, cols: 16, mines: 40, maxW: 820  },
  hard:   { label: "Hard",   rows: 16, cols: 30, mines: 99, maxW: 1320 },
};

const MIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  flag: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  dig: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  mine: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function mFmtTime(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

const blankBoard = (rows, cols) => {
  const num = [], mine = [];
  for (let r = 0; r < rows; r++) { num.push(new Array(cols).fill(0)); mine.push(new Array(cols).fill(false)); }
  return { rows, cols, mineCount: 0, num, mine };
};
const blankGridM = (rows, cols, fill) => {
  const g = [];
  for (let r = 0; r < rows; r++) g.push(new Array(cols).fill(fill));
  return g;
};

function MinesApp() {
  const [difficulty, setDifficulty] = useS("easy");
  const cfg = MDIFFS[difficulty];

  const [board, setBoard] = useS(() => blankBoard(cfg.rows, cfg.cols));
  const [revealed, setRevealed] = useS(() => blankGridM(cfg.rows, cfg.cols, false));
  const [flags, setFlags] = useS(() => blankGridM(cfg.rows, cfg.cols, 0)); // 0 none · 1 flag · 2 ?
  const [status, setStatus] = useS("ready"); // ready · playing · won · lost
  const [exploded, setExploded] = useS(null);
  const [seconds, setSeconds] = useS(0);
  const [running, setRunning] = useS(false);
  const [flagMode, setFlagMode] = useS(false);
  const [toast, setToast] = useS(null);
  const [motes, setMotes] = useS([]);

  const boardRef = useR(board);
  const revRef = useR(revealed);
  const flagRef = useR(flags);
  const statusRef = useR(status);
  const toastTimer = useR(null);
  useE(() => { boardRef.current = board; }, [board]);
  useE(() => { revRef.current = revealed; }, [revealed]);
  useE(() => { flagRef.current = flags; }, [flags]);
  useE(() => { statusRef.current = status; }, [status]);

  const showToast = useCb((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const newGame = useCb((diff) => {
    const c = MDIFFS[diff];
    const b = blankBoard(c.rows, c.cols);
    const rev = blankGridM(c.rows, c.cols, false);
    const fl = blankGridM(c.rows, c.cols, 0);
    boardRef.current = b; revRef.current = rev; flagRef.current = fl; statusRef.current = "ready";
    setBoard(b); setRevealed(rev); setFlags(fl); setStatus("ready");
    setExploded(null); setSeconds(0); setRunning(false); setMotes([]);
  }, []);

  useE(() => { newGame(difficulty); }, [difficulty]);

  // timer
  useE(() => {
    if (!running || status === "won" || status === "lost") return;
    const t = setInterval(() => setSeconds((s) => (s < 5999 ? s + 1 : s)), 1000);
    return () => clearInterval(t);
  }, [running, status]);

  const flagCount = flags.reduce((a, row) => a + row.reduce((b, v) => b + (v === 1 ? 1 : 0), 0), 0);
  const minesLeft = board.mineCount ? board.mineCount - flagCount : cfg.mines - flagCount;

  const checkWin = useCb((b, rev) => {
    let safeRevealed = 0;
    const need = b.rows * b.cols - b.mineCount;
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.cols; c++)
        if (rev[r][c] && !b.mine[r][c]) safeRevealed++;
    return safeRevealed === need;
  }, []);

  const finishWin = useCb((b) => {
    // auto-flag every mine
    const fl = flagRef.current.map((row) => row.slice());
    for (let r = 0; r < b.rows; r++)
      for (let c = 0; c < b.cols; c++)
        if (b.mine[r][c]) fl[r][c] = 1;
    flagRef.current = fl; setFlags(fl);
    statusRef.current = "won"; setStatus("won"); setRunning(false);
    const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
    const arr = [];
    for (let i = 0; i < 70; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: colors[i % colors.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, []);

  const loseAt = useCb((b, rev, r, c) => {
    const nrev = rev.map((row) => row.slice());
    nrev[r][c] = true; // show the mine we hit
    revRef.current = nrev; setRevealed(nrev);
    setExploded([r, c]);
    statusRef.current = "lost"; setStatus("lost"); setRunning(false);
  }, []);

  const reveal = useCb((r, c) => {
    if (statusRef.current === "won" || statusRef.current === "lost") return;
    if (flagRef.current[r][c] === 1) return; // can't dig a flag

    let b = boardRef.current;
    // first click → generate a safe board
    if (statusRef.current === "ready") {
      b = Mines.generate(cfg.rows, cfg.cols, cfg.mines, r, c);
      boardRef.current = b; setBoard(b);
      statusRef.current = "playing"; setStatus("playing"); setRunning(true);
    }
    if (revRef.current[r][c]) return;

    if (b.mine[r][c]) { loseAt(b, revRef.current, r, c); return; }

    const nrev = revRef.current.map((row) => row.slice());
    Mines.floodReveal(b, nrev, flagRef.current, r, c);
    revRef.current = nrev; setRevealed(nrev);
    if (checkWin(b, nrev)) finishWin(b);
  }, [cfg, checkWin, finishWin, loseAt]);

  const toggleFlag = useCb((r, c) => {
    if (statusRef.current === "won" || statusRef.current === "lost") return;
    if (statusRef.current === "ready") { setRunning(true); statusRef.current = "playing"; setStatus("playing"); }
    if (revRef.current[r][c]) return;
    const fl = flagRef.current.map((row) => row.slice());
    fl[r][c] = (fl[r][c] + 1) % 3; // none → flag → ? → none
    flagRef.current = fl; setFlags(fl);
  }, []);

  const chord = useCb((r, c) => {
    if (statusRef.current !== "playing") return;
    const b = boardRef.current;
    if (!revRef.current[r][c]) return;
    const n = b.num[r][c];
    if (n <= 0) return;
    const nb = Mines.neighbors(r, c, b.rows, b.cols);
    let fcount = 0;
    nb.forEach(([nr, nc]) => { if (flagRef.current[nr][nc] === 1) fcount++; });
    if (fcount !== n) return; // flags must equal the number to chord

    // reveal all non-flagged neighbours
    let hitMine = null;
    const nrev = revRef.current.map((row) => row.slice());
    for (let i = 0; i < nb.length; i++) {
      const [nr, nc] = nb[i];
      if (flagRef.current[nr][nc] === 1 || nrev[nr][nc]) continue;
      if (b.mine[nr][nc]) { hitMine = [nr, nc]; break; }
      Mines.floodReveal(b, nrev, flagRef.current, nr, nc);
    }
    if (hitMine) { loseAt(b, nrev, hitMine[0], hitMine[1]); return; }
    revRef.current = nrev; setRevealed(nrev);
    if (checkWin(b, nrev)) finishWin(b);
  }, [checkWin, finishWin, loseAt]);

  // dev/test hook
  useE(() => {
    window.__solveNow = () => {
      const b = boardRef.current;
      if (b.mineCount === 0) return; // need a generated board first
      const nrev = revRef.current.map((row) => row.slice());
      for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (!b.mine[r][c]) nrev[r][c] = true;
      revRef.current = nrev; setRevealed(nrev);
      finishWin(b);
    };
  }, [finishWin]);

  // ---- fit board to viewport ----
  const [frameW, setFrameW] = useS(MDIFFS.easy.maxW);
  useLE(() => {
    const fit = () => {
      const svg = document.querySelector(".ms-board-svg");
      if (!svg || !svg.viewBox || !svg.viewBox.baseVal.width) return;
      const A = svg.viewBox.baseVal.width / svg.viewBox.baseVal.height;
      const frame = svg.closest(".board-frame");
      if (!frame) return;
      const help = document.querySelector(".helpline");
      const topOffset = frame.getBoundingClientRect().top + window.scrollY;
      const belowReserve = (help ? help.offsetHeight : 50) + 12 + 24 + 8;
      const availH = window.innerHeight - topOffset - belowReserve;
      const padH = 35, padV = 35;
      const wByHeight = (availH - padV) * A + padH;
      const wByWidth = window.innerWidth - 24;
      const w = Math.max(200, Math.floor(Math.min(MDIFFS[difficulty].maxW, wByWidth, wByHeight)));
      setFrameW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [difficulty, board, status]);

  const won = status === "won";
  const lost = status === "lost";

  return (
    <div className="wrap">
      <a className="backlink" href="index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="36" height="36" viewBox="0 0 44 44">
            <rect x="6" y="6" width="32" height="32" rx="7" fill="#fff" stroke="#283353" strokeWidth="2.5"/>
            <circle cx="22" cy="22" r="6" fill="#283353"/>
            <g stroke="#283353" strokeWidth="2.4" strokeLinecap="round">
              <line x1="22" y1="9" x2="22" y2="35"/><line x1="9" y1="22" x2="35" y2="22"/>
              <line x1="13" y1="13" x2="31" y2="31"/><line x1="31" y1="13" x2="13" y2="31"/>
            </g>
            <circle cx="20" cy="20" r="1.8" fill="#fff"/>
          </svg>
          <h1 className="wordmark">Sweep</h1>
        </div>
        <div className="tagline">Clear the field</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(MDIFFS).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newGame(k); }}>
              {MDIFFS[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newGame(difficulty)}>{MIcon.refresh} New</button>
        <div className={"toggle" + (flagMode ? " on" : "")} onClick={() => setFlagMode((f) => !f)}
             title="When on, tapping plants a flag instead of digging — handy on touch screens">
          <span className="switch"></span> Flag mode
        </div>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{mFmtTime(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{minesLeft}</div><div className="lbl">Mines</div></div>
        <div className="stat"><div className="num">{board.rows}×{board.cols}</div><div className="lbl">Grid</div></div>
      </div>

      <div className="board-frame" style={{ width: frameW + "px" }}>
        <div className="board-inner">
          <MinesBoardCmp
            board={board}
            revealed={revealed}
            flags={flags}
            status={status}
            exploded={exploded}
            hint={null}
            pressHint={flagMode ? "flag" : "dig"}
            onReveal={reveal}
            onFlag={toggleFlag}
            onChord={chord}
          />
        </div>
      </div>

      <div className="helpline">
        <b>Click</b> to clear a square, <b>right-click</b> to flag a mine. On a number, <b>middle-click</b> (or click it again) to auto-clear its neighbours once you've flagged enough.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? MIcon.warn : MIcon.info}{toast.msg}
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

      {(won || lost) && (
        <div className="win-overlay">
          <div className={"win-card" + (lost ? " lose" : "")}>
            {won ? (
              <svg width="58" height="58" viewBox="0 0 44 44" style={{margin:"0 auto"}}>
                <rect x="6" y="6" width="32" height="32" rx="8" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
                <path d="M14 22l6 6 11-12" fill="none" stroke="#15a05a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="58" height="58" viewBox="0 0 44 44" style={{margin:"0 auto"}}>
                <rect x="6" y="6" width="32" height="32" rx="8" fill="#fdeae8" stroke="#e23b2e" strokeWidth="2.6"/>
                <circle cx="22" cy="22" r="6" fill="#c32a1f"/>
                <g stroke="#c32a1f" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="22" y1="11" x2="22" y2="33"/><line x1="11" y1="22" x2="33" y2="22"/>
                  <line x1="14.5" y1="14.5" x2="29.5" y2="29.5"/><line x1="29.5" y1="14.5" x2="14.5" y2="29.5"/>
                </g>
              </svg>
            )}
            <h2>{won ? "Swept clean!" : "Boom."}</h2>
            <p>{won ? "Every safe square cleared, every mine flagged." : "You hit a mine — but the field's still here for another go."}</p>
            {won && (
              <div className="win-stats">
                <div><div className="num">{mFmtTime(seconds)}</div><div className="lbl">Time</div></div>
                <div><div className="num">{board.mineCount}</div><div className="lbl">Mines</div></div>
              </div>
            )}
            <button className="btn primary" style={{fontSize:15, padding:"12px 22px"}} onClick={() => newGame(difficulty)}>
              {MIcon.refresh} {won ? "New game" : "Try again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MinesApp />);
