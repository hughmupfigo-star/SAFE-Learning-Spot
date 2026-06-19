/* ============================================================================
   Safe Learning Spot — "Install app / Add to Home Screen"
   ----------------------------------------------------------------------------
   Adds a visible install button to the homepage hero. Your site is already a
   PWA (manifest + service worker + icons), so this just gives users the
   affordance to install it:
     - Android / desktop Chromium: fires the real one-tap install prompt.
     - iPhone / iPad (Safari): opens step-by-step "Add to Home Screen" guidance
       (iOS has no install API, so guidance is the only option).
     - Any other browser: shows generic "use your browser menu" guidance.
     - Already installed (running standalone): the button is hidden.
   ========================================================================== */
(function () {
  'use strict';

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }
  function isiOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.MSStream;
  }

  var deferredPrompt = null;
  // Captured on Android/desktop Chromium; lets us trigger the native prompt.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var b = document.getElementById('slscInstallBtn');
    if (b) b.style.display = '';
  });
  // If they install, drop the button.
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('slscInstallBtn');
    if (b) b.style.display = 'none';
    closeModal();
  });

  var SHARE_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  var css =
    '#slscInstallBtn{display:inline-flex;align-items:center;gap:8px;padding:14px 24px;background:transparent;' +
    'border:1.5px solid var(--accent,#2d7a4f);color:var(--accent,#2d7a4f);border-radius:3px;font-size:.88rem;' +
    'font-family:var(--sans,sans-serif);letter-spacing:.03em;cursor:pointer;transition:background .2s,color .2s}' +
    '#slscInstallBtn:hover{background:var(--accent,#2d7a4f);color:#fff}' +
    '.hero #slscInstallBtn{color:#9ed9b5;border-color:#2d7a4f}.hero #slscInstallBtn:hover{color:#fff}' +
    '#slscInstallOv{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:400;display:none;align-items:center;justify-content:center;padding:20px}' +
    '#slscInstallOv.open{display:flex}' +
    '#slscInstallCard{background:var(--paper,#fafaf7);color:var(--ink,#0a0a0a);max-width:380px;width:100%;border-radius:10px;' +
    'padding:26px 26px 22px;box-shadow:0 20px 50px rgba(0,0,0,.3);position:relative;font-family:var(--sans,-apple-system,sans-serif)}' +
    '#slscInstallCard h3{font-family:var(--serif,Georgia,serif);font-weight:400;font-size:1.4rem;margin:0 0 6px}' +
    '#slscInstallCard .sub{font-size:.85rem;color:var(--muted,#6b6b66);margin:0 0 18px;line-height:1.5}' +
    '#slscInstallCard ol{margin:0;padding:0;list-style:none;counter-reset:s}' +
    '#slscInstallCard li{counter-increment:s;display:flex;gap:12px;align-items:flex-start;padding:9px 0;font-size:.92rem;line-height:1.5;color:var(--ink,#2a2a28)}' +
    '#slscInstallCard li::before{content:counter(s);flex:none;width:22px;height:22px;border-radius:50%;background:var(--accent,#2d7a4f);' +
    'color:#fff;font-size:.72rem;font-family:var(--mono,monospace);display:flex;align-items:center;justify-content:center;margin-top:1px}' +
    '#slscInstallCard .note{margin-top:14px;font-size:.78rem;color:var(--muted,#6b6b66);line-height:1.5}' +
    '#slscInstallClose{position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;line-height:1;color:var(--muted,#6b6b66);cursor:pointer}' +
    '#slscInstallDone{margin-top:18px;width:100%;padding:12px;background:var(--ink,#0a0a0a);color:var(--paper,#fafaf7);border:none;border-radius:4px;font-size:.9rem;cursor:pointer}';

  function ensureModal() {
    if (document.getElementById('slscInstallOv')) return;
    var ov = document.createElement('div');
    ov.id = 'slscInstallOv';
    ov.innerHTML = '<div id="slscInstallCard" role="dialog" aria-modal="true" aria-label="Add to Home Screen">' +
      '<button id="slscInstallClose" aria-label="Close">&times;</button>' +
      '<h3>Add Safe Spot to your home screen</h3>' +
      '<p class="sub" id="slscInstallSub"></p><ol id="slscInstallSteps"></ol>' +
      '<p class="note" id="slscInstallNote"></p>' +
      '<button id="slscInstallDone">Got it</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    document.getElementById('slscInstallClose').onclick = closeModal;
    document.getElementById('slscInstallDone').onclick = closeModal;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }
  function closeModal() { var ov = document.getElementById('slscInstallOv'); if (ov) ov.classList.remove('open'); }

  function openModal(kind) {
    ensureModal();
    var steps = document.getElementById('slscInstallSteps');
    var sub = document.getElementById('slscInstallSub');
    var note = document.getElementById('slscInstallNote');
    if (kind === 'ios') {
      sub.textContent = 'It only takes a few taps in Safari — then Safe Spot opens like a real app.';
      steps.innerHTML =
        '<li>Tap the <strong>Share</strong> button ' + SHARE_ICON + ' in Safari&rsquo;s toolbar.</li>' +
        '<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>' +
        '<li>Tap <strong>Add</strong> &mdash; the Safe Spot icon appears on your home screen.</li>';
      note.innerHTML = 'This needs to be done in <strong>Safari</strong> (not inside another app&rsquo;s browser).';
    } else {
      sub.textContent = 'Add Safe Spot to your home screen so it opens like a real app.';
      steps.innerHTML =
        '<li>Open your browser&rsquo;s menu (the <strong>&#8942;</strong> or <strong>&#8943;</strong> icon).</li>' +
        '<li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>' +
        '<li>Confirm &mdash; the Safe Spot icon appears on your home screen.</li>';
      note.innerHTML = 'On most phones you can also look for an install icon in the address bar.';
    }
    document.getElementById('slscInstallOv').classList.add('open');
  }

  function build() {
    if (isStandalone()) return; // already installed — nothing to offer
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'slscInstallBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Install the Safe Spot app');
    btn.innerHTML = '&#128241; Install app';
    btn.addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          deferredPrompt = null;
          if (choice && choice.outcome === 'accepted') btn.style.display = 'none';
        });
      } else if (isiOS()) {
        openModal('ios');
      } else {
        openModal('generic');
      }
    });

    var host = document.querySelector('.hero-actions');
    if (host) host.appendChild(btn);
    else { btn.style.position = 'fixed'; btn.style.left = '18px'; btn.style.bottom = '18px'; btn.style.zIndex = '300'; document.body.appendChild(btn); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
