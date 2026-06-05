/* ============================================================
   PicrossBoard.jsx — SVG grid renderer + paint interactions
   exposes window.PicrossBoard
   ============================================================ */
const { useState: usePBState } = React;

function PicrossBoard(props) {
  const { puzzle, state, errGrid, showErrors, won,
          rowDone, colDone, onBeginDrag, onDragOver, onEndDrag } = props;
  const { rows, cols, rowClues, colClues } = puzzle;

  const [hover, setHover] = usePBState(null); // {r,c}
  const downRef = React.useRef(false);

  // sizing — clue gutters scale with the longest clue list
  const CELL = 40;
  const CLUE = 26;
  const maxRow = Math.max(1, ...rowClues.map((c) => c.length || 1));
  const maxCol = Math.max(1, ...colClues.map((c) => c.length || 1));
  const leftG = maxRow * CLUE + 12;
  const topG = maxCol * CLUE + 12;
  const gw = cols * CELL;
  const gh = rows * CELL;
  const W = leftG + gw + 3;
  const H = topG + gh + 3;
  const gx = (c) => leftG + c * CELL;
  const gy = (r) => topG + r * CELL;

  function cellFromPoint(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    const ra = el.getAttribute && el.getAttribute("data-r");
    if (ra === null || ra === undefined) return null;
    return { r: +ra, c: +el.getAttribute("data-c") };
  }

  const handleDown = (e) => {
    if (won) return;
    const cell = cellFromPoint(e);
    if (!cell) return;
    e.preventDefault();
    downRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    onBeginDrag(cell.r, cell.c, e.button);
  };
  const handleMove = (e) => {
    const cell = cellFromPoint(e);
    if (cell) setHover(cell); else setHover(null);
    if (downRef.current && cell) onDragOver(cell.r, cell.c);
  };
  const handleUp = () => { if (downRef.current) { downRef.current = false; onEndDrag(); } };

  // ---- decorative shading on 5x5 blocks ----
  const shades = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((Math.floor(r / 5) + Math.floor(c / 5)) % 2 === 1) {
        shades.push(<rect key={"sh" + r + "_" + c} x={gx(c)} y={gy(r)} width={CELL} height={CELL} className="pic-shade" />);
      }
    }
  }

  // ---- hover crosshair ----
  const hl = [];
  if (hover && !won) {
    hl.push(<rect key="hlr" x={leftG} y={gy(hover.r)} width={gw} height={CELL} className="pic-hl" />);
    hl.push(<rect key="hlc" x={gx(hover.c)} y={topG} width={CELL} height={gh} className="pic-hl" />);
  }

  // ---- cells ----
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = state[r][c];
      const err = showErrors && errGrid[r] && errGrid[r][c];
      const x = gx(c), y = gy(r);
      let cls = "pic-cell";
      if (v === 1) cls += err ? " err" : " fill";
      if (won && v === 1) cls += " won";
      cells.push(
        <rect key={"c" + r + "_" + c} className={cls}
          x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} rx={3}
          data-r={r} data-c={c}
          style={won && v === 1 ? { animationDelay: ((r + c) % 9) * 0.05 + "s" } : null} />
      );
      if (v === 2) {
        const m = CELL * 0.28;
        cells.push(
          <g key={"x" + r + "_" + c} className="pic-x">
            <line x1={x + m} y1={y + m} x2={x + CELL - m} y2={y + CELL - m} />
            <line x1={x + CELL - m} y1={y + m} x2={x + m} y2={y + CELL - m} />
          </g>
        );
      }
    }
  }

  // ---- grid lines ----
  const lines = [];
  for (let c = 0; c <= cols; c++) {
    const major = c % 5 === 0;
    lines.push(<line key={"vl" + c} className={"pic-grid" + (major ? " major" : "")}
      x1={gx(c)} y1={topG} x2={gx(c)} y2={topG + gh} />);
  }
  for (let r = 0; r <= rows; r++) {
    const major = r % 5 === 0;
    lines.push(<line key={"hl" + r} className={"pic-grid" + (major ? " major" : "")}
      x1={leftG} y1={gy(r)} x2={leftG + gw} y2={gy(r)} />);
  }

  // ---- clues ----
  const clueEls = [];
  rowClues.forEach((cl, r) => {
    const list = cl.length ? cl : [0];
    const y = gy(r) + CELL / 2;
    list.forEach((n, j) => {
      const fromRight = list.length - j; // 1 = adjacent to grid
      const x = leftG - (fromRight - 0.5) * CLUE;
      clueEls.push(
        <text key={"rc" + r + "_" + j} className={"pic-clue" + (rowDone[r] ? " done" : "")}
          x={x} y={y} dominantBaseline="central" textAnchor="middle">{n}</text>
      );
    });
  });
  colClues.forEach((cl, c) => {
    const list = cl.length ? cl : [0];
    const x = gx(c) + CELL / 2;
    list.forEach((n, j) => {
      const fromBottom = list.length - j;
      const y = topG - (fromBottom - 0.5) * CLUE;
      clueEls.push(
        <text key={"cc" + c + "_" + j} className={"pic-clue" + (colDone[c] ? " done" : "")}
          x={x} y={y} dominantBaseline="central" textAnchor="middle">{n}</text>
      );
    });
  });

  return (
    <svg className={"pic-board-svg" + (won ? " won" : "")}
         viewBox={"0 0 " + W + " " + H}
         onPointerDown={handleDown}
         onPointerMove={handleMove}
         onPointerUp={handleUp}
         onPointerCancel={handleUp}
         onPointerLeave={() => setHover(null)}
         onContextMenu={(e) => e.preventDefault()}>
      <g>{shades}</g>
      <g>{hl}</g>
      <g>{cells}</g>
      <g>{lines}</g>
      <g>{clueEls}</g>
    </svg>
  );
}

window.PicrossBoard = PicrossBoard;
