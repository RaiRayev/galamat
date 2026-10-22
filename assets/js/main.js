// Galamat — site interactions
(function () {
  // Mobile menu
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Team filters
  var filters = document.querySelectorAll('.filter');
  var people = document.querySelectorAll('.person');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      people.forEach(function (p) {
        p.classList.toggle('is-hidden', f !== 'all' && p.getAttribute('data-part') !== f);
      });
    });
  });
})();

// Hero: 3D ring carousel (auto-rotates, drag to spin, scroll nudges it)
(function () {
  var stage = document.querySelector('.ring-stage');
  if (!stage) return;
  var ring = stage.querySelector('.ring');
  var cards = Array.prototype.slice.call(ring.children);
  var n = cards.length, step = 360 / n;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var angle = 0, vel = 0, speed = reduce ? 0 : 5; // degrees per second
  var dragging = false, lastX = 0, moved = 0, running = true, last = 0, lastScroll = window.scrollY;

  function layout() {
    // radius follows the screen width, so the ring is wider than the viewport
    // and the side cards swing in from beyond the edges
    var sw = stage.clientWidth;
    var r = Math.round(sw * (sw < 700 ? 0.78 : 0.52));
    var cw = Math.round(2 * r * Math.sin(Math.PI / n) * 0.86);
    var ch = Math.round(cw * 1.25);
    ring.style.width = cw + 'px';
    ring.style.height = ch + 'px';
    stage.style.height = Math.round(ch * 1.3) + 'px';
    stage.style.perspective = Math.round(r * 1.4) + 'px';
    cards.forEach(function (c, i) { c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + (-r) + 'px)'; });
  }
  function frame(t) {
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (!dragging) { angle += speed * dt + vel; vel *= 0.94; if (Math.abs(vel) < 0.001) vel = 0; }
    ring.style.transform = 'rotateY(' + angle + 'deg)';
    // fade cards that swing towards the viewer so they never balloon over the page
    for (var i = 0; i < n; i++) {
      var c = Math.cos((i * step + angle) * Math.PI / 180);
      var o = Math.max(0, Math.min(1, (c + 0.64) / 0.14));
      cards[i].style.opacity = o;
      cards[i].style.pointerEvents = o > 0.5 ? '' : 'none';
      cards[i].tabIndex = o > 0.5 ? 0 : -1;
    }
    if (running) requestAnimationFrame(frame); else last = 0;
  }

  stage.addEventListener('pointerdown', function (e) {
    dragging = true; moved = 0; lastX = e.clientX; vel = 0;
    stage.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    angle += dx * 0.18; vel = dx * 0.18;
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false; stage.classList.remove('is-dragging');
    vel = Math.max(-4, Math.min(4, vel));
  });
  // a drag should not open the card under the pointer
  stage.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  // dragstart on images/links would hijack the gesture
  stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

  window.addEventListener('scroll', function () {
    var d = window.scrollY - lastScroll; lastScroll = window.scrollY;
    if (!reduce) vel = Math.max(-3, Math.min(3, vel + d * 0.012));
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; requestAnimationFrame(frame); }
      running = vis;
    }).observe(stage);
  }

  layout();
  window.addEventListener('resize', layout);
  requestAnimationFrame(frame);
})();

// Hero slogan: replay the echo when the pointer comes over it
(function () {
  var word = document.querySelector('.echo-word');
  if (!word || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var busy = false;
  word.addEventListener('pointerenter', function () {
    if (busy) return;
    busy = true;
    var layers = word.querySelectorAll('.echo-l');
    layers.forEach(function (l) { l.style.animation = 'none'; });
    void word.offsetWidth; // restart the CSS animation
    layers.forEach(function (l) { l.style.animation = ''; });
    setTimeout(function () { busy = false; }, 1600);
  });
})();
