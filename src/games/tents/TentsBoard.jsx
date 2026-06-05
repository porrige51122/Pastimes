/* ============================================================
   TentsBoard.jsx — SVG grid renderer + paint interactions
   exposes window.TentsBoard
   ============================================================ */
const { useState: useTBState } = React;

function TreeGlyph({ x, y, s, satisfied }) {
  const cx = x + s / 2;
  const trunkW = s * 0.12, trunkH = s * 0.2;
  const top = y + s * 0.14;
  return (
    <g className={"tn-tree" + (satisfied ? " ok" : "")} pointerEvents="none">
      <rect x={cx - trunkW / 2} y={y + s * 0.56} width={trunkW} height={trunkH} rx={trunkW * 0.3} className="tn-trunk" />
      <circle cx={cx} cy={y + s * 0.42} r={s * 0.26} className="tn-canopy" />
      <circle cx={cx - s * 0.14} cy={y + s * 0.5} r={s * 0.17} className="tn-canopy" />
      <circle cx={cx + s * 0.14} cy={y + s * 0.5} r={s * 0.17} className="tn-canopy" />
      <circle cx={cx} cy={top + s * 0.12} r={s * 0.19} className="tn-canopy" />
    </g>
  );
}

function TentGlyph({ x, y, s, err }) {
  const cx = x + s / 2;
  const top = y + s * 0.2;
  const baseY = y + s * 0.74;
  const half = s * 0.3;
  return (
    <g className={"tn-tent" + (err ? " err" : "")} pointerEvents="none">
      <polygon points={`${cx},${top} ${cx + half},${baseY} ${cx - half},${baseY}`} className="tn-tent-body" />
      <polygon points={`${cx},${top} ${cx + half * 0.34},${baseY} ${cx - half * 0.34},${baseY}`} className="tn-tent-door" />
    </g>
  );
}

function GrassGlyph({ x, y, s }) {
  const cx = x + s / 2, by = y + s * 0.62;
  const sw = Math.max(1.4, s * 0.045);
  return (
    <g className="tn-grass" pointerEvents="none" strokeWidth={sw} strokeLinecap="round">
      <line x1={cx} y1={by} x2={cx} y2={by - s * 0.16} />
      <line x1={cx - s * 0.11} y1={by} x2={cx - s * 0.17} y2={by - s * 0.12} />
      <line x1={cx + s * 0.11} y1={by} x2={cx + s * 0.17} y2={by - s * 0.12} />
    </g>
  );
}

function TentsBoard(props) {
  const { puzzle, state, validation, showErrors, won,
          links, selTreeRC, linkTargets,
          onBeginDrag, onDragOver, onEndDrag } = props;
  const { rows, cols, rowClues, colClues, treeIdAt } = puzzle;
  const { errGrid, rowMet, colMet, rowOver, colOver, treeSatisfied } = validation;

  const [hover, setHover] = useTBState(null);
  const downRef = React.useRef(false);

  const CELL = 44;
  const CLUE = 30;
  const leftG = CLUE + 6;
  const topG = CLUE + 6;
  const gw = cols * CELL, gh = rows * CELL;
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
    setHover(cell || null);
    if (downRef.current && cell) onDragOver(cell.r, cell.c);
  };
  const handleUp = () => { if (downRef.current) { downRef.current = false; onEndDrag(); } };

  // checker shading
  const shades = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if ((r + c) % 2 === 1)
        shades.push(<rect key={"sh" + r + "_" + c} x={gx(c)} y={gy(r)} width={CELL} height={CELL} className="tn-shade" />);

  // hover crosshair
  const hl = [];
  if (hover && !won) {
    hl.push(<rect key="hr" x={leftG} y={gy(hover.r)} width={gw} height={CELL} className="tn-hl" />);
    hl.push(<rect key="hc" x={gx(hover.c)} y={topG} width={CELL} height={gh} className="tn-hl" />);
  }

  // cells: hit rects + glyphs
  const hits = [];
  const glyphs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gx(c), y = gy(r);
      const isTree = treeIdAt[r][c] >= 0;
      hits.push(
        <rect key={"h" + r + "_" + c} className={"tn-hit" + (isTree ? " tree" : "")}
          x={x} y={y} width={CELL} height={CELL} data-r={r} data-c={c} />
      );
      if (isTree) {
        glyphs.push(<TreeGlyph key={"tr" + r + "_" + c} x={x} y={y} s={CELL}
          satisfied={treeSatisfied && treeSatisfied[treeIdAt[r][c]]} />);
      } else if (state[r][c] === 1) {
        glyphs.push(<TentGlyph key={"te" + r + "_" + c} x={x} y={y} s={CELL}
          err={showErrors && errGrid[r] && errGrid[r][c]} />);
      } else if (state[r][c] === 2) {
        glyphs.push(<GrassGlyph key={"gr" + r + "_" + c} x={x} y={y} s={CELL} />);
      }
    }
  }

  // grid lines
  const lines = [];
  for (let c = 0; c <= cols; c++)
    lines.push(<line key={"vl" + c} className="tn-grid" x1={gx(c)} y1={topG} x2={gx(c)} y2={topG + gh} />);
  for (let r = 0; r <= rows; r++)
    lines.push(<line key={"hl" + r} className="tn-grid" x1={leftG} y1={gy(r)} x2={leftG + gw} y2={gy(r)} />);

  // ---- pairing aids (visual only) ----
  const cx = (c) => gx(c) + CELL / 2;
  const cy = (r) => gy(r) + CELL / 2;

  // soft tint behind every tied tree/tent cell + the connector "tie"
  const linkTints = [];
  const linkTies = [];
  (links || []).forEach((p, i) => {
    [[p.tr, p.tc], [p.er, p.ec]].forEach(([rr, ccc], j) => {
      linkTints.push(<rect key={"lt" + i + "_" + j} className="tn-link-tint"
        x={gx(ccc) + 3} y={gy(rr) + 3} width={CELL - 6} height={CELL - 6} rx={7} />);
    });
    linkTies.push(
      <g key={"lk" + i} className="tn-link" pointerEvents="none">
        <line x1={cx(p.tc)} y1={cy(p.tr)} x2={cx(p.ec)} y2={cy(p.er)} className="tn-link-line" strokeWidth={CELL * 0.15} />
        <circle cx={cx(p.tc)} cy={cy(p.tr)} r={CELL * 0.1} className="tn-link-node" />
      </g>
    );
  });

  // highlight the cells you can tie while a tree is picked
  const targets = [];
  (linkTargets || []).forEach(([r, c], i) => {
    targets.push(<rect key={"tg" + i} className="tn-target"
      x={gx(c) + 3.5} y={gy(r) + 3.5} width={CELL - 7} height={CELL - 7} rx={7} pointerEvents="none" />);
  });

  // pulsing ring around the picked tree
  const selRing = [];
  if (selTreeRC) {
    selRing.push(<rect key="selr" className="tn-seltree"
      x={gx(selTreeRC.c) + 2} y={gy(selTreeRC.r) + 2} width={CELL - 4} height={CELL - 4} rx={9} pointerEvents="none" />);
  }

  // clues
  const clueEls = [];
  rowClues.forEach((n, r) => {
    let cls = "tn-clue";
    if (rowMet && rowMet[r]) cls += " done";
    if (showErrors && rowOver && rowOver[r]) cls += " over";
    clueEls.push(
      <text key={"rc" + r} className={cls} x={leftG - CLUE / 2} y={gy(r) + CELL / 2}
        textAnchor="middle" dominantBaseline="central">{n}</text>
    );
  });
  colClues.forEach((n, c) => {
    let cls = "tn-clue";
    if (colMet && colMet[c]) cls += " done";
    if (showErrors && colOver && colOver[c]) cls += " over";
    clueEls.push(
      <text key={"cc" + c} className={cls} x={gx(c) + CELL / 2} y={topG - CLUE / 2}
        textAnchor="middle" dominantBaseline="central">{n}</text>
    );
  });

  return (
    <svg className={"tn-board-svg" + (won ? " won" : "")}
         viewBox={"0 0 " + W + " " + H}
         onPointerDown={handleDown}
         onPointerMove={handleMove}
         onPointerUp={handleUp}
         onPointerCancel={handleUp}
         onPointerLeave={() => setHover(null)}
         onContextMenu={(e) => e.preventDefault()}>
      <g>{shades}</g>
      <g>{hl}</g>
      <g>{linkTints}</g>
      <g>{targets}</g>
      <g>{lines}</g>
      <g>{linkTies}</g>
      <g>{glyphs}</g>
      <g>{selRing}</g>
      <g>{clueEls}</g>
      <g>{hits}</g>
    </svg>
  );
}

window.TentsBoard = TentsBoard;
