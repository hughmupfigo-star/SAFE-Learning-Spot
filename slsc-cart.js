/* ============================================================================
   Safe Learning Spot — smart shopping cart (homepage)
   ----------------------------------------------------------------------------
   Lets a learner pick any combination of paid courses (+ the assessment), see a
   running total with an automatic bundle upsell, and check out via Stripe.

   Checkout:
   - 1 item  -> that product's Stripe payment link.
   - bundle  -> the bundle payment link.
   - several -> if the backend is deployed (API base + token), one combined
                Stripe Checkout for all items; otherwise it nudges to the bundle
                and can process the chosen items one at a time via their links.
   Requires slsc-access.js to be loaded first.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.SLSC_PAID) return; // access library missing

  var PAID = window.SLSC_PAID, BUNDLE = window.SLSC_BUNDLE, ACCESS = window.SLSC_ACCESS;

  function get() { try { return JSON.parse(localStorage.getItem('slsc_cart') || '[]'); } catch (e) { return []; } }
  function set(a) { try { localStorage.setItem('slsc_cart', JSON.stringify(a)); } catch (e) {} render(); }
  function inCart(id) { return get().indexOf(String(id)) >= 0; }
  function add(id) { var a = get(); id = String(id); if (a.indexOf(id) < 0) a.push(id); set(a); openPanel(); }
  function remove(id) { set(get().filter(function (x) { return x !== String(id); })); }
  function activeItems() { return get().filter(function (id) { return PAID[id] && !ACCESS.has(id); }); }
  function subtotal() { return activeItems().reduce(function (s, id) { return s + (PAID[id].price || 11); }, 0); }
  function bundleWins() { var n = activeItems().length; return n >= 8 || subtotal() >= BUNDLE.price; }

  // ---------- styles ----------
  var css = ''
    + '#slscCartBtn{position:fixed;right:18px;bottom:18px;z-index:300;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.12em;text-transform:uppercase;background:var(--ink,#0a0a0a);color:var(--paper,#fafaf7);border:none;border-radius:24px;padding:12px 18px;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.2);display:none;align-items:center;gap:9px}'
    + '#slscCartBtn.show{display:flex}'
    + '#slscCartBtn .cnt{background:var(--accent,#2d7a4f);color:#fff;border-radius:11px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;padding:0 5px}'
    + '#slscCartOv{position:fixed;inset:0;background:rgba(0,0,0,.34);z-index:301;opacity:0;pointer-events:none;transition:opacity .25s}#slscCartOv.open{opacity:1;pointer-events:auto}'
    + '#slscCartPanel{position:fixed;top:0;right:0;height:100%;width:400px;max-width:94vw;z-index:302;background:var(--paper,#fafaf7);border-left:1px solid var(--line,#d9d9d3);transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(0,0,0,.14)}#slscCartPanel.open{transform:translateX(0)}'
    + '.slscc-head{padding:24px 24px 16px;border-bottom:1px solid var(--line,#d9d9d3);display:flex;align-items:center;justify-content:space-between}'
    + '.slscc-head h3{font-family:var(--serif,Georgia,serif);font-weight:400;font-size:22px;margin:0;color:var(--ink,#0a0a0a)}'
    + '.slscc-x{background:none;border:none;font-size:24px;line-height:1;color:var(--muted,#6b6b66);cursor:pointer}'
    + '.slscc-body{flex:1;overflow-y:auto;padding:8px 24px}'
    + '.slscc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--line,#d9d9d3)}'
    + '.slscc-row .nm{font-size:14.5px;color:var(--ink,#0a0a0a);line-height:1.35}'
    + '.slscc-row .pr{font-family:var(--mono,monospace);font-size:13px;color:var(--ink,#0a0a0a);white-space:nowrap}'
    + '.slscc-rm{background:none;border:none;color:var(--muted,#6b6b66);cursor:pointer;font-size:16px;padding:0 2px}.slscc-rm:hover{color:#c4452d}'
    + '.slscc-empty{color:var(--muted,#6b6b66);font-size:14px;text-align:center;padding:48px 10px;line-height:1.6}'
    + '.slscc-upsell{margin:16px 0 4px;padding:14px 16px;background:#eef4f0;border-left:2px solid var(--accent,#2d7a4f);border-radius:3px;font-size:13px;line-height:1.5;color:#1d3a2c}'
    + 'html[data-theme="dark"] .slscc-upsell{background:#13211a;color:#bfe6cf}'
    + '.slscc-upsell button{margin-top:8px;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;background:var(--accent,#2d7a4f);color:#fff;border:none;border-radius:3px;padding:8px 12px;cursor:pointer}'
    + '.slscc-foot{padding:16px 24px 22px;border-top:1px solid var(--line,#d9d9d3)}'
    + '.slscc-tot{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px}'
    + '.slscc-tot .l{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#6b6b66)}'
    + '.slscc-tot .v{font-family:var(--serif,Georgia,serif);font-size:26px;color:var(--ink,#0a0a0a)}'
    + '.slscc-co{width:100%;padding:15px;background:var(--ink,#0a0a0a);color:var(--paper,#fafaf7);border:none;border-radius:4px;font-size:.95rem;font-family:var(--sans,sans-serif);letter-spacing:.03em;cursor:pointer}.slscc-co:hover{opacity:.88}.slscc-co:disabled{opacity:.35;cursor:default}'
    + '.slscc-secure{text-align:center;font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#6b6b66);margin-top:12px}'
    + '.slscc-add{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--ink,#0a0a0a);background:none;color:var(--ink,#0a0a0a);border-radius:3px;padding:8px 14px;cursor:pointer;transition:background .2s,color .2s}'
    + '.slscc-add:hover{background:var(--ink,#0a0a0a);color:var(--paper,#fafaf7)}'
    + '.slscc-add.in{background:var(--accent,#2d7a4f);border-color:var(--accent,#2d7a4f);color:#fff}'
    + '.slscc-add.owned{border-color:var(--line,#d9d9d3);color:var(--muted,#6b6b66);cursor:default;pointer-events:none}'
    + '.slscc-progressline{margin-top:14px;font-family:var(--mono,monospace);font-size:11px;letter-spacing:.05em;color:var(--muted,#6b6b66);display:flex;align-items:center;gap:8px;justify-content:center}'
    + '.slscc-progressline .dot{width:7px;height:7px;border-radius:50%;background:var(--line,#d9d9d3);display:inline-block;flex:none}.slscc-progressline .dot.done{background:var(--accent,#2d7a4f)}'
    + '@media(max-width:480px){#slscCartPanel{width:100vw}}';

  function el(tag, attrs, html) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }

  function openPanel() { document.getElementById('slscCartOv').classList.add('open'); document.getElementById('slscCartPanel').classList.add('open'); }
  function closePanel() { document.getElementById('slscCartOv').classList.remove('open'); document.getElementById('slscCartPanel').classList.remove('open'); }

  // ---------- checkout ----------
  function go(url) { window.location.href = url; }
  function checkout() {
    var items = activeItems();
    if (!items.length) return;
    if (items.length === 1) { go(PAID[items[0]].link); return; }
    if (bundleWins()) {
      // most cost-effective + a single payment
      if (confirm('The £88 bundle gives you all 10 courses + the assessment for less than your selection. Get the bundle instead?')) { go(BUNDLE.link); return; }
    }
    var base = (window.SLSC_SYNC && window.SLSC_SYNC.base && window.SLSC_SYNC.base()) || '';
    var token = null; try { token = localStorage.getItem('slsc_token'); } catch (e) {}
    if (base && token) {
      // combined, single Stripe Checkout via the backend
      fetch(base + '/api/payment/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ items: items })
      }).then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.url) window.location.href = d.url; else sequential(items); })
        .catch(function () { sequential(items); });
    } else {
      sequential(items);
    }
  }
  // No backend: pay for the chosen items one at a time via their links.
  function sequential(items) {
    alert('You can buy these together once our combined checkout is live. For now, you’ll be taken to pay for "' + PAID[items[0]].name + '" first; after paying, return here and the next item will be ready.');
    go(PAID[items[0]].link);
  }

  // ---------- render ----------
  function render() {
    var btn = document.getElementById('slscCartBtn'); if (!btn) return;
    var items = activeItems();
    btn.querySelector('.cnt').textContent = items.length;
    btn.classList.toggle('show', items.length > 0);

    var body = document.getElementById('slscCartBody');
    var foot = document.getElementById('slscCartFoot');
    if (!items.length) {
      body.innerHTML = '<div class="slscc-empty">Your cart is empty.<br>Add a course to get started, or grab the £88 bundle.</div>';
      foot.style.display = 'none';
      return;
    }
    foot.style.display = 'block';
    var rows = items.map(function (id) {
      return '<div class="slscc-row"><span class="nm">' + PAID[id].name + '</span>'
        + '<span style="display:flex;align-items:center;gap:10px"><span class="pr">£' + PAID[id].price + '</span>'
        + '<button class="slscc-rm" data-rm="' + id + '" aria-label="Remove">×</button></span></div>';
    }).join('');
    var upsell = bundleWins()
      ? '<div class="slscc-upsell">Get <strong>all 10 courses + the assessment</strong> for £88 — better value than your current selection.<br><button data-bundle="1">Switch to the £88 bundle</button></div>'
      : '';
    body.innerHTML = rows + upsell;
    document.getElementById('slscCartTotal').textContent = '£' + subtotal();
  }

  // ---------- build UI ----------
  function build() {
    if (document.getElementById('slscCartBtn')) return;
    document.head.appendChild(el('style', null, css));

    var btn = el('button', { id: 'slscCartBtn', 'aria-label': 'Open cart' }, '🛒 Cart <span class="cnt">0</span>');
    btn.addEventListener('click', openPanel);
    var ov = el('div', { id: 'slscCartOv' }); ov.addEventListener('click', closePanel);
    var panel = el('aside', { id: 'slscCartPanel', role: 'dialog', 'aria-label': 'Shopping cart' });
    panel.innerHTML =
      '<div class="slscc-head"><h3>Your Cart</h3><button class="slscc-x" aria-label="Close">×</button></div>'
      + '<div class="slscc-body" id="slscCartBody"></div>'
      + '<div class="slscc-foot" id="slscCartFoot"><div class="slscc-tot"><span class="l">Total</span><span class="v" id="slscCartTotal">£0</span></div>'
      + '<button class="slscc-co" id="slscCartCo">Checkout securely →</button>'
      + '<div class="slscc-secure">🔒 Secure payment via Stripe</div></div>';
    document.body.appendChild(btn); document.body.appendChild(ov); document.body.appendChild(panel);

    panel.querySelector('.slscc-x').addEventListener('click', closePanel);
    document.getElementById('slscCartCo').addEventListener('click', checkout);
    panel.addEventListener('click', function (e) {
      var rm = e.target.getAttribute && e.target.getAttribute('data-rm');
      if (rm) remove(rm);
      if (e.target.getAttribute && e.target.getAttribute('data-bundle')) { closePanel(); go(BUNDLE.link); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

    enhanceCards();
    enhancePricing();
    renderProgress();
    render();
    // when the backend confirms purchases (slsc-access event), refresh the UI
    window.addEventListener('slsc-access', function () { enhanceCards(); enhancePricing(); renderProgress(); render(); });

    // after a successful payment, drop now-owned items from the cart
    if (get().some(function (id) { return ACCESS.has(id); })) {
      set(get().filter(function (id) { return !ACCESS.has(id); }));
    }
  }

  // "X of 11 unlocked" line under the curriculum header
  function ownedCount() {
    var ids = ACCESS.paidIds(); var n = 0;
    ids.forEach(function (id) { if (ACCESS.has(id)) n++; });
    return { owned: n, total: ids.length };
  }
  function renderProgress() {
    var hdr = document.querySelector('#courses .courses-hdr'); if (!hdr) return;
    var p = document.getElementById('slscProgress');
    if (!p) { p = el('div', { id: 'slscProgress', 'class': 'slscc-progressline' }); hdr.appendChild(p); }
    var c = ownedCount();
    if (c.owned === 0) p.innerHTML = '<span class="dot"></span> Nothing unlocked yet — start with one course or the £88 bundle';
    else if (c.owned >= c.total) p.innerHTML = '<span class="dot done"></span> All ' + c.total + ' unlocked ✓ — you have the full curriculum';
    else p.innerHTML = '<span class="dot done"></span> ' + c.owned + ' of ' + c.total + ' unlocked · ' + (c.total - c.owned) + ' to go';
  }

  // make the Bundle / Assessment buy cards access-aware (don't sell what's owned)
  function enhancePricing() {
    [].forEach.call(document.querySelectorAll('a.price-card'), function (a) {
      var label = (a.querySelector('.price-label') || {}).textContent || '';
      var cta = a.querySelector('.price-cta');
      if (/Assessment/i.test(label) && ACCESS.has('assessment')) {
        a.setAttribute('href', 'assessment.html');
        if (cta) cta.innerHTML = 'Take the Assessment &rarr;';
      } else if (/Bundle/i.test(label) && ACCESS.owned().indexOf('bundle') >= 0) {
        a.setAttribute('href', '#courses');
        if (cta) cta.innerHTML = 'You own the full bundle ✓';
      }
    });
  }

  // add an "Add to cart" control to each paid course card on the homepage
  function enhanceCards() {
    var cards = document.querySelectorAll('.course-card');
    [].forEach.call(cards, function (card) {
      var link = card.querySelector('a.card-link');
      if (!link) return;
      var m = (link.getAttribute('href') || '').match(/^course(\d+)-landing\.html/);
      if (!m) return;
      var id = m[1]; if (!(parseInt(id, 10) >= 1 && parseInt(id, 10) <= 10)) return; // paid only
      if (card.querySelector('.slscc-add')) return;
      var footer = card.querySelector('.card-footer') || card;
      var b = el('button', { class: 'slscc-add', 'data-id': id, type: 'button' });
      function paint() {
        if (ACCESS.has(id)) { b.textContent = 'Owned ✓'; b.className = 'slscc-add owned'; }
        else if (inCart(id)) { b.textContent = 'In cart ✓'; b.className = 'slscc-add in'; }
        else { b.textContent = '+ Add to cart'; b.className = 'slscc-add'; }
      }
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (ACCESS.has(id)) return;
        if (inCart(id)) remove(id); else add(id);
        paint();
      });
      paint();
      footer.appendChild(b);
      // keep paint in sync when cart changes elsewhere
      b._paint = paint;
    });
  }

  // re-sync card buttons whenever we render
  var _render = render;
  render = function () { _render(); [].forEach.call(document.querySelectorAll('.slscc-add'), function (b) { if (b._paint) b._paint(); }); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
