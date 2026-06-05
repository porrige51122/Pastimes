/* ============================================================
   MastermindApp.jsx — colour code-breaker
   ============================================================ */
const MM = window.Mastermind;
const { useState: mS, useEffect: mE, useRef: mR, useCallback: mC, useLayoutEffect: mL } = React;

const MMDIFF = {
  easy:   { label: "Easy",   slots: 4, colors: 6, tries: 8 },
  medium: { label: "Medium", slots: 5, colors: 6, tries: 10 },
  hard:   { label: "Hard",   slots: 6, colors: 7, tries: 12 },
};

const MMIcon = {
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12H9"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  erase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l8-8a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 6"/><path d="m18 9-6 6"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>,
};

function mmFmt(s) { const m = Math.floor(s / 60), ss = s % 60; return m + ":" + (ss < 10 ? "0" : "") + ss; }

function Peg({ color, cls }) {
  return <div className={"mm-slot " + cls + (color != null ? " filled c" + color : " empty")}>
    {color != null && <span className="gloss" />}
  </div>;
}

function MastermindApp() {
  const [difficulty, setDifficulty] = mS("easy");
  const [cfg, setCfg] = mS(MMDIFF.easy);
  const [secret, setSecret] = mS([]);
  const [rows, setRows] = mS([]);        // submitted: {pegs:[], black, white}
  const [current, setCurrent] = mS([]);  // working row: array of color|null
  const [curSlot, setCurSlot] = mS(0);
  const [seconds, setSeconds] = mS(0);
  const [running, setRunning] = mS(false);
  const [over, setOver] = mS(null);      // null | "won" | "lost"
  const [toast, setToast] = mS(null);
  const [motes, setMotes] = mS([]);
  const [peg, setPeg] = mS(40);
  const [boardMax, setBoardMax] = mS(null);
  const boardRef = mR(null);

  // size pegs to width; cap board height so the palette stays in view
  mL(() => {
    const fit = () => {
      const el = boardRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const belowReserve = 44 + 18 + 70 + 30; // tray + legend + helpline + gaps
      const availH = window.innerHeight - top - belowReserve;
      setBoardMax(Math.max(150, availH));
      const availW = Math.min(440, window.innerWidth - 32);
      // width: rownum(20) + gap(12) + slots*(peg+9) + feedback(~44) + padding(24)
      const pByW = Math.floor((availW - 24 - 20 - 12 - 44) / cfg.slots) - 9;
      setPeg(Math.max(26, Math.min(44, pByW)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [cfg, over]);

  // keep the active guess row in view (not the empty rows below it)
  mE(() => {
    const el = boardRef.current;
    if (!el) return;
    const active = el.querySelector(".mm-row.active") || el.querySelector(".mm-row.done:last-of-type");
    if (!active) { el.scrollTop = 0; return; }
    const target = active.offsetTop + active.offsetHeight - el.clientHeight + 8;
    el.scrollTop = Math.max(0, target);
  }, [rows, boardMax, over]);

  const toastTimer = mR(null);
  const showToast = mC((msg, warn) => {
    setToast({ id: Date.now() + Math.random(), msg, warn: !!warn });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  }, []);

  const newGame = mC((diff) => {
    const c = MMDIFF[diff];
    setCfg(c);
    setSecret(MM.makeSecret(c.slots, c.colors));
    setRows([]); setCurrent(new Array(c.slots).fill(null)); setCurSlot(0);
    setSeconds(0); setRunning(false); setOver(null); setMotes([]);
  }, []);

  mE(() => { newGame(difficulty); }, [difficulty]);

  mE(() => {
    if (!running || over) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, over]);

  const fireWin = mC(() => {
    const colors = ["#2f6bff", "#15a05a", "#f5a623", "#e23b2e", "#7a5af0", "#19b6c9"];
    const arr = [];
    for (let i = 0; i < 80; i++) arr.push({
      id: i, left: Math.random() * 100, size: 7 + Math.random() * 9,
      color: colors[i % colors.length], delay: Math.random() * 0.7,
      dur: 2.4 + Math.random() * 2.2, rot: Math.random() * 360,
    });
    setMotes(arr);
  }, []);

  const paint = mC((color) => {
    if (over) return;
    if (!running) setRunning(true);
    setCurrent((prev) => {
      const next = prev.slice();
      next[curSlot] = color;
      return next;
    });
    // advance to next empty slot
    setCurSlot((s) => {
      const next = current.slice(); next[s] = color;
      for (let i = s + 1; i < cfg.slots; i++) if (next[i] == null) return i;
      for (let i = 0; i < cfg.slots; i++) if (next[i] == null) return i;
      return s;
    });
  }, [over, running, curSlot, current, cfg]);

  const clearSlot = mC((i) => {
    if (over) return;
    setCurrent((prev) => { const n = prev.slice(); n[i] = null; return n; });
    setCurSlot(i);
  }, [over]);

  const submit = mC(() => {
    if (over) return;
    if (current.some((x) => x == null)) { showToast("Fill all " + cfg.slots + " pegs first"); return; }
    const res = MM.score(current, secret);
    const row = { pegs: current.slice(), black: res.black, white: res.white };
    const nextRows = [...rows, row];
    setRows(nextRows);
    setCurrent(new Array(cfg.slots).fill(null)); setCurSlot(0);
    if (res.black === cfg.slots) {
      setOver("won"); setRunning(false); setTimeout(fireWin, 200);
    } else if (nextRows.length >= cfg.tries) {
      setOver("lost"); setRunning(false);
    }
  }, [over, current, secret, rows, cfg, showToast, fireWin]);

  const undo = mC(() => {
    if (over) return;
    if (current.some((x) => x != null)) {
      // clear last filled
      for (let i = cfg.slots - 1; i >= 0; i--) if (current[i] != null) { clearSlot(i); return; }
    }
  }, [over, current, cfg, clearSlot]);

  // keyboard: 1..colors paint, Backspace clear, Enter submit
  mE(() => {
    const onKey = (e) => {
      if (over) return;
      if (e.key >= "1" && e.key <= String(cfg.colors)) paint(+e.key - 1);
      else if (e.key === "Backspace") {
        e.preventDefault();
        for (let i = cfg.slots - 1; i >= 0; i--) if (current[i] != null) { clearSlot(i); return; }
      } else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [over, cfg, current, paint, clearSlot, submit]);

  const filled = current.filter((x) => x != null).length;
  const rowsLeft = cfg.tries - rows.length;

  // build all visual rows: submitted, then active, then empty placeholders
  const visualRows = [];
  for (let i = 0; i < cfg.tries; i++) {
    if (i < rows.length) visualRows.push({ kind: "done", data: rows[i] });
    else if (i === rows.length && !over) visualRows.push({ kind: "active" });
    else visualRows.push({ kind: "empty" });
  }

  const fpegs = (black, white) => {
    const arr = [];
    for (let i = 0; i < black; i++) arr.push("black");
    for (let i = 0; i < white; i++) arr.push("white");
    while (arr.length < cfg.slots) arr.push("");
    return arr;
  };

  return (
    <div className="wrap">
      <a className="backlink" href="../../index.html">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
        All puzzles
      </a>
      <div className="masthead">
        <div className="brandmark">
          <svg width="40" height="40" viewBox="0 0 44 44">
            <circle cx="13" cy="13" r="7" fill="#2f6bff"/>
            <circle cx="31" cy="13" r="7" fill="#f5a623"/>
            <circle cx="13" cy="31" r="7" fill="#e23b2e"/>
            <circle cx="31" cy="31" r="7" fill="#15a05a"/>
          </svg>
          <h1 className="wordmark">Mastermind</h1>
        </div>
        <div className="tagline">Crack the colour code</div>
      </div>

      <div className="controls">
        <div className="segmented">
          {Object.keys(MMDIFF).map((k) => (
            <button key={k} className={difficulty === k ? "active" : ""}
              onClick={() => { if (k !== difficulty) setDifficulty(k); else newGame(k); }}>
              {MMDIFF[k].label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => newGame(difficulty)}>{MMIcon.refresh} New</button>
        <button className="btn" onClick={undo} disabled={!!over || filled === 0}>{MMIcon.undo} Undo</button>
        <button className="btn primary" onClick={submit} disabled={!!over || filled < cfg.slots}>{MMIcon.check} Guess</button>
      </div>

      <div className="statsbar">
        <div className="stat"><div className="num">{mmFmt(seconds)}</div><div className="lbl">Time</div></div>
        <div className="stat"><div className="num">{rowsLeft}</div><div className="lbl">Guesses left</div></div>
        <div className="stat"><div className="num">{cfg.slots}</div><div className="lbl">Pegs</div></div>
      </div>

      <div className="mm-wrap">
        <div className="mm-secret">
          <span className="lbl">Secret</span>
          <div className="pegs">
            {(over ? secret : new Array(cfg.slots).fill(null)).map((c, i) =>
              over
                ? <Peg key={i} color={c} cls="" />
                : <div key={i} className="mm-hidden">?</div>
            )}
          </div>
        </div>

        <div className="mm-board" ref={boardRef} style={{ "--peg": peg + "px", maxHeight: boardMax ? boardMax + "px" : undefined }}>
          {visualRows.map((vr, ri) => (
            <div key={ri} className={"mm-row" + (vr.kind === "active" ? " active" : "") + (vr.kind === "done" ? " done" : "")}>
              <span className="mm-rownum">{ri + 1}</span>
              <div className="mm-slots">
                {vr.kind === "done" && vr.data.pegs.map((c, i) => <Peg key={i} color={c} cls="" />)}
                {vr.kind === "active" && current.map((c, i) => (
                  <div key={i} onClick={() => (c != null ? clearSlot(i) : setCurSlot(i))}>
                    <Peg color={c} cls={i === curSlot ? "cur" : ""} />
                  </div>
                ))}
                {vr.kind === "empty" && new Array(cfg.slots).fill(0).map((_, i) => <Peg key={i} color={null} cls="" />)}
              </div>
              <div className="mm-feedback" style={{ gridTemplateColumns: "repeat(" + Math.ceil(cfg.slots / 2) + ", 1fr)" }}>
                {vr.kind === "done" && fpegs(vr.data.black, vr.data.white).map((t, i) =>
                  <div key={i} className={"mm-fpeg" + (t ? " " + t + " pop" : "")} style={{ animationDelay: (i * 0.04) + "s" }} />
                )}
              </div>
            </div>
          ))}
        </div>

        {!over && (
          <div className="mm-tray">
            <div className="mm-palette">
              {new Array(cfg.colors).fill(0).map((_, i) => (
                <button key={i} className={"mm-swatch c" + i} onClick={() => paint(i)} title={"Colour " + (i + 1)}>
                  <span className="gloss" />
                </button>
              ))}
            </div>
            <button className="mm-erase" onClick={() => { for (let i = cfg.slots - 1; i >= 0; i--) if (current[i] != null) { clearSlot(i); return; } }} title="Erase">
              {MMIcon.erase}
            </button>
          </div>
        )}

        <div className="mm-legend">
          <span><span className="dot black" /> right colour, right spot</span>
          <span><span className="dot white" /> right colour, wrong spot</span>
        </div>
      </div>

      <div className="helpline">
        Break the hidden code in <b>{cfg.tries}</b> guesses. Place {cfg.slots} pegs from {cfg.colors} colours — repeats allowed — then hit <b>Guess</b>. A <b>dark peg</b> means a colour is in the right place; a <b>light peg</b> means right colour, wrong place. <b>Keys 1–{cfg.colors}</b> place colours, <b>Enter</b> guesses.
      </div>

      {toast && (
        <div className="toast-zone" key={toast.id}>
          <div className={"toast" + (toast.warn ? " warn" : "")}>
            {toast.warn ? MMIcon.warn : MMIcon.info}{toast.msg}
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

      {over && (
        <div className="win-overlay">
          <div className={"win-card" + (over === "lost" ? " lose" : "")}>
            {over === "won" ? (
              <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
                <circle cx="22" cy="22" r="19" fill="#e4f6ec" stroke="#15a05a" strokeWidth="2.6"/>
                <path d="M14 22.5 L19.5 28 L31 16" fill="none" stroke="#15a05a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="58" height="58" viewBox="0 0 44 44" style={{ margin: "0 auto" }}>
                <circle cx="22" cy="22" r="19" fill="#fdeae8" stroke="#e23b2e" strokeWidth="2.6"/>
                <path d="M16 16l12 12M28 16l-12 12" fill="none" stroke="#e23b2e" strokeWidth="3.4" strokeLinecap="round"/>
              </svg>
            )}
            <h2>{over === "won" ? "Code cracked!" : "Out of guesses"}</h2>
            <p>{over === "won"
              ? "You broke it in " + rows.length + " guess" + (rows.length === 1 ? "" : "es") + "."
              : "The code was:"}</p>
            <div className="mm-reveal">
              {secret.map((c, i) => <Peg key={i} color={c} cls="" />)}
            </div>
            {over === "won" && (
              <div className="win-stats">
                <div><div className="num">{mmFmt(seconds)}</div><div className="lbl">Time</div></div>
                <div><div className="num">{rows.length}</div><div className="lbl">Guesses</div></div>
              </div>
            )}
            <button className="btn primary" style={{ fontSize: 15, padding: "12px 22px" }} onClick={() => newGame(difficulty)}>
              {MMIcon.refresh} New code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MastermindApp />);
