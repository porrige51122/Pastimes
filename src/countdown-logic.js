/* ============================================================
   countdown-logic.js — deal numbers + arithmetic solver
   Exposed as window.Countdown
   ============================================================ */
(function () {
  const LARGE = [25, 50, 75, 100];

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Deal six numbers: `bigCount` large (0..4), rest small (1..10, two of each).
  function dealNumbers(bigCount) {
    bigCount = Math.max(0, Math.min(4, bigCount));
    const bigs = shuffle(LARGE.slice()).slice(0, bigCount);
    const smallPool = [];
    for (let n = 1; n <= 10; n++) { smallPool.push(n, n); }
    shuffle(smallPool);
    const smalls = smallPool.slice(0, 6 - bigCount);
    return shuffle(bigs.concat(smalls));
  }

  function randTarget(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // ---- solver: best reachable value toward target ----
  // Returns { value, diff, expr } where expr is a parenthesised string.
  function solve(numbers, target) {
    let best = null;
    const consider = (value, expr) => {
      const diff = Math.abs(value - target);
      if (!best || diff < best.diff || (diff === best.diff && expr.length < best.expr.length)) {
        best = { value, diff, expr };
      }
      return diff === 0;
    };

    // each item: { v: value, e: expr-string }
    const start = numbers.map((n) => ({ v: n, e: String(n) }));
    for (const it of start) consider(it.v, it.e);

    const seen = new Set();
    function recurse(items) {
      if (best && best.diff === 0) return;
      const key = items.map((x) => x.v).sort((a, b) => a - b).join(",");
      if (seen.has(key)) return;
      seen.add(key);

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const rest = [];
          for (let k = 0; k < items.length; k++) if (k !== i && k !== j) rest.push(items[k]);

          const hi = a.v >= b.v ? a : b;
          const lo = a.v >= b.v ? b : a;
          const results = [];
          results.push({ v: hi.v + lo.v, e: "(" + hi.e + " + " + lo.e + ")" });
          if (hi.v - lo.v > 0) results.push({ v: hi.v - lo.v, e: "(" + hi.e + " - " + lo.e + ")" });
          if (lo.v !== 1) results.push({ v: hi.v * lo.v, e: "(" + hi.e + " × " + lo.e + ")" });
          if (lo.v !== 0 && hi.v % lo.v === 0 && lo.v !== 1)
            results.push({ v: hi.v / lo.v, e: "(" + hi.e + " ÷ " + lo.e + ")" });

          for (const res of results) {
            if (consider(res.v, res.e)) return;
            if (rest.length) recurse(rest.concat([res]));
            if (best && best.diff === 0) return;
          }
        }
      }
    }
    recurse(start);
    return best;
  }

  // strip one layer of outer parens for display
  function pretty(expr) {
    if (expr.startsWith("(") && expr.endsWith(")")) {
      let depth = 0;
      for (let i = 0; i < expr.length; i++) {
        if (expr[i] === "(") depth++;
        else if (expr[i] === ")") { depth--; if (depth === 0 && i < expr.length - 1) return expr; }
      }
      return expr.slice(1, -1);
    }
    return expr;
  }

  window.Countdown = { dealNumbers, randTarget, solve, pretty, LARGE };
})();
