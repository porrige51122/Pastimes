/* ============================================================
   MinesweeperBoard.jsx — SVG grid renderer + interactions
   exposes window.MinesBoard
   ============================================================ */
const { useState: useMBState } = React;

// classic-flavoured number colours, tuned to the Pastimes palette
const NUM_COLORS = {
  1: "#2f6bff", // blue (accent)
  2: "#15a05a", // green (done)
  3: "#e23b2e", // red (error)
  4: "#283353", // navy
  5: "#9c3d18", // burnt sienna
  6: "#0e8a8a", // teal
  7: "#1d2740", // ink
  8: "#8a93a6", // muted slate
};

function MineGlyph({ x, y, s, exploded }) {
  // simple geometric mine: body + spokes + glint
  const cx = x + s / 2, cy = y + s / 2;
  const r = s * 0.21;
  const spoke = s * 0.34;
  const sw = Math.max(1.4, s * 0.05);
  const body = exploded ? "#fff" : "#283353";
  const ink = exploded ? "#fff" : "#283353";
  return (
    <g className="ms-mine" pointerEvents="none">
      <line x1={cx - spoke} y1={cy} x2={cx + spoke} y2={cy} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx} y1={cy - spoke} x2={cx} y2={cy + spoke} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx - spoke * 0.72} y1={cy - spoke * 0.72} x2={cx + spoke * 0.72} y2={cy + spoke * 0.72} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx - spoke * 0.72} y1={cy + spoke * 0.72} x2={cx + spoke * 0.72} y2={cy - spoke * 0.72} stroke={ink} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill={body} />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill={exploded ? "#283353" : "#fff"} opacity={exploded ? 0.5 : 0.85} />
    </g>
  );
}

function FlagGlyph({ x, y, s, wrong }) {
  const px = x + s * 0.5;
  const top = y + s * 0.24;
  const bot = y + s * 0.74;
  const sw = Math.max(1.6, s * 0.055);
  const pole = wrong ? "#9aa6ba" : "#283353";
  return (
    <g className="ms-flag" pointerEvents="none">
      <line x1={px} y1={top} x2={px} y2={bot} stroke={pole} strokeWidth={sw} strokeLinecap="round" />
      <polygon points={`${px},${top} ${px - s * 0.26},${top + s * 0.12} ${px},${top + s * 0.24}`}
               fill={wrong ? "#9aa6ba" : "#e23b2e"} />
      <rect x={px - s * 0.13} y={bot - s * 0.02} width={s * 0.26} height={sw * 1.1} rx={sw * 0.4} fill={pole} />
      {wrong && (
        <g stroke="#c32a1f" strokeWidth={sw} strokeLinecap="round">
          <line x1={x + s * 0.22} y1={y + s * 0.22} x2={x + s * 0.78} y2={y + s * 0.78} />
          <line x1={x + s * 0.78} y1={y + s * 0.22} x2={x + s * 0.22} y2={y + s * 0.78} />
        </g>
      )}
    </g>
  );
}

function MinesBoard(props) {
  const { board, revealed, flags, status, exploded, hint,
          onReveal, onFlag, onChord, pressHint } = props;
  const { rows, cols, num, mine } = board;

  const [press, setPress] = useMBState(null); // {r,c} cell visually pressed during chord/hover

  const CELL = 40;
  const W = cols * CELL;
  const H = rows * CELL;
  const gx = (c) => c * CELL;
  const gy = (r) => r * CELL;

  function cellFromPoint(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    const ra = el.getAttribute && el.getAttribute("data-r");
    if (ra === null || ra === undefined) return null;
    return { r: +ra, c: +el.getAttribute("data-c") };
  }

  const dead = status === "lost" || status === "won";

  const handlePointerDown = (e) => {
    if (dead) return;
    const cell = cellFromPoint(e);
    if (!cell) return;
    // middle button → chord
    if (e.button === 1) {
      e.preventDefault();
      onChord(cell.r, cell.c);
      return;
    }
    // right button → flag
    if (e.button === 2) {
      e.preventDefault();
      onFlag(cell.r, cell.c);
      return;
    }
    // left button
    if (e.button === 0) {
      e.preventDefault();
      if (pressHint === "flag") { onFlag(cell.r, cell.c); return; }
      // left-click on an already-revealed number chords (classic convenience)
      if (revealed[cell.r][cell.c] && num[cell.r][cell.c] > 0) { onChord(cell.r, cell.c); return; }
      onReveal(cell.r, cell.c);
    }
  };

  // build cells
  const els = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gx(c), y = gy(r);
      const isRev = revealed[r][c];
      const isFlag = flags[r][c];
      const n = num[r][c];

      if (!isRev) {
        // hidden tile
        let cls = "ms-tile";
        if (dead && mine[r][c] && isFlag !== 1) cls += " reveal-mine";
        els.push(
          <rect key={"t" + r + "_" + c} className={cls}
            x={x + 0.6} y={y + 0.6} width={CELL - 1.2} height={CELL - 1.2} rx={4}
            data-r={r} data-c={c} />
        );
        // lost: reveal unflagged mines
        if (status === "lost" && mine[r][c] && isFlag !== 1) {
          els.push(<MineGlyph key={"m" + r + "_" + c} x={x} y={y} s={CELL} exploded={false} />);
        }
        // flag / question overlay
        if (isFlag === 1) {
          const wrong = status === "lost" && !mine[r][c];
          els.push(<FlagGlyph key={"f" + r + "_" + c} x={x} y={y} s={CELL} wrong={wrong} />);
        } else if (isFlag === 2) {
          els.push(
            <text key={"q" + r + "_" + c} className="ms-query"
              x={x + CELL / 2} y={y + CELL / 2 + 1} data-r={r} data-c={c}
              textAnchor="middle" dominantBaseline="central">?</text>
          );
        }
      } else {
        // revealed cell
        const isExpl = exploded && exploded[0] === r && exploded[1] === c;
        els.push(
          <rect key={"r" + r + "_" + c} className={"ms-open" + (isExpl ? " boom" : "")}
            x={x + 0.4} y={y + 0.4} width={CELL - 0.8} height={CELL - 0.8}
            data-r={r} data-c={c} />
        );
        if (mine[r][c]) {
          els.push(<MineGlyph key={"mr" + r + "_" + c} x={x} y={y} s={CELL} exploded={isExpl} />);
        } else if (n > 0) {
          els.push(
            <text key={"n" + r + "_" + c} className="ms-num"
              x={x + CELL / 2} y={y + CELL / 2 + 1}
              fill={NUM_COLORS[n]} data-r={r} data-c={c}
              textAnchor="middle" dominantBaseline="central">{n}</text>
          );
        }
      }
      // hint pulse (safe cell suggestion)
      if (hint && hint[0] === r && hint[1] === c) {
        els.push(<rect key={"h" + r + "_" + c} className="ms-hint"
          x={x + 0.6} y={y + 0.6} width={CELL - 1.2} height={CELL - 1.2} rx={4} pointerEvents="none" />);
      }
    }
  }

  // grid lines (subtle, drawn on top of open cells)
  const lines = [];
  for (let c = 0; c <= cols; c++)
    lines.push(<line key={"vl" + c} className="ms-grid" x1={gx(c)} y1={0} x2={gx(c)} y2={H} />);
  for (let r = 0; r <= rows; r++)
    lines.push(<line key={"hl" + r} className="ms-grid" x1={0} y1={gy(r)} x2={W} y2={gy(r)} />);

  return (
    <svg className={"ms-board-svg status-" + status}
         viewBox={"0 0 " + W + " " + H}
         onPointerDown={handlePointerDown}
         onContextMenu={(e) => e.preventDefault()}
         onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}>
      <g>{lines}</g>
      <g>{els}</g>
    </svg>
  );
}

window.MinesBoard = MinesBoard;
