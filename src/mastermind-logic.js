/* ============================================================
   mastermind-logic.js — secret code + Knuth peg scoring
   Exposed as window.Mastermind
   ============================================================ */
(function () {
  // make a secret of `slots` pegs drawn from `colors` colours (repeats allowed)
  function makeSecret(slots, colors) {
    const s = [];
    for (let i = 0; i < slots; i++) s.push(Math.floor(Math.random() * colors));
    return s;
  }

  // score a guess against the secret → { black, white }
  function score(guess, secret) {
    const n = secret.length;
    let black = 0;
    const sCount = {}, gCount = {};
    for (let i = 0; i < n; i++) {
      if (guess[i] === secret[i]) black++;
      else {
        sCount[secret[i]] = (sCount[secret[i]] || 0) + 1;
        gCount[guess[i]] = (gCount[guess[i]] || 0) + 1;
      }
    }
    let white = 0;
    for (const c in gCount) white += Math.min(gCount[c], sCount[c] || 0);
    return { black, white };
  }

  window.Mastermind = { makeSecret, score };
})();
