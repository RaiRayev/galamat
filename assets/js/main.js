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

// Hero slogan "echo": the word is redrawn as SVG so the outline can be a true
// 2px OUTSIDE stroke (4px stroke, inner half masked away by the glyph shape).
(function () {
  var word = document.querySelector('.echo-word');
  if (!word) return;
  var base = word.querySelector('.echo-base');
  var text = base.textContent.trim();
  var NS = 'http://www.w3.org/2000/svg';
  // scale, colour — taken from the Figma blend (Slide 16:9 - 39)
  var layers = [
    [1.052, 'rgba(4,240,251,.15)'], [1.105, 'rgba(9,225,252,.25)'], [1.158, 'rgba(13,210,252,.35)'],
    [1.211, 'rgba(18,195,253,.45)'], [1.264, 'rgba(22,180,253,.54)'], [1.316, 'rgba(27,164,254,.64)'],
    [1.369, 'rgba(0,153,255,.74)']
  ];
  var OUTLINE_SCALE = 1.422, STROKE = 2;
  var marker = document.createElement('i');
  marker.className = 'echo-bl';
  base.appendChild(marker);

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function build() {
    var old = word.querySelector('.echo-svg');
    if (old) old.remove();
    var r = base.getBoundingClientRect();
    var w = r.width, h = r.height;
    var y = marker.getBoundingClientRect().top - r.top; // text baseline
    var origin = (w / 2) + 'px ' + (h * 0.56) + 'px';
    var t = '<text x="0" y="' + y + '">' + esc(text) + '</text>';
    var html = '<defs><mask id="echo-outside" maskUnits="userSpaceOnUse" x="' + (-w) + '" y="' + (-h) + '" width="' + (3 * w) + '" height="' + (3 * h) + '">' +
      '<rect x="' + (-w) + '" y="' + (-h) + '" width="' + (3 * w) + '" height="' + (3 * h) + '" fill="#fff"/>' +
      '<text x="0" y="' + y + '" fill="#000">' + esc(text) + '</text></mask></defs>';
    layers.forEach(function (l, i) {
      html += '<g class="echo-g' + (i === layers.length - 1 ? ' echo-g--crisp' : '') + '" style="--s:' + l[0] + ';--i:' + i + ';transform-origin:' + origin + '" fill="' + l[1] + '">' + t + '</g>';
    });
    html += '<g class="echo-g echo-g--crisp" style="--s:' + OUTLINE_SCALE + ';--i:' + layers.length + ';transform-origin:' + origin + '">' +
      '<text x="0" y="' + y + '" fill="none" stroke="#0066ff" stroke-width="' + (STROKE * 2) + '" vector-effect="non-scaling-stroke" stroke-linejoin="round" mask="url(#echo-outside)">' + esc(text) + '</text></g>';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'echo-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.innerHTML = html;
    word.appendChild(svg);
    word.classList.add('is-svg');
  }

  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    build();
    // play the echo once, then keep it still (also on later resizes)
    setTimeout(function () { word.classList.add('echo-done'); }, 2400);
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { word.classList.add('echo-done'); build(); }, 150);
    });
  });
})();

// Smooth, inertial page scrolling (Lenis). Touch keeps native scrolling.
(function () {
  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  // in-page links glide to their section, below the sticky header
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    var url = new URL(a.getAttribute('href'), location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72, duration: 1.4 });
    history.pushState(null, '', url.hash);
  });
  window.galamatLenis = lenis;
})();
