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
