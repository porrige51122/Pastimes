/* ============================================================
   rules.js — shared "how to play" modal + per-game content
   Exposes window.PastimesRules.open(slug) / .close()
   ============================================================ */
(function () {
  const RULES = {
    crossings: {
      kicker: "Bridges · Logic",
      title: "How to play Crossings",
      blocks: [
        { h: "The goal", p: "Connect every island into a single network of bridges. The number on each island is exactly how many bridge-ends must touch it." },
        { h: "The rules", list: [
          "Bridges run only <b>horizontally or vertically</b>, in a straight line between two islands.",
          "At most <b>two bridges</b> may join any pair of islands.",
          "Bridges <b>never cross</b> each other or pass over an island.",
          "When you're done, every island must be reachable from every other — <b>one connected whole</b>.",
        ] },
        { h: "Controls", p: "Click an island, then a neighbour, to lay a bridge. Click the same pair again to add a second bridge; once more to clear it." },
        { tips: true, h: "Tips & tricks", list: [
          "Start with islands that <b>force their bridges</b>: a corner “4”, an edge “6”, or a “8” in open space must use double bridges in every available direction.",
          "An island whose number equals twice its open directions is fully determined — fill it immediately.",
          "A lone “1” or “2” pointing at a single neighbour gives a guaranteed first link to build from.",
          "Avoid sealing off a small group early — if a cluster becomes self-satisfied but separate, the puzzle can't finish as one network.",
        ] },
      ],
    },
    hatch: {
      kicker: "Nonogram · Logic",
      title: "How to play Hatch",
      blocks: [
        { h: "The goal", p: "Fill in cells to reveal a hidden picture. The numbers beside each row and column are the lengths of the filled <b>runs</b>, in order." },
        { h: "The rules", list: [
          "A clue like <b>“3 1”</b> means a run of 3 filled cells, then a gap, then a run of 1 — in that order.",
          "Runs in the same line are always separated by <b>at least one empty cell</b>.",
          "Every row and column must match its clues exactly.",
        ] },
        { h: "Controls", p: "Click to fill a cell; right-click to mark it empty with an ✕. Marking empties is just as important as filling." },
        { tips: true, h: "Tips & tricks", list: [
          "<b>Overlap:</b> when a run is longer than half the line, its centre cells are filled no matter where it sits. Pencil those in first.",
          "Anchor runs to the <b>ends</b> — a clue touching the edge fixes that run's position.",
          "Mark <b>empties</b> aggressively; they hem in the remaining runs and reveal forced moves.",
          "Bounce between a row and the columns it touches — each solved cell unlocks the line crossing it.",
        ] },
      ],
    },
    sweep: {
      kicker: "Minesweeper · Logic",
      title: "How to play Sweep",
      blocks: [
        { h: "The goal", p: "Reveal every safe square without ever uncovering a mine. Each number tells you how many mines hide in the <b>eight cells around it</b>." },
        { h: "The rules", list: [
          "Click a covered cell to reveal it. A blank opens up its neighbours automatically.",
          "Right-click to plant a <b>flag</b> where you believe a mine is.",
          "Reveal one mine and the game ends — clear all safe cells to win.",
        ] },
        { h: "Controls", p: "Left-click reveals, right-click flags. Middle-click (or click a satisfied number) to <b>chord</b> — open all its remaining neighbours at once." },
        { tips: true, h: "Tips & tricks", list: [
          "If a number already touches that many flags, all its <b>other</b> neighbours are safe — chord them open.",
          "If a number equals its count of still-covered neighbours, every one of those is a <b>mine</b>.",
          "Compare two adjacent numbers: the difference often pins down exactly which shared cells are mines.",
          "When truly stuck, play the <b>edges and corners</b> — fewer neighbours means fewer ways to be wrong.",
        ] },
      ],
    },
    tents: {
      kicker: "Trees & Tents · Logic",
      title: "How to play Tents",
      blocks: [
        { h: "The goal", p: "Pitch exactly one tent next to every tree. The clues count how many tents sit in each row and column." },
        { h: "The rules", list: [
          "Each tree gets <b>one tent</b>, placed in a cell directly above, below, left or right of it.",
          "Tents <b>never touch</b> one another — not even diagonally.",
          "The number of tents in each row and column must match its clue.",
          "Tents and trees pair up <b>one-to-one</b>.",
        ] },
        { h: "Controls", p: "Click a square to pitch a tent; right-click to mark grass. Click a tree then an adjacent square to tie the two together as a personal aid." },
        { tips: true, h: "Tips & tricks", list: [
          "A clue of <b>0</b> empties that whole line — fill it with grass straight away.",
          "A tree with only <b>one free neighbour</b> forces a tent there.",
          "After every tent, mark all <b>eight surrounding cells</b> as grass — tents can't touch.",
          "If a line's clue equals its remaining free cells, they're <b>all</b> tents.",
        ] },
      ],
    },
    shikaku: {
      kicker: "Rectangles · Logic",
      title: "How to play Shikaku",
      blocks: [
        { h: "The goal", p: "Divide the whole grid into rectangles. Each rectangle holds exactly one number, and that number is the count of cells it covers." },
        { h: "The rules", list: [
          "Every rectangle contains <b>exactly one</b> number.",
          "A rectangle's area equals its number (a “6” covers six cells, e.g. 2×3 or 1×6).",
          "Rectangles <b>never overlap</b>, and together they fill the entire grid.",
        ] },
        { h: "Controls", p: "Click and drag from one corner to another to draw a rectangle around a number. Drag it again to resize, or click it to remove." },
        { tips: true, h: "Tips & tricks", list: [
          "List the <b>factor pairs</b> of each number — those are the only shapes it can take.",
          "<b>Primes</b> (and small numbers) have just one shape; place them where space is tight.",
          "A rectangle may contain <b>only its own</b> number — if a shape would swallow a second clue, it's wrong.",
          "Work outward from <b>corners and edges</b>, where options are most limited.",
        ] },
      ],
    },
    countdown: {
      kicker: "Numbers · Arithmetic",
      title: "How to play Countdown",
      blocks: [
        { h: "The goal", p: "Use the six numbers and the four operations to reach the <b>target</b> exactly. Get there and you win; the readout always shows how close you are." },
        { h: "The rules", list: [
          "Combine two numbers with <b>+, −, × or ÷</b> to make a new one; repeat as you like.",
          "Each number can be used <b>once</b> — you needn't use all six.",
          "No step may go <b>below zero</b>, and division must come out to a <b>whole number</b>.",
        ] },
        { h: "Controls", p: "Tap a number, tap an operator, then tap a second number to combine them. Undo steps back; Best reveals an exact (or closest) solution." },
        { tips: true, h: "Tips & tricks", list: [
          "Work <b>backwards from the target</b>: what's it close to? Often target ÷ a number, or target ± a small one.",
          "Use the <b>big numbers</b> (25/50/75/100) to leap into range by multiplying, then fine-tune with the small ones.",
          "Aim for a tidy <b>multiple of 25 or 50</b> near the target, then add or subtract the difference.",
          "Don't force all six numbers in — the cleanest route is often three or four.",
        ] },
      ],
    },
    skyscrapers: {
      kicker: "Latin square · Logic",
      title: "How to play Skyscrapers",
      blocks: [
        { h: "The goal", p: "Fill the grid with building heights so each row and column uses every height once. The edge clues count how many buildings you can <b>see</b> from that side." },
        { h: "The rules", list: [
          "In an N×N grid, every row and column contains the heights <b>1 to N</b>, once each.",
          "A taller building <b>hides</b> every shorter one behind it.",
          "An edge clue is how many buildings are visible looking down that row or column — clue <b>3</b> means you see exactly three.",
        ] },
        { h: "Controls", p: "Click a cell, then type a number or tap the keypad. Arrow keys move; Backspace clears." },
        { tips: true, h: "Tips & tricks", list: [
          "A clue of <b>1</b> means the tallest building (N) sits right at that edge.",
          "A clue of <b>N</b> forces a strict climb: 1, 2, 3, … from that edge inward.",
          "Big clues push the <b>tall buildings away</b> from that side; small clues pull them close.",
          "Read a row's two opposite clues together — they often pin the tallest building's position between them.",
        ] },
      ],
    },
    sudoku: {
      kicker: "Number placement · Logic",
      title: "How to play Sudoku",
      blocks: [
        { h: "The goal", p: "Fill every empty cell so that each <b>row</b>, each <b>column</b> and each <b>3×3 box</b> contains the digits 1 to 9 exactly once." },
        { h: "The rules", list: [
          "No digit may repeat within a <b>row</b>.",
          "No digit may repeat within a <b>column</b>.",
          "No digit may repeat within a <b>3×3 box</b>.",
          "The starting clues are fixed — every puzzle has <b>one</b> solution reachable by logic alone.",
        ] },
        { h: "Controls", p: "Click a cell, then type a digit or tap the keypad. Turn on <b>Pencil</b> (or press Space) to jot small candidate notes; placing a real number clears the notes around it. Arrow keys move, Backspace clears." },
        { tips: true, h: "Tips & tricks", list: [
          "<b>Scan for singles:</b> a cell whose row, column and box already show eight different digits can only be the ninth.",
          "Work a digit at a time — find rows, columns and boxes where a number has just <b>one</b> place left.",
          "<b>Pencil in candidates</b> for the tight cells, then watch for a digit that appears only once in a line or box.",
          "When two cells in a unit share the same two candidates, those digits are <b>locked</b> to that pair — erase them elsewhere in the unit.",
        ] },
      ],
    },
    galaxies: {
      kicker: "Spiral Galaxies · Logic",
      title: "How to play Galaxies",
      blocks: [
        { h: "The goal", p: "Divide the whole grid into regions — one per dot. Each region must look exactly the same when you spin it half a turn (180°) around its dot." },
        { h: "The rules", list: [
          "Every region contains <b>exactly one dot</b>, sitting at its centre of rotation.",
          "Each region is <b>180°-symmetric</b> about that dot — every cell has a matching partner on the opposite side.",
          "Regions are <b>single connected shapes</b> and never overlap; together they fill the whole grid.",
        ] },
        { h: "Controls", p: "Tap a dot to choose its galaxy, then click or drag across cells to paint them in — the symmetric half fills in automatically. Tap a painted cell (or right-click) to clear it." },
        { tips: true, h: "Tips & tricks", list: [
          "Cells in the <b>corners and along the edges</b> usually belong to the nearest dot — start there.",
          "A dot sitting <b>on an edge or corner</b> between cells owns all the cells it touches; pencil those in first.",
          "Every cell you add must have its <b>mirror partner</b> across the dot — if that partner is off the grid, the cell can't belong to that galaxy.",
          "When two dots compete for a cell, the one that keeps both regions <b>connected</b> usually wins.",
        ] },
      ],
    },
    mastermind: {
      kicker: "Code-breaker · Deduction",
      title: "How to play Mastermind",
      blocks: [
        { h: "The goal", p: "Crack the hidden colour code within your allotted guesses, using the feedback pegs after each try." },
        { h: "The rules", list: [
          "Each guess fills every slot with a colour — <b>repeats are allowed</b>.",
          "A <b>dark peg</b> = a colour that's the right colour <b>and</b> in the right spot.",
          "A <b>light peg</b> = right colour, but in the wrong spot.",
          "Pegs don't say <b>which</b> slot they refer to — that's the puzzle.",
        ] },
        { h: "Controls", p: "Tap a colour to drop it into the next slot (or keys 1–N), then Guess. Undo clears the last peg." },
        { tips: true, h: "Tips & tricks", list: [
          "Open with a <b>varied guess</b> to find out which colours are in play before worrying about position.",
          "The <b>total pegs</b> (dark + light) tells you how many of your colours belong in the code.",
          "A colour that earns <b>zero pegs</b> isn't in the code — rule it out entirely.",
          "Once you know the colour set, <b>change one peg at a time</b> to learn where each belongs.",
        ] },
      ],
    },
    kenken: {
      kicker: "Latin square · Arithmetic",
      title: "How to play KenKen",
      blocks: [
        { h: "The goal", p: "Fill the grid so every row and column holds each number from <b>1 to N</b> once — and every bold-outlined <b>cage</b> reaches its target using the shown operation." },
        { h: "The rules", list: [
          "Each row and column contains <b>1 to N</b>, no repeats (N is the grid size).",
          "A cage clue like <b>6×</b>, <b>3−</b>, <b>8+</b> or <b>2÷</b> is the result of combining its cells with that operation.",
          "For <b>+</b> and <b>×</b> the order doesn't matter; for <b>−</b> and <b>÷</b> (always two cells) it's the larger combined with the smaller.",
          "A cage may <b>repeat a number</b>, as long as the row/column rule is never broken.",
        ] },
        { h: "Controls", p: "Click a cell, then type a number or tap the keypad. Turn on <b>Pencil</b> (or press Space) to jot candidates. Arrow keys move; Backspace clears." },
        { tips: true, h: "Tips & tricks", list: [
          "Start with <b>single-cell cages</b> — the clue is the answer.",
          "List the number pairs that make a two-cell cage: a <b>3−</b> is {1,4}, {2,5}, {3,6}… ; a small <b>+</b> or large <b>×</b> has few options.",
          "Use the <b>row/column rule</b> to rule combinations out — a pair that repeats a digit in a line is impossible.",
          "Big <b>×</b> targets often force the high numbers; tiny <b>+</b> targets force the low ones.",
        ] },
      ],
    },
    futoshiki: {
      kicker: "Latin square · Logic",
      title: "How to play Futoshiki",
      blocks: [
        { h: "The goal", p: "Fill the grid so each row and column holds every number from <b>1 to N</b> once, while honouring every <b>greater-than</b> sign between cells." },
        { h: "The rules", list: [
          "Each row and column contains <b>1 to N</b>, no repeats.",
          "A sign always points from the <b>larger</b> number to the smaller — <b>&gt;</b> and <b>&lt;</b> between side-by-side cells, <b>∨</b> and <b>∧</b> between stacked ones.",
          "Some cells start with a <b>given</b> number; these are fixed.",
          "Every puzzle has <b>one</b> solution reachable by logic alone.",
        ] },
        { h: "Controls", p: "Click a cell, then type a number or tap the keypad. Turn on <b>Pencil</b> (or press Space) to jot candidates. Arrow keys move; Backspace clears." },
        { tips: true, h: "Tips & tricks", list: [
          "The cell at the open end of a chain like <b>a&gt;b&gt;c</b> can't be too small — and the pointed end can't be too big.",
          "In an N-grid, a cell that must be <b>greater than</b> two others is at least 3; one smaller than two others is at most N−2.",
          "Combine a sign with the <b>row/column rule</b> — often only one number satisfies both.",
          "Pencil in candidates, then prune them with each inequality you pass.",
        ] },
      ],
    },
    killer: {
      kicker: "Number placement · Logic",
      title: "How to play Killer Sudoku",
      blocks: [
        { h: "The goal", p: "Fill every cell so each <b>row</b>, <b>column</b> and <b>3×3 box</b> holds 1–9 once — and every dashed <b>cage</b> adds up to the small number in its corner." },
        { h: "The rules", list: [
          "Standard sudoku: no digit repeats in a <b>row</b>, <b>column</b> or <b>3×3 box</b>.",
          "The cells of a dashed <b>cage</b> must <b>sum</b> to its corner total.",
          "A digit may <b>not repeat inside a cage</b>.",
          "Every puzzle has <b>one</b> solution reachable by logic alone.",
        ] },
        { h: "Controls", p: "Click a cell, then type a digit or tap the keypad. Turn on <b>Pencil</b> (or press Space) to jot candidates. Arrow keys move; Backspace clears." },
        { tips: true, h: "Tips & tricks", list: [
          "Learn the <b>fixed splits</b>: a two-cell cage of 3 is {1,2}; of 17 is {8,9}; a three-cell cage of 6 is {1,2,3}.",
          "<b>Rule of 45:</b> each row, column and box totals 45 — a cage poking just one cell out of a box pins that cell's value.",
          "Where cages sit fully inside a box, subtract their sums from 45 to find what's left.",
          "Combine cage maths with normal sudoku scanning — each feeds the other.",
        ] },
      ],
    },
    slitherlink: {
      kicker: "Loop · Logic",
      title: "How to play Slitherlink",
      blocks: [
        { h: "The goal", p: "Draw a single, continuous, non-intersecting loop along cell edges. The numbers inside cells tell you exactly how many of that cell's four sides are part of the loop." },
        { h: "The rules", list: [
          "The loop runs along the <b>edges</b> of a grid of square cells.",
          "A cell with the number <b>3</b> has exactly three of its four edges in the loop.",
          "A cell with <b>no number</b> could have any count — zero to four.",
          "The loop must be a <b>single closed path</b> — no branches, no crossings, no loose ends.",
        ] },
        { h: "Controls", p: "Click an edge between two dots to draw a line. Click again to remove it. Right-click to mark an edge as definitely empty (✕)." },
        { tips: true, h: "Tips & tricks", list: [
          "A <b>0</b> clue means none of its four edges are in the loop — mark them all ✕.",
          "A <b>3</b> clue in a corner must use all three available edges.",
          "Two adjacent <b>3</b> clues share an edge that must be part of the loop, plus the outer edges of both.",
          "At every dot, the loop either <b>doesn't pass through</b> or passes through with <b>exactly two</b> edges — never one or three.",
        ] },
      ],
    },
    masyu: {
      kicker: "Loop · Logic",
      title: "How to play Masyu",
      blocks: [
        { h: "The goal", p: "Draw a single closed loop that passes through every pearl on the grid. White and black pearls impose different constraints on how the loop behaves." },
        { h: "The rules", list: [
          "The loop passes through <b>cell centres</b>, connecting adjacent cells horizontally or vertically.",
          "<b>White pearl</b>: the loop goes <b>straight</b> through it, but must <b>turn</b> on at least one of its immediate neighbours in the direction of travel.",
          "<b>Black pearl</b>: the loop <b>turns 90°</b> on it, and must go <b>straight</b> for at least one cell in both the entering and exiting directions.",
          "The loop must be a <b>single closed path</b> — no branches, no crossings, no loose ends.",
        ] },
        { h: "Controls", p: "Click between two adjacent cells to draw or remove a line. Right-click to mark an edge as definitely empty (✕)." },
        { tips: true, h: "Tips & tricks", list: [
          "A <b>black pearl</b> near a corner or edge often has only one valid turn direction — work those out first.",
          "A <b>white pearl</b> tells you the loop is straight here but <b>must bend nearby</b> — look at what forces the turn.",
          "Two black pearls in a row often force a zigzag pattern between them.",
          "If the loop <b>must</b> pass through a cell to stay connected, you can fill in those edges even without a pearl.",
        ] },
      ],
    },
    battleships: {
      kicker: "Fleet · Deduction",
      title: "How to play Battleships",
      blocks: [
        { h: "The goal", p: "Find every ship hidden in the grid. The numbers along each row and column tell you how many cells in that line are occupied by ship segments." },
        { h: "The rules", list: [
          "Ships are <b>straight lines</b> — horizontal or vertical. They never bend.",
          "Ships <b>don't touch</b> each other, not even diagonally.",
          "Some cells are revealed as hints: a <b>blue segment</b> is part of a ship, a <b>tilde ~</b> is water.",
          "The fleet list shows the exact ships you need to place.",
        ] },
        { h: "Controls", p: "Click to place a ship cell; right-click (or use the Water toggle) to mark water. Click a placed cell again to clear it." },
        { tips: true, h: "Tips & tricks", list: [
          "A row or column clue of <b>0</b> means the whole line is water — mark every cell.",
          "If a row's clue equals its <b>remaining empty cells</b>, they're all ship.",
          "Once you place a ship cell, mark its <b>diagonal neighbours</b> as water — ships can't touch diagonally.",
          "Place the <b>largest ships first</b>; they have the fewest valid positions.",
        ] },
      ],
    },
    starbattle: {
      kicker: "Stars · Logic",
      title: "How to play Star Battle",
      blocks: [
        { h: "The goal", p: "Place stars on the grid so that every <b>row</b>, <b>column</b> and <b>coloured region</b> contains exactly the required number of stars." },
        { h: "The rules", list: [
          "Each row must contain exactly <b>N</b> stars (shown in the stats bar).",
          "Each column must contain exactly <b>N</b> stars.",
          "Each coloured <b>region</b> must contain exactly <b>N</b> stars.",
          "Stars <b>cannot touch</b> each other — not even diagonally.",
        ] },
        { h: "Controls", p: "Click to place a star; right-click (or use the Mark toggle) to mark a cell empty (✕). Click a star again to remove it." },
        { tips: true, h: "Tips & tricks", list: [
          "Start with the <b>smallest regions</b> — they have the fewest options.",
          "Once a star is placed, mark all <b>eight surrounding cells</b> as empty — stars can't touch.",
          "If a region has only <b>N cells left</b> that could hold stars, they must all be stars.",
          "Cross-reference rows, columns and regions — a cell forced by two constraints is certain.",
        ] },
      ],
    },
    mosaic: {
      kicker: "Fill-a-Pix · Logic",
      title: "How to play Mosaic",
      blocks: [
        { h: "The goal", p: "Shade cells so that every numbered cell ends up with exactly that many shaded cells in the <b>3×3 block</b> centred on it — itself included." },
        { h: "The rules", list: [
          "A clue counts the shaded cells in its own cell plus the (up to) eight around it.",
          "A <b>0</b> means none of those nine cells are shaded; a <b>9</b> means all of them are.",
          "Edge and corner clues count a smaller block (6 or 4 cells).",
          "Every puzzle has <b>one</b> solution reachable by logic alone.",
        ] },
        { h: "Controls", p: "<b>Click or drag</b> to shade cells; <b>right-click</b> (or Ctrl-click) to mark a cell empty. Marking empties helps you keep track." },
        { tips: true, h: "Tips & tricks", list: [
          "Act on the extremes first: a <b>0</b> clears its whole block, a <b>9</b> fills it.",
          "Near an edge, a clue equal to its block size (6 on a side, 4 in a corner) fills that block.",
          "When a clue's shaded count is already met, mark its <b>remaining</b> neighbours empty.",
          "Overlap two nearby clues — the difference between them often forces a single cell.",
        ] },
      ],
    },
  };

  const X_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  function render(slug) {
    const r = RULES[slug];
    if (!r) return "";
    let h = "";
    h += '<div class="rules-head">';
    h += '<div class="rules-kicker">' + r.kicker + "</div>";
    h += '<h2 class="rules-title">' + r.title + "</h2>";
    h += '<button class="rules-close" aria-label="Close">' + X_ICON + "</button>";
    h += "</div>";
    h += '<div class="rules-body">';
    r.blocks.forEach(function (b) {
      h += '<div class="rules-section' + (b.tips ? " tips" : "") + '">';
      if (b.h) h += "<h3>" + b.h + "</h3>";
      if (b.p) h += "<p>" + b.p + "</p>";
      if (b.list) {
        h += "<ul>";
        b.list.forEach(function (li) { h += "<li>" + li + "</li>"; });
        h += "</ul>";
      }
      h += "</div>";
    });
    h += "</div>";
    h += '<div class="rules-foot"><button class="btn primary rules-got">Got it</button></div>';
    return h;
  }

  let overlay = null;
  function ensure() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "rules-overlay";
    overlay.innerHTML = '<div class="rules-card" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    return overlay;
  }

  function open(slug) {
    ensure();
    const card = overlay.querySelector(".rules-card");
    card.innerHTML = render(slug);
    const close1 = card.querySelector(".rules-close");
    const close2 = card.querySelector(".rules-got");
    if (close1) close1.addEventListener("click", close);
    if (close2) close2.addEventListener("click", close);
    const body = card.querySelector(".rules-body");
    if (body) body.scrollTop = 0;
    // flush the base (opacity:0) state so adding .show transitions in.
    // Using a forced reflow instead of rAF keeps it reliable even when the
    // tab isn't painting (background iframes freeze requestAnimationFrame).
    void overlay.offsetWidth;
    overlay.classList.add("show");
  }

  function close() {
    if (overlay) overlay.classList.remove("show");
  }

  window.PastimesRules = { open: open, close: close };
})();
