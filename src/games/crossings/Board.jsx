/* ============================================================
   Board.jsx — SVG board renderer + interactions
   exposes window.Board
   ============================================================ */
const CELL = 64;
const PAD = 48;
const R = 23;

function Board(props) {
  const { puzzle, counts, validation, selected, showErrors, won,
          onIslandClick, onEdgeClick, onEdgeRightClick } = props;
  const { islands, edges, rows, cols } = puzzle;

  const W = PAD * 2 + (cols - 1) * CELL;
  const H = PAD * 2 + (rows - 1) * CELL;
  const cx = (i) => PAD + i.c * CELL;
  const cy = (i) => PAD + i.r * CELL;

  // grid dots
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(<circle key={"d" + r + "_" + c} className="grid-dot" cx={PAD + c * CELL} cy={PAD + r * CELL} r={2.4} />);
    }
  }

  // index of edge incident to selected (for ghost links)
  const ghosts = [];
  if (selected != null && !won) {
    edges.forEach((e, i) => {
      if (e.a === selected || e.b === selected) {
        if ((counts[i] || 0) < 2) {
          const A = islands[e.a], B = islands[e.b];
          ghosts.push(
            <line key={"g" + i} className="ghost-link"
              x1={cx(A)} y1={cy(A)} x2={cx(B)} y2={cy(B)} strokeWidth={3} />
          );
        }
      }
    });
  }

  // bridges
  const bridgeEls = [];
  edges.forEach((e, i) => {
    const n = counts[i] || 0;
    if (n <= 0) return;
    const A = islands[e.a], B = islands[e.b];
    const x1 = cx(A), y1 = cy(A), x2 = cx(B), y2 = cy(B);
    const horizontal = A.r === B.r;
    const off = 6.5;
    const lines = [];
    if (n === 1) {
      lines.push([x1, y1, x2, y2]);
    } else {
      if (horizontal) {
        lines.push([x1, y1 - off, x2, y2 - off]);
        lines.push([x1, y1 + off, x2, y2 + off]);
      } else {
        lines.push([x1 - off, y1, x2 - off, y2]);
        lines.push([x1 + off, y1, x2 + off, y2]);
      }
    }
    bridgeEls.push(
      <g key={"b" + i}>
        <line className="bridge-hit"
          x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={20}
          onClick={(ev) => { ev.stopPropagation(); onEdgeClick(i); }}
          onContextMenu={(ev) => { ev.preventDefault(); ev.stopPropagation(); onEdgeRightClick(i); }} />
        <g className="bridge-vis">
          {lines.map((l, k) => (
            <line key={k} className="bridge"
              x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} strokeWidth={4} />
          ))}
        </g>
      </g>
    );
  });

  // islands
  const islandEls = islands.map((isl, idx) => {
    const x = cx(isl), y = cy(isl);
    const status = validation.islandStatus[idx];
    const isSel = selected === isl.id;
    let numClass = "island-num";
    let fill = "var(--isl-fill)";
    let strokeCol = "var(--isl-border)";
    if (showErrors && status === "over") { numClass += " over"; fill = "var(--error-tint)"; strokeCol = "var(--error)"; }
    else if (showErrors && status === "done") { numClass += " done"; fill = "var(--done-tint)"; strokeCol = "var(--done)"; }

    return (
      <g key={"i" + isl.id} className="island-group"
         style={won ? { animationDelay: (idx % 6) * 0.12 + "s" } : null}
         onClick={(ev) => { ev.stopPropagation(); onIslandClick(isl.id); }}>
        {/* hover ring */}
        <circle className="ripple" cx={x} cy={y} r={R} strokeWidth={2.5} />
        {/* selection ring */}
        {isSel && <circle className="sel-ring" cx={x} cy={y} r={R + 7} fill="none" stroke="var(--accent)" strokeWidth={3.5} />}
        {/* island body */}
        <circle className="island-base" cx={x} cy={y} r={R} fill={fill} stroke={strokeCol} strokeWidth={3} />
        <text className={numClass} x={x} y={y + 1} fontSize={R * 1.05}>{isl.value}</text>
        {/* big click target */}
        <circle className="island-hit" cx={x} cy={y} r={R + 6} />
      </g>
    );
  });

  return (
    <svg className={"board-svg" + (won ? " win" : "")}
         viewBox={"0 0 " + W + " " + H}
         onContextMenu={(e) => e.preventDefault()}
         onClick={() => onIslandClick(null)}>
      <g>{dots}</g>
      <g>{ghosts}</g>
      <g>{bridgeEls}</g>
      <g>{islandEls}</g>
    </svg>
  );
}

window.Board = Board;
