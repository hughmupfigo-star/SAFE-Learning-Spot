/* ============================================================================
   Safe Learning Spot — access & purchases
   ----------------------------------------------------------------------------
   Defines which paid courses + the assessment a learner has unlocked, the
   Stripe payment links for each, and the handler that unlocks a course when
   someone returns from a successful Stripe payment.

   NOTE ON ENFORCEMENT: on a static site this is a *soft* lock — it gates the
   UI and drives purchases, but the course files themselves are public, so it
   is not bulletproof. Real enforcement happens once the backend is deployed:
   the Stripe webhook writes access to the database, and the client reads it
   from the server. Until then, access lives in this browser (localStorage).
   ========================================================================== */
(function () {
  'use strict';

  // ----- Stripe payment links (one per product) -----
  var PAID = {
    '1':  { name: 'Energy & Relationships',          price: 11, landing: 'course1-landing.html',  link: 'https://buy.stripe.com/00w9AM7GRaA67F50OEe3e10' },
    '2':  { name: 'Toxic Relationship Patterns',     price: 11, landing: 'course2-landing.html',  link: 'https://buy.stripe.com/cNi00c7GR23A6B1dBqe3e11' },
    '3':  { name: 'Energy Body & Sovereignty',       price: 11, landing: 'course3-landing.html',  link: 'https://buy.stripe.com/fZu5kw9OZeQm7F5apee3e12' },
    '4':  { name: 'Financial Sovereignty',           price: 11, landing: 'course4-landing.html',  link: 'https://buy.stripe.com/fZueV60ep5fM8J97d2e3e13' },
    '5':  { name: 'Generational Patterns & Family',  price: 11, landing: 'course5-landing.html',  link: 'https://buy.stripe.com/7sY28kgdncIe0cDcxme3e14' },
    '6':  { name: 'Institutional Conditioning',      price: 11, landing: 'course6-landing.html',  link: 'https://buy.stripe.com/cNi14gaT38rYaRhbtie3e15' },
    '7':  { name: 'Media & Narrative Control',       price: 11, landing: 'course7-landing.html',  link: 'https://buy.stripe.com/cNi5kwbX7cIeaRhbtie3e16' },
    '8':  { name: 'Food Is Medicine',                price: 11, landing: 'course8-landing.html',  link: 'https://buy.stripe.com/dRm28kd1b5fMf7x7d2e3e17' },
    '9':  { name: 'The Art of Becoming',             price: 11, landing: 'course9-landing.html',  link: 'https://buy.stripe.com/14AbIU9OZdMigbB7d2e3e1j' },
    '10': { name: 'The Uncharted Mind',              price: 11, landing: 'course10-landing.html', link: 'https://buy.stripe.com/28E28ke5f37E0cD7d2e3e1k' },
    'assessment': { name: 'Healing Stage Assessment', price: 11, landing: 'assessment.html',      link: 'https://buy.stripe.com/aFa28k7GR6jQcZpdBqe3e1l' }
  };
  var BUNDLE = { name: 'Full Bundle — all 10 courses + assessment', price: 88, link: 'https://buy.stripe.com/8x2aEQ5yJgYucZpdBqe3e19' };

  // Free courses are never gated.
  var FREE_COURSE_NUMS = { '11':1, '12':1, '13':1, '14':1, '15':1, '16':1, '17':1, '18':1, '19':1 };

  function owned() { try { return JSON.parse(localStorage.getItem('slsc_access') || '[]'); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem('slsc_access', JSON.stringify(list)); } catch (e) {} }

  function isFree(id) { return !!FREE_COURSE_NUMS[String(id)]; }

  function has(id) {
    id = String(id);
    if (isFree(id)) return true;
    var o = owned();
    return o.indexOf('bundle') >= 0 || o.indexOf(id) >= 0;
  }

  function grant(id) {
    id = String(id);
    var o = owned();
    if (o.indexOf(id) < 0) { o.push(id); save(o); }
  }

  // Unlock when returning from a successful Stripe payment.
  // Stripe links / checkout should redirect back to e.g. index.html?paid=4
  // (or ?paid=bundle, ?paid=assessment, or ?paid=2,4 for several).
  function handleReturn() {
    var m = location.search.match(/[?&]paid=([^&]+)/);
    if (!m) return null;
    var ids = decodeURIComponent(m[1]).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var granted = [];
    ids.forEach(function (id) {
      if (id === 'bundle') { grant('bundle'); granted.push(BUNDLE.name); }
      else if (PAID[id]) { grant(id); granted.push(PAID[id].name); }
    });
    // strip ?paid from the URL without reloading
    try {
      var url = location.pathname + location.search.replace(/([?&])paid=[^&]*(&|$)/, '$1').replace(/[?&]$/, '') + location.hash;
      history.replaceState(null, '', url);
    } catch (e) {}
    if (granted.length) showUnlockToast(granted);
    return granted;
  }

  function showUnlockToast(names) {
    try {
      var bar = document.createElement('div');
      bar.setAttribute('style',
        'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2000;' +
        'background:#15706b;color:#fff;font-family:var(--mono,monospace);font-size:12px;letter-spacing:.04em;' +
        'padding:12px 18px;border-radius:24px;box-shadow:0 6px 22px rgba(0,0,0,.25);max-width:92vw;text-align:center;');
      bar.textContent = '✓ Unlocked: ' + names.join(', ');
      document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(bar); });
      if (document.body) document.body.appendChild(bar);
      setTimeout(function () { bar.style.transition = 'opacity .4s'; bar.style.opacity = '0'; setTimeout(function(){ bar.remove(); }, 500); }, 5200);
    } catch (e) {}
  }

  // When the backend is live, it is the source of truth: pull the owned list
  // and merge it into the local cache. The client never pushes access upward.
  function refresh() {
    try {
      var base = (window.SLSC_SYNC && window.SLSC_SYNC.base && window.SLSC_SYNC.base()) || '';
      var token = null; try { token = localStorage.getItem('slsc_token'); } catch (e) {}
      if (!base || !token) return;
      fetch(base + '/api/payment/access', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && d.owned) {
            var o = owned();
            d.owned.forEach(function (id) { if (o.indexOf(String(id)) < 0) o.push(String(id)); });
            save(o);
            try { window.dispatchEvent(new Event('slsc-access')); } catch (e) {}
          }
        }).catch(function () {});
    } catch (e) {}
  }

  window.SLSC_PAID = PAID;
  window.SLSC_BUNDLE = BUNDLE;
  window.SLSC_ACCESS = {
    has: has,
    grant: grant,
    owned: owned,
    isFree: isFree,
    paidIds: function () { return Object.keys(PAID); },
    handleReturn: handleReturn,
    refresh: refresh
  };

  // process a Stripe return as early as possible
  handleReturn();
  // pull authoritative access from the backend once everything has loaded
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
})();
