// One-liner registration for the dev "always fresh" service worker (freshsw.js).
// Include this from any page (root or /previews) BEFORE its module scripts:
//   <script src="/freshreg.js"></script>   (or a relative path to it)
// It registers the root-scoped SW so edits to src/*.js show up on the next reload
// instead of being served from the browser's stale module cache.
(function () {
  if (!('serviceWorker' in navigator)) return;
  // Resolve to the repo-root SW regardless of whether we're at / or /previews.
  const swUrl = new URL('/freshsw.js', location.href).href;
  navigator.serviceWorker.register(swUrl, { scope: '/' }).then((reg) => {
    // If a new SW took control, reload ONCE so this page is served fresh too.
    if (reg.active && !navigator.serviceWorker.controller) {
      // First install on this page load — controller arrives after; harmless.
    }
  }).catch(() => { /* SW unsupported / file:// — silently skip */ });
})();
