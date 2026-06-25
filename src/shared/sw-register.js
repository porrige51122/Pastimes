/* ============================================================
   sw-register.js — registers the Pastimes service worker.
   Included by every page (index, categories, games).
   ============================================================ */
(function () {
  if (!('serviceWorker' in navigator)) return;
  /* The SW lives at the root of the served directory (/sw.js).
     Use an absolute path so it works regardless of page depth. */
  navigator.serviceWorker.register('/sw.js').catch(function (err) {
    console.warn('[Pastimes] Service worker registration failed:', err);
  });
})();
