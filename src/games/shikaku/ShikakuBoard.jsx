/* ============================================================
   ShikakuBoard.jsx — SVG grid + rubber-band rectangle drawing
   exposes window.ShikakuBoard
   ============================================================ */
const { useState: useSKState, useRef: useSKRef } = React;

function ShikakuBoard(props) {
  const { puzzle, rects, validation, showErrors, won, onDraw } = props;
  const { rows, cols, clues } = puzzle;
  const { cover, rectStatus } = validation;

  const [preview, setPreview] = useSKState(null); // {top,left,bottom,right}
  const downRef = useSKRef(false);
  const startRef = useSKRef(null);

  const CELL = 46;
  const W = cols * CELL, H = rows * CELL;
  const gx = (c) => c * CELL, gy = (r) => r * CELL;

  function cellFromPoint(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    const ra = el.getAttribute && el.getAttribute("data-r");
    if (ra === null || ra === undefined) return null;
    return { r: +ra, c: +el.getAttribute("data-c") };
  }
  const bbox = (a, b) => ({
    top: Math.min(a.r, b.r), bottom: Math.max(a.r, b.r),
    left: Math.min(a.c, b.c), right: Math.max(a.c, b.c),
  });

  const handleDown = (e) => {
    if (won) return;
    const cell = cellFromPoint(e);
    if (!cell) return;
    e.preventDefault();
    downRef.current = true;
    startRef.current = cell;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    setPreview(bbox(cell, cell));
  };
  const handleMove = (e) => {
    if (!downRef.current) return;
    const cell = cellFromPoint(e);
    if (!cell) return;
    setPreview(bbox(startRef.current, cell));
  };
  const handleUp = (e) => {
    if (!downRef.current) return;
    downRef.current = false;
    const cell = cellFromPoint(e) || startRef.current;
    const b = bbox(startRef.current, cell);
    setPreview(null);
    startRef.current = null;
    onDraw(b.top, b.left, b.bottom, b.right);
  };

  // grid lines
  const lines = [];
  for (let c = 0; c <= cols; c++)
    lines.push(<line key={"vl" + c} className="sk-grid" x1={gx(c)} y1={0} x2={gx(c)} y2={H} />);
  for (let r = 0; r <= rows; r++)
    lines.push(<line key={"hl" + r} className="sk-grid" x1={0} y1={gy(r)} x2={W} y2={gy(r)} />);

  // player rectangles
  const rectEls = [];
  rects.forEach((R, i) => {
    let cls = "sk-rect";
    if (showErrors) cls += rectStatus[i] === "correct" ? " ok" : " bad";
    rectEls.push(
      <rect key={"R" + i} className={cls}
        x={gx(R.c0) + 2.5} y={gy(R.r0) + 2.5}
        width={R.w * CELL - 5} height={R.h * CELL - 5} rx={6} />
    );
  });

  // hit cells
  const hits = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      hits.push(<rect key={"h" + r + "_" + c} className="sk-hit"
        x={gx(c)} y={gy(r)} width={CELL} height={CELL} data-r={r} data-c={c} />);

  // preview
  let prevEl = null;
  if (preview) {
    const w = (preview.right - preview.left + 1) * CELL;
    const h = (preview.bottom - preview.top + 1) * CELL;
    const area = (preview.right - preview.left + 1) * (preview.bottom - preview.top + 1);
    prevEl = (
      <g pointerEvents="none">
        <rect className="sk-preview" x={gx(preview.left) + 2} y={gy(preview.top) + 2}
          width={w - 4} height={h - 4} rx={6} />
        <text className="sk-preview-area" x={gx(preview.left) + w / 2} y={gy(preview.top) + h / 2}
          textAnchor="middle" dominantBaseline="central">{area}</text>
      </g>
    );
  }

  // clue chips (on top)
  const chip = CELL * 0.66;
  const clueEls = clues.map((cl, i) => {
    // colour the clue's own rectangle status (only under showErrors)
    const ri = cover[cl.r] ? cover[cl.r][cl.c] : -1;
    let cls = "sk-clue";
    if (showErrors && ri >= 0) cls += rectStatus[ri] === "correct" ? " ok" : " bad";
    const cx = gx(cl.c) + CELL / 2, cy = gy(cl.r) + CELL / 2;
    return (
      <g key={"cl" + i} className={cls} pointerEvents="none">
        <rect x={cx - chip / 2} y={cy - chip / 2} width={chip} height={chip} rx={chip * 0.28} className="sk-clue-chip" />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" className="sk-clue-num">{cl.v}</text>
      </g>
    );
  });

  return (
    <svg className={"sk-board-svg" + (won ? " won" : "")}
         viewBox={"0 0 " + W + " " + H}
         onPointerDown={handleDown}
         onPointerMove={handleMove}
         onPointerUp={handleUp}
         onPointerCancel={handleUp}
         onContextMenu={(e) => e.preventDefault()}>
      <g>{rectEls}</g>
      <g>{lines}</g>
      {prevEl}
      <g>{clueEls}</g>
      <g>{hits}</g>
    </svg>
  );
}

window.ShikakuBoard = ShikakuBoard;
