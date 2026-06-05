/* ============================================================
   CountdownApp.jsx — numbers round: deal, combine, validate
   ============================================================ */
const CD = window.Countdown;
const { useState: uS, useEffect: uE, useRef: uR, useCallback: uC } = React;

const CDIFF = {
  easy:   { label: "Easy",   tmin: 100, tmax: 349, big: [1, 2] },
  medium: { label: "Medium", tmin: 100, tmax: 699, big: [1, 2] },
  hard:   { label: "Hard",   tmin: 300, tmax: 999, big: [0, 2] },
};

const CIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>,
  bulb: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function cFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

let CD_UID = 0;

function CountdownApp() {
  const [difficulty, setDifficulty] = uS("easy");
  const [target, setTarget] = uS(0);
  const [tiles, setTiles] = uS([]);          // {id,value,big,used,result,fresh}
  const [steps, setSteps] = uS([]);          // {a,op,b,r}
  const [history, setHistory] = uS([]);      // snapshots {tiles,steps}
  const [selId, setSelId] = uS(null);
  const [armed, setArmed] = uS(null);        // operator char
  const [seconds, setSeconds] = uS(0);
  const [running, setRunning] = uS(false);
  const [won, setWon] = uS(false);
  const [solution, setSolution] = uS(null);
  const [showSol, setShowSol] = uS(false);
  const [toast, setToast] = uS(null);
  const [motes, setMotes] = uS([]);

  const toastTimer = uR(null);
  const showToast = uC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  }, []);

  const deal = uC((diff) => {
    const cfg = CDIFF[diff];
    const big = cfg.big[0] + Math.floor(Math.random() * (cfg.big[1] - cfg.big[0] + 1));
    const nums = CD.dealNumbers(big);
    const tgt = CD.randTarget(cfg.tmin, cfg.tmax);
    const t = nums.map((v) => ({ id: ++CD_UID, value: v, big: v >= 25, used: false, result: false, fresh: false }));
    setTarget(tgt); setTiles(t); setSteps([]); setHistory([]);
    setSelId(null); setArmed(null); setSeconds(0); setRunning(false);
    setWon(false); setSolution(null); setShowSol(false); setMotes([]);
    // solve in background
    setTimeout(() => { try { setSolution(CD.solve(nums, tgt)); } catch (e) {} }, 20);
  }, []);

  uE(() => { deal(difficulty); }, [difficulty]);

  uE(() => {
    if (!running || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const fireWin = uC(() => {
    setWon(true); setRunning(false);
    const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#283353"];
    const arr = [];
    for (let i = 0; i < 80; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: colors[i % colors.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, []);

  // closest the player has reached so far
  const reached = tiles.filter((t) => !t.used).map((t) => t.value);
  const bestDist = reached.length ? Math.min(...reached.map((v) => Math.abs(v - target))) : Infinity;

  const snapshot = uC(() => setHistory((h) => [...h, { tiles: tiles.map((t) => ({ ...t })), steps: steps.slice() }]), [tiles, steps]);

  const combine = uC((aTile, op, bTile) => {
    const hi = Math.max(aTile.value, bTile.value);
    const lo = Math.min(aTile.value, bTile.value);
    let r = null;
    if (op === "+") r = hi + lo;
    else if (op === "×") r = hi * lo;
    else if (op === "−") { if (hi - lo <= 0) { showToast("That can't go below zero", true); return; } r = hi - lo; }
    else if (op === "÷") { if (lo === 0 || hi % lo !== 0) { showToast("Division must come out whole", true); return; } r = hi / lo; }
    if (r == null) return;

    if (!running) setRunning(true);
    setHistory((h) => [...h, { tiles: tiles.map((t) => ({ ...t })), steps: steps.slice() }]);

    const newId = ++CD_UID;
    setTiles((prev) => {
      const next = prev.map((t) =>
        (t.id === aTile.id || t.id === bTile.id) ? { ...t, used: true } : { ...t, fresh: false });
      next.push({ id: newId, value: r, big: false, used: false, result: true, fresh: true });
      return next;
    });
    setSteps((prev) => [...prev, { a: hi, op, b: lo, r }]);
    setSelId(null); setArmed(null);

    if (r === target) setTimeout(fireWin, 250);
  }, [tiles, steps, running, target, showToast, fireWin]);

  const onTile = uC((tile) => {
    if (won || tile.used) return;
    if (selId == null) { setSelId(tile.id); return; }
    if (selId === tile.id) { setSelId(null); setArmed(null); return; }
    if (!armed) { setSelId(tile.id); return; }     // reselect operand A
    const a = tiles.find((t) => t.id === selId);
    if (a) combine(a, armed, tile);
  }, [won, selId, armed, tiles, combine]);

  const onOp = uC((op) => {
    if (won) return;
    if (selId == null) { showToast("Pick a number first"); return; }
    setArmed((cur) => (cur === op ? null : op));
  }, [won, selId, showToast]);

  const undo = uC(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setTiles(prev.tiles.map((t) => ({ ...t, fresh: false })));
      setSteps(prev.steps);
      setSelId(null); setArmed(null);
      return h.slice(0, -1);
    });
  }, []);

  const restart = uC(() => {
    setTiles((prev) => prev.filter((t) => !t.result).map((t) => ({ ...t, used: false, fresh: false })));
    setSteps([]); setHistory([]); setSelId(null); setArmed(null);
  }, []);

  const ops = ["+", "−", "×", "÷"];
  const targetHit = won || tiles.some((t) => !t.used && t.value === target);

  let awayText, awayHit = false;
  if (targetHit) { awayText = "Spot on!"; awayHit = true; }
  else if (bestDist === Infinity) awayText = "—";
  else if (bestDist === 0) awayText = "Reached!";
  else awayText = bestDist + " away";

  return (
    <div className="wrap">
      <a className="backlink" href="index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="38" height="38" viewBox="0 0 44 44">
            <rect x="3.5" y="3.5" width="37" height="37" rx="10" fill="#fff" stroke="#283353" strokeWidth="2.6"/>
            <text x="22" y="23" fontFamily="Spectral, serif" fontWeight="800" fontSize="20" fill="#2f6bff" textAnchor="middle" dominantBaseline="central">7</text>
            <text x="13" y="13" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="9" fill="#283353" textAnchor="middle" dominantBaseline="central">+</text>
            <text x="31" y="31" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="9" fill="#283353" textAnchor="middle" dominantBaseline="central">×</text>
          </svg>
          <h1 className="wordmark">Countdown</h1>
        </div>
        <div className="tagline">Reach the target number</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(CDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else deal(k); }}>
              {CDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => deal(difficulty)}>{CIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!history.length}>{CIcon.undo} Undo</button>
        <button className="btn" onClick={restart} disabled={!steps.length}>{CIcon.reset} Restart</button>
        <button className="btn" onClick={() => setShowSol((s) => !s)} disabled={!solution}>{CIcon.bulb} {showSol ? "Hide" : "Best"}</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{cFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{steps.length}</div><div className="lbl">Steps</div></div>
        <div className="stat"><div className="num">{awayHit ? "0" : (bestDist === Infinity ? "—" : bestDist)}</div><div className="lbl">Away</div></div>
      </div>

      <div className="cd-wrap">
        <div className={"cd-target" + (targetHit ? " hit" : "")}>
          <div className="lbl">Target</div>
          <div className="val">{target}</div>
        </div>

        <div className="cd-pool">
          {tiles.map((t) => (
            <button key={t.id}
              className={"cd-tile" + (t.big ? " big" : "") + (t.result ? " result" : "") +
                (t.id === selId ? " sel" : "") + (t.used ? " used" : "") + (t.fresh ? " pop" : "")}
              onClick={() => onTile(t)} disabled={t.used || won}>
              {t.value}
            </button>
          ))}
        </div>

        <div className="cd-ops">
          {ops.map((op) => (
            <button key={op} className={"cd-op" + (armed === op ? " armed" : "")}
              onClick={() => onOp(op)} disabled={won}>{op}</button>
          ))}
        </div>

        <div className="cd-log">
          <div className="cd-log-head">
            <span>Working</span>
            <span className={"away" + (awayHit ? " hit" : "")}><b>{awayText}</b></span>
          </div>
          <ol className="cd-steps">
            {steps.map((s, i) => (
              <li key={i} className={"cd-step" + (s.r === target ? " target" : "")}>
                <span className="idx">{i + 1}</span>
                {s.a} <span className="eq">{s.op}</span> {s.b} <span className="eq">=</span> <span className="res">{s.r}</span>
              </li>
            ))}
          </ol>
        </div>

        {showSol && solution && (
          <div className="cd-solution">
            {solution.diff === 0
              ? <>A way to hit it: <code>{CD.pretty(solution.expr)} = {solution.value}</code></>
              : <>No exact solution from these numbers. Closest possible is <b>{solution.value}</b> ({solution.diff} away): <code>{CD.pretty(solution.expr)}</code></>}
          </div>
        )}
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? CIcon.warn : CIcon.info}{toast.msg}
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
            <h2>Bang on {target}!</h2>
            <p>You reached the target in {steps.length} step{steps.length === 1 ? "" : "s"}.</p>
            <div className="win-stats">
              <div><div className="num">{cFmt(seconds)}</div><div className="lbl">Time</div></div>
              <div><div className="num">{steps.length}</div><div className="lbl">Steps</div></div>
            </div>
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => deal(difficulty)}>
              {CIcon.refresh} New numbers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CountdownApp />);
