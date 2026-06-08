/* ============================================================
   GalaxiesBoard.jsx — SVG grid: symmetric painting + galaxy dots
   exposes window.GalaxiesBoard  and  window.GALAXY_PALETTE
   ============================================================ */
const { useRef: useGXRef } = React;

const GALAXY_PALETTE = [
  { fill: "#dce8ff", line: "#2f6bff" },
  { fill: "#d8f0e2", line: "#15a05a" },
  { fill: "#fdeac4", line: "#d98a1f" },
  { fill: "#fad9d4", line: "#e23b2e" },
  { fill: "#e7def8", line: "#7a5af0" },
  { fill: "#d2eef1", line: "#1190a3" },
  { fill: "#fbd9ea", line: "#d23b86" },
  { fill: "#e2e7f0", line: "#5a6378" },
  { fill: "#e8eccb", line: "#84913a" },
  { fill: "#ffe1cf", line: "#e2742a" },
];
window.GALAXY_PALETTE = GALAXY_PALETTE;

function GalaxiesBoard(props) {
  const { puzzle, owner, selectedG, validation, showErrors, won,
          onGestureStart, onPaint, onSelect } = props;
  const { rows, cols, centers } = puzzle;
  const status = validation.regionStatus;

  const CELL = 56;
  const W = cols * CELL, H = rows * CELL;
  const gx = (c) => c * CELL, gy = (r) => r * CELL;

  const downRef = useGXRef(false);
  const modeRef = useGXRef("add");
  const lastRef = useGXRef("");

  function cellFromPoint(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !el.getAttribute) return null;
    const ra = el.getAttribute("data-r");
    if (ra === null) return null;
    return { r: +ra, c: +el.getAttribute("data-c") };
  }

  const handleDown = (e) => {
    if (won) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const dotG = el && el.getAttribute && el.getAttribute("data-dot");
    if (dotG !== null && dotG !== undefined) {
      onSelect(+dotG);
      return;
    }
    const cell = cellFromPoint(e);
    if (!cell) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    downRef.current = true;
    modeRef.current = (e.button === 2 || owner[cell.r][cell.c] === selectedG) ? "erase" : "add";
    lastRef.current = "";
    onGestureStart();
    paintCell(cell);
  };
  const paintCell = (cell) => {
    const key = cell.r + "," + cell.c;
    if (key === lastRef.current) return;
    lastRef.current = key;
    onPaint(cell.r, cell.c, modeRef.current);
  };
  const handleMove = (e) => {
    if (!downRef.current) return;
    const cell = cellFromPoint(e);
    if (cell) paintCell(cell);
  };
  const handleUp = () => { downRef.current = false; lastRef.current = ""; };

  // ---- faint base grid ----
  const grid = [];
  for (let c = 0; c <= cols; c++)
    grid.push(<line key={"v" + c} className="gx-grid" x1={gx(c)} y1={0} x2={gx(c)} y2={H} />);
  for (let r = 0; r <= rows; r++)
    grid.push(<line key={"h" + r} className="gx-grid" x1={0} y1={gy(r)} x2={W} y2={gy(r)} />);

  // ---- cell fills ----
  const fills = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const g = owner[r][c];
    if (g < 0) continue;
    const pal = GALAXY_PALETTE[g % GALAXY_PALETTE.length];
    const bad = showErrors && status[g] === "bad";
    fills.push(
      <rect key={"f" + r + "_" + c} x={gx(c)} y={gy(r)} width={CELL} height={CELL}
        fill={bad ? "var(--error-tint)" : pal.fill}
        opacity={g === selectedG && !bad ? 1 : 0.92} />
    );
  }

  // ---- region outlines (segment where owner differs from neighbour) ----
  const ownerAt = (r, c) => (r < 0 || r >= rows || c < 0 || c >= cols) ? -1 : owner[r][c];
  const edges = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const o = owner[r][c];
    if (o < 0) continue;
    const bad = showErrors && status[o] === "bad";
    const col = bad ? "var(--error)" : "#283353";
    const sides = [
      [ownerAt(r - 1, c), gx(c), gy(r), gx(c + 1), gy(r)],       // top
      [ownerAt(r + 1, c), gx(c), gy(r + 1), gx(c + 1), gy(r + 1)],// bottom
      [ownerAt(r, c - 1), gx(c), gy(r), gx(c), gy(r + 1)],       // left
      [ownerAt(r, c + 1), gx(c + 1), gy(r), gx(c + 1), gy(r + 1)],// right
    ];
    sides.forEach((s, i) => {
      if (s[0] !== o) edges.push(
        <line key={"e" + r + "_" + c + "_" + i} className="gx-border"
          x1={s[1]} y1={s[2]} x2={s[3]} y2={s[4]} stroke={col} />
      );
    });
  }

  // ---- hit layer ----
  const hits = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    hits.push(<rect key={"hit" + r + "_" + c} className="gx-hit"
      x={gx(c)} y={gy(r)} width={CELL} height={CELL} data-r={r} data-c={c} />);

  // ---- galaxy dots (on top, selectable) ----
  const dots = centers.map((ctr, g) => {
    const x = (ctr.cy / 2) * CELL, y = (ctr.cx / 2) * CELL;
    const pal = GALAXY_PALETTE[g % GALAXY_PALETTE.length];
    const sel = g === selectedG;
    return (
      <g key={"dot" + g} className={"gx-dot" + (sel ? " sel" : "")}>
        {sel && <circle cx={x} cy={y} r={15} className="gx-dot-ring" />}
        <circle cx={x} cy={y} r={9} className="gx-dot-core"
          stroke={pal.line} />
        <circle cx={x} cy={y} r={4.4} fill={pal.line} pointerEvents="none" />
        <circle cx={x} cy={y} r={16} fill="transparent" data-dot={g} style={{ cursor: "pointer" }} />
      </g>
    );
  });

  return (
    <svg className={"gx-board-svg" + (won ? " won" : "")}
         viewBox={"0 0 " + W + " " + H}
         onPointerDown={handleDown}
         onPointerMove={handleMove}
         onPointerUp={handleUp}
         onPointerCancel={handleUp}
         onContextMenu={(e) => e.preventDefault()}>
      <g>{fills}</g>
      <g>{grid}</g>
      <g>{edges}</g>
      <g>{hits}</g>
      <g>{dots}</g>
    </svg>
  );
}

window.GalaxiesBoard = GalaxiesBoard;
