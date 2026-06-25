/* ============================================================
   sw.js — Pastimes service worker
   Strategy:
     • Local assets   → cache-first (pre-cached on install)
     • CDN assets     → cache-first (versioned URLs, safe forever)
     • Google Fonts CSS → stale-while-revalidate
   Bump CACHE_VERSION whenever you ship new local files so old
   caches are cleaned up on the next visit.
   ============================================================ */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `pastimes-static-${CACHE_VERSION}`;
const CDN_CACHE     = 'pastimes-cdn'; /* no version — CDN URLs are already versioned */

/* ── All local files to pre-cache on install ─────────────── */
const STATIC_ASSETS = [
  /* shell */
  '/index.html',

  /* categories */
  '/categories/all.html',
  '/categories/deduction.html',
  '/categories/numbers.html',
  '/categories/pictures-regions.html',
  '/categories/place-connect.html',

  /* shared design system */
  '/shared/styles.css',
  '/shared/splash.css',
  '/shared/rules.css',
  '/shared/rules.js',
  '/shared/sw-register.js',
  '/shared/favicon.svg',
  '/shared/favicon.png',
  '/shared/favicon-32.png',
  '/shared/favicon-180.png',

  /* ── games ──────────────────────────────────────────────── */
  '/games/battleships/Battleships.html',
  '/games/battleships/BattleshipsApp.jsx',
  '/games/battleships/battleships-logic.js',
  '/games/battleships/battleships.css',

  '/games/countdown/Countdown.html',
  '/games/countdown/CountdownApp.jsx',
  '/games/countdown/countdown-logic.js',
  '/games/countdown/countdown.css',

  '/games/crossings/Crossings.html',
  '/games/crossings/App.jsx',
  '/games/crossings/Board.jsx',
  '/games/crossings/hashi-logic.js',

  '/games/futoshiki/Futoshiki.html',
  '/games/futoshiki/FutoshikiApp.jsx',
  '/games/futoshiki/futoshiki-logic.js',
  '/games/futoshiki/futoshiki.css',

  '/games/galaxies/Galaxies.html',
  '/games/galaxies/GalaxiesApp.jsx',
  '/games/galaxies/GalaxiesBoard.jsx',
  '/games/galaxies/galaxies-logic.js',
  '/games/galaxies/galaxies.css',

  '/games/hatch/Hatch.html',
  '/games/hatch/PicrossApp.jsx',
  '/games/hatch/PicrossBoard.jsx',
  '/games/hatch/picross-logic.js',
  '/games/hatch/picross.css',

  '/games/kenken/KenKen.html',
  '/games/kenken/KenKenApp.jsx',
  '/games/kenken/kenken-logic.js',
  '/games/kenken/kenken.css',

  '/games/killer/Killer.html',
  '/games/killer/KillerApp.jsx',
  '/games/killer/killer-logic.js',
  '/games/killer/killer.css',

  '/games/mastermind/Mastermind.html',
  '/games/mastermind/MastermindApp.jsx',
  '/games/mastermind/mastermind-logic.js',
  '/games/mastermind/mastermind.css',

  '/games/masyu/Masyu.html',
  '/games/masyu/MasyuApp.jsx',
  '/games/masyu/masyu-logic.js',
  '/games/masyu/masyu.css',

  '/games/mosaic/Mosaic.html',
  '/games/mosaic/MosaicApp.jsx',
  '/games/mosaic/mosaic-logic.js',
  '/games/mosaic/mosaic.css',

  '/games/nurikabe/Nurikabe.html',
  '/games/nurikabe/NurikabeApp.jsx',
  '/games/nurikabe/nurikabe-logic.js',
  '/games/nurikabe/nurikabe.css',

  '/games/shikaku/Shikaku.html',
  '/games/shikaku/ShikakuApp.jsx',
  '/games/shikaku/ShikakuBoard.jsx',
  '/games/shikaku/shikaku-logic.js',
  '/games/shikaku/shikaku.css',

  '/games/skyscrapers/Skyscrapers.html',
  '/games/skyscrapers/SkyscrapersApp.jsx',
  '/games/skyscrapers/skyscrapers-logic.js',
  '/games/skyscrapers/skyscrapers.css',

  '/games/slitherlink/Slitherlink.html',
  '/games/slitherlink/SlitherlinkApp.jsx',
  '/games/slitherlink/slitherlink-logic.js',
  '/games/slitherlink/slitherlink.css',

  '/games/starbattle/StarBattle.html',
  '/games/starbattle/StarBattleApp.jsx',
  '/games/starbattle/starbattle-logic.js',
  '/games/starbattle/starbattle.css',

  '/games/sudoku/Sudoku.html',
  '/games/sudoku/SudokuApp.jsx',
  '/games/sudoku/sudoku-logic.js',
  '/games/sudoku/sudoku.css',

  '/games/sweep/Sweep.html',
  '/games/sweep/MinesweeperApp.jsx',
  '/games/sweep/MinesweeperBoard.jsx',
  '/games/sweep/minesweeper-logic.js',
  '/games/sweep/minesweeper.css',

  '/games/tents/Tents.html',
  '/games/tents/TentsApp.jsx',
  '/games/tents/TentsBoard.jsx',
  '/games/tents/tents-logic.js',
  '/games/tents/tents.css',
];

/* ── Install: pre-cache all local assets ─────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      /* addAll fails atomically — a single 404 aborts the install.
         Use individual puts so one missing file doesn't block the SW. */
      return Promise.allSettled(
        STATIC_ASSETS.map(function (url) {
          return fetch(url).then(function (response) {
            if (!response.ok) throw new Error(response.status + ' ' + url);
            return cache.put(url, response);
          });
        })
      );
    })
  );
  /* Skip the waiting phase so the new SW takes over immediately. */
  self.skipWaiting();
});

/* ── Activate: delete stale caches ───────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== STATIC_CACHE && k !== CDN_CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: route requests to the right strategy ─────────── */
self.addEventListener('fetch', function (event) {
  /* Only handle GET requests. */
  if (event.request.method !== 'GET') return;

  var url;
  try { url = new URL(event.request.url); } catch (e) { return; }

  /* ── CDN: versioned assets (unpkg, gstatic fonts) → cache-first ── */
  if (url.hostname === 'unpkg.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CDN_CACHE).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          if (cached) return cached;
          return fetch(event.request).then(function (response) {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  /* ── Google Fonts CSS → stale-while-revalidate ───────────────────── */
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.open(CDN_CACHE).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          var networkFetch = fetch(event.request).then(function (response) {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          /* Serve cached version immediately; refresh in background. */
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  /* ── Same-origin: cache-first, fall back to network ─────────────── */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});
