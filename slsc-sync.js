/* ============================================================================
   Safe Learning Spot — cross-device sync
   ----------------------------------------------------------------------------
   Keeps each learner's progress, saved page position, private notes,
   reflections and self-check ratings in sync across their devices, by mirroring
   the relevant localStorage keys to the backend (/api/sync) when they are
   signed in with a real account.

   OFFLINE-FIRST: if no API base is set, or the learner has no token, or the
   network is unreachable, everything falls back silently to localStorage and
   the site behaves exactly as before. Nothing here can break the page.

   >>> TO TURN ON CROSS-DEVICE SYNC: set API_BASE below to your deployed API
       origin, e.g. "https://your-api.up.railway.app" (no trailing slash),
       and make sure login/signup are storing a JWT in localStorage['slsc_token'].
   ========================================================================== */
(function () {
  'use strict';

  var API_BASE = ''; // e.g. "https://your-api.up.railway.app"  — empty = offline only

  // Keys we mirror to the server. We sync the learning data, never device-local
  // preferences (theme, zoom, the token itself) or the local-auth fallback list.
  var SYNC_PREFIX = /^(slsc_|safespot_c\d)/;
  var SKIP = {
    slsc_token: 1, slsc_sync_since: 1, slsc_zoom: 1,
    slsc_session: 1, slsc_users: 1, safespot_theme: 1,
    slsc_access: 1, slsc_cart: 1
  };

  function base() {
    var b = (window.SLSC_API_BASE || API_BASE || '');
    return b ? String(b).replace(/\/+$/, '') : '';
  }
  function token() { try { return localStorage.getItem('slsc_token'); } catch (e) { return null; } }
  function enabled() { return !!(base() && token()); }
  function shouldSync(k) { return typeof k === 'string' && SYNC_PREFIX.test(k) && !SKIP[k]; }

  var ls = window.localStorage;
  var origSet = ls && ls.setItem ? ls.setItem.bind(ls) : null;

  // ---- outgoing queue (debounced) ----
  var queue = {};
  var flushTimer = null;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, 1500);
  }
  function flush() {
    flushTimer = null;
    if (!enabled()) return;
    var keys = Object.keys(queue);
    if (!keys.length) return;
    var items = keys.map(function (k) { return { k: k, v: queue[k] }; });
    queue = {};
    fetch(base() + '/api/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
      body: JSON.stringify({ items: items })
    }).catch(function () {
      // network hiccup: re-queue and try again later
      items.forEach(function (it) { if (!(it.k in queue)) queue[it.k] = it.v; });
      scheduleFlush();
    });
  }
  function enqueue(k, v) { queue[k] = v; scheduleFlush(); }

  // ---- hook setItem so existing code auto-syncs without changes ----
  if (origSet) {
    try {
      ls.setItem = function (k, v) {
        origSet(k, v);
        try { if (shouldSync(k)) enqueue(k, v); } catch (e) {}
      };
    } catch (e) {}
  }

  // ---- pull on load, merge, then push any local-only keys ----
  function pull(done) {
    if (!enabled()) { if (done) done(false); return; }
    fetch(base() + '/api/sync', { headers: { 'Authorization': 'Bearer ' + token() } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var serverKeys = {};
        if (data && data.items) {
          data.items.forEach(function (it) {
            serverKeys[it.k] = 1;
            try { origSet(it.k, it.v == null ? '' : it.v); } catch (e) {}
          });
          try { window.dispatchEvent(new Event('slsc-synced')); } catch (e) {}
        }
        // push keys that exist locally but not yet on the server (offline-created)
        try {
          for (var i = 0; i < ls.length; i++) {
            var k = ls.key(i);
            if (shouldSync(k) && !serverKeys[k]) queue[k] = ls.getItem(k);
          }
        } catch (e) {}
        scheduleFlush();
        if (done) done(true);
      })
      .catch(function () { if (done) done(false); });
  }

  window.SLSC_SYNC = {
    base: base,
    enabled: enabled,
    pull: pull,
    flush: flush
  };

  if (enabled()) {
    pull();
    window.addEventListener('beforeunload', flush);
    // best-effort flush when tab is hidden (mobile)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
  }
})();
