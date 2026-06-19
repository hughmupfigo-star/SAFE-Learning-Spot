// SAFE Learning Spot Centre — Service Worker
const CACHE_NAME = 'safe-learning-v12';
const SHELL_CACHE = 'safe-shell-v9';

// Core shell files cached on install
const SHELL_FILES = [
  './',
  './index.html',
  './login.html',
  './reset-password.html',
  './manifest.json',
  './tts.js',
  './app.css',
  './slsc-cart.js',
  './slsc-access.js',
  './slsc-sync.js',
  './slsc-install.js',
  './icon-192.svg',
  './icon-512.svg'
];

// All pages for offline access
const ALL_PAGES = [
  "./about.html",
  "./accessibility.html",
  "./assessment.html",
  "./contact.html",
  "./course1-landing.html",
  "./course1-module-1-energy-as-currency.html",
  "./course1-module-2-energy-vampire-archetype.html",
  "./course1-module-3-boundaries-that-stick.html",
  "./course1-module-4-the-cost-of-nice.html",
  "./course1-module-5-reclaiming-your-space.html",
  "./course1-module-6-friendship-without-weaponry.html",
  "./course14-landing.html",
  "./course14-module-1-your-nervous-system.html",
  "./course14-module-2-what-dysregulation-looks-like.html",
  "./course14-module-2-window-and-polyvagal.html",
  "./course14-module-3-baseline-and-social-engagement.html",
  "./course14-module-3-suppression-vs-processing.html",
  "./course14-module-4-recognising-dysregulation.html",
  "./course14-module-4-your-regulation-toolkit.html",
  "./course14-module-5-dysregulation-shapes-life.html",
  "./course14-module-6-suppression-and-physiology.html",
  "./course14-module-7-processing-and-completion.html",
  "./course14-module-8-your-regulation-toolkit.html",
  // Course 10 — The Uncharted Mind (paid)
  "./course10-landing.html",
  "./course10-module-1-the-10-percent-myth.html",
  "./course10-module-2-the-three-layers.html",
  "./course10-module-3-belief-architecture.html",
  "./course10-module-4-fear-as-information.html",
  "./course10-module-5-the-death-question.html",
  "./course10-module-6-neuroplasticity.html",
  "./course10-module-7-stillness-and-superconscious.html",
  "./course10-module-8-path-discovery.html",
  "./course11-landing.html",
  "./course11-module-1-everything-is-alive.html",
  "./course11-module-2-what-thoth-knew.html",
  "./course11-module-3-the-language-of-trees.html",
  "./course11-module-4-entering-the-frequency.html",
  "./course11-module-5-the-practice-of-asking.html",
  "./course11-module-6-receiving-the-response.html",
  "./course11-module-7-working-with-specific-trees.html",
  "./course11-module-8-building-the-daily-practice.html",
  "./course12-landing.html",
  "./course12-module-1-how-the-calendar-was-shaped.html",
  "./course12-module-2-christmas-and-the-winter-sun.html",
  "./course12-module-3-easter-and-the-spring-goddess.html",
  "./course12-module-4-valentines-and-lupercalia.html",
  "./course12-module-5-mothers-day-and-the-great-mother.html",
  "./course12-module-6-the-pattern-of-rebranding.html",
  "./course12-module-7-halloween-and-samhain.html",
  "./course12-module-8-reclaiming-the-year.html",
  "./course2-landing.html",
  "./course2-module-1-the-patterns-that-predict.html",
  "./course2-module-2-love-bombing-and-the-initial-mask.html",
  "./course2-module-3-the-micro-aggressions-that-scale.html",
  "./course2-module-4-dysfunction-archetypes.html",
  "./course2-module-5-your-role-in-dysfunction.html",
  "./course2-module-6-the-exit.html",
  "./course2-module-7-choosing-differently.html",
  "./course3-landing.html",
  "./course3-module-1-the-energy-body.html",
  "./course3-module-2-energy-harvesting-tactics.html",
  "./course3-module-3-the-weaponisation-of-sexuality.html",
  "./course3-module-4-what-sacred-sexuality-actually-is.html",
  "./course3-module-5-your-body-as-territory.html",
  "./course3-module-6-energy-restoration-and-sovereignty.html",
  "./course4-landing.html",
  "./course4-module-1-the-language-of-money.html",
  "./course4-module-2-how-the-system-keeps-you-poor.html",
  "./course4-module-3-the-debt-trap-architecture.html",
  "./course4-module-4-building-true-wealth.html",
  "./course4-module-5-the-frequency-of-abundance.html",
  "./course4-module-6-money-as-sovereignty.html",
  "./course4-module-7-the-next-economy.html",
  "./course5-landing.html",
  "./course5-module-1-the-scapegoat-role.html",
  "./course5-module-2-am-i-the-scapegoat.html",
  "./course5-module-3-the-purpose-of-scapegoating.html",
  "./course5-module-4-generational-wounding.html",
  "./course5-module-5-breaking-the-cycle.html",
  "./course5-module-6-rebuilding-or-exiting.html",
  "./course6-landing.html",
  "./course6-module-1-institution-training.html",
  "./course6-module-2-school-compliance.html",
  "./course6-module-3-work-adult-school.html",
  "./course6-module-4-religion-meaning.html",
  "./course6-module-5-government-governance.html",
  "./course6-module-6-independence-deprogramming.html",
  "./course6-module-7-thinking-for-yourself.html",
  "./course7-landing.html",
  "./course7-module-1-narratives-as-weapons.html",
  "./course7-module-2-architecture-of-propaganda.html",
  "./course7-module-3-media-literacy.html",
  "./course7-module-4-hero-villain.html",
  "./course7-module-5-algorithmic-narratives.html",
  "./course7-module-6-building-narrative-immunity.html",
  "./course8-landing.html",
  "./course8-module-1-you-are-what-you-eat.html",
  "./course8-module-2-god-made-vs-man-made.html",
  "./course8-module-3-the-alkaline-body.html",
  "./course8-module-4-the-power-of-fasting.html",
  "./course8-module-5-what-junk-food-does-to-you.html",
  "./course8-module-6-healing-foods-and-herbs.html",
  "./course8-module-7-children-and-family-nutrition.html",
  "./course8-module-8-detoxing-and-transition.html",
  "./course8-module-9-building-your-alkaline-life.html",
  "./course13-landing.html",
  "./course13-module-1-what-is-the-inner-child.html",
  "./course13-module-2-developmental-windows.html",
  "./course13-module-2-how-wounds-operate-in-adults.html",
  "./course13-module-3-four-adaptations-and-needs.html",
  "./course13-module-3-self-reparenting.html",
  "./course13-module-4-beginning-the-practice.html",
  "./course13-module-4-the-wound-in-the-body.html",
  "./course13-module-5-wounding-and-identity.html",
  "./course13-module-6-the-reparenting-framework.html",
  "./course13-module-7-reparenting-in-practice.html",
  "./course13-module-8-building-and-sustaining.html",
  // Course 9 — The Art of Becoming (paid)
  "./course9-landing.html",
  "./course9-module-1-why-you-are-here.html",
  "./course9-module-2-the-comfortable-cage.html",
  "./course9-module-3-mechanics-of-evolution.html",
  "./course9-module-4-body-in-uncertain-times.html",
  "./course9-module-5-the-observer-self.html",
  "./course9-module-6-fear-and-the-unknown.html",
  "./course9-module-7-living-fully-in-both-worlds.html",
  "./course9-module-8-path-discovery.html",
  "./faq.html",
  "./help.html",
  "./index.html",
  "./login.html",
  "./privacy-choices.html",
  "./privacy.html",
  "./terms.html",
  "./manifest.json",
  "./icon-192.svg",
  "./icon-512.svg",
  "./apple-touch-icon.svg",
  "./course15-landing.html",
  "./course15-module-1-the-death-of-the-front-door.html",
  "./course15-module-2-spotting-the-bleeding-artery.html",
  "./course15-module-3-building-the-asset.html",
  "./course15-module-4-the-direct-approach.html",
  "./course15-module-5-from-free-work-to-paid.html",
  "./course16-landing.html",
  "./course16-module-1-your-documents-your-rights.html",
  "./course16-module-2-your-own-account.html",
  "./course16-module-3-getting-paid-the-right-way.html",
  "./course16-module-4-tax-without-the-panic.html",
  "./course16-module-5-the-18th-birthday-plan.html",
  "./course17-landing.html",
  "./course17-module-1-you-deserve-support.html",
  "./course17-module-2-reading-your-own-weather.html",
  "./course17-module-3-tools-for-the-hard-moments.html",
  "./course17-module-4-building-your-support-web.html",
  "./course17-module-5-being-there-for-a-friend.html",
  "./course17-module-6-staying-steady.html",
  "./course18-landing.html",
  "./course18-module-1-the-public-health-paradigm.html",
  "./course18-module-2-the-political-economy-of-recruitment.html",
  "./course18-module-3-gender-masculinities-and-violence.html",
  "./course18-module-4-digital-ecosystems-and-radicalisation.html",
  "./course18-module-5-environment-scarcity-and-conflict.html",
  "./course18-module-6-youth-led-peacebuilding.html",
  "./course19-landing.html",
  "./course19-module-1-the-cliff-edge.html",
  "./course19-module-2-how-the-feed-works.html",
  "./course19-module-3-the-hooks.html",
  "./course19-module-4-spotting-fakes.html",
  "./course19-module-5-identity-beyond-the-like.html",
  "./course19-module-6-your-runway-plan.html",
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function() {
      // Cache remaining pages in background (don't block install)
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(ALL_PAGES).catch(function() {});
      });
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_NAME && k !== SHELL_CACHE;
        }).map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var networkFetch = fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() { return cached; });

      // Return cached immediately if available, update in background
      return cached || networkFetch;
    })
  );
});
