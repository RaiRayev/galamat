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
    stage.parentElement.style.setProperty('--ring-ch', ch + 'px');
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

// ---------- v3 scroll effects ----------
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var tasks = [];

  // 1) blur → sharp, word by word
  document.querySelectorAll('.blur-reveal').forEach(function (el) {
    if (reduce) return;
    var words = [];
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') { wrap(c); }
      });
    })(el);
    el.classList.add('is-split');
    var grad = el.classList.contains('blur-reveal--grad');
    function paintGrad() {
      if (!grad) return;
      var box = el.getBoundingClientRect();
      words.forEach(function (w) {
        var r = w.getBoundingClientRect();
        w.style.backgroundSize = box.width + 'px 100%';
        w.style.backgroundPosition = (box.left - r.left) + 'px 0';
      });
    }
    paintGrad();
    window.addEventListener('resize', paintGrad);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintGrad);
    var n = words.length, soft = 5;
    tasks.push(function (vh) {
      var top = el.getBoundingClientRect().top;
      var p = clamp((vh * 0.9 - top) / (vh * 0.5));
      for (var i = 0; i < n; i++) {
        var t = clamp((p * (n + soft) - i) / soft);
        words[i].style.filter = t >= 1 ? 'none' : 'blur(' + ((1 - t) * 12).toFixed(1) + 'px)';
        words[i].style.opacity = (0.15 + 0.85 * t).toFixed(3);
      }
    });
  });

  // 2) «Сделано в Казахстане»: titles slide down, lead appears, then facts take over
  var kz = document.querySelector('.kz-v3');
  if (kz) {
    var stage = kz.querySelector('.kz-v3__stage'), titles = kz.querySelector('.kz-v3__titles');
    var setStatic = function () { kz.classList.toggle('kz-static', reduce || window.innerWidth <= 760); };
    setStatic(); window.addEventListener('resize', setStatic);
    tasks.push(function (vh) {
      if (kz.classList.contains('kz-static')) { titles.style.opacity = ''; return; }
      var r = kz.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - vh));
      var move = ease(clamp(p / 0.3));
      var sh = stage.clientHeight, from = Math.max(sh * 0.074, 104), to = sh * 0.456;
      titles.style.top = (from + (to - from) * move).toFixed(1) + 'px';
      var out = clamp((p - 0.5) / 0.12);
      titles.style.opacity = (1 - out).toFixed(3);
      stage.style.setProperty('--lo', (clamp((p - 0.16) / 0.16) * (1 - out)).toFixed(3));
      var fo = ease(clamp((p - 0.6) / 0.16));
      stage.style.setProperty('--fo', fo.toFixed(3));
      stage.style.setProperty('--dim', fo.toFixed(3));
    });
  }

  // 3) CTA: centred title glides to the left, buttons and contacts fade in
  var cta = document.querySelector('.cta-v3');
  if (cta) {
    var cstage = cta.querySelector('.cta-v3__stage'), ctitle = cta.querySelector('.cta-v3__title');
    var left = cta.querySelector('.cta-v3__left');
    var setCtaStatic = function () { cta.classList.toggle('cta-static', reduce || window.innerWidth <= 960); };
    setCtaStatic(); window.addEventListener('resize', setCtaStatic);
    tasks.push(function (vh) {
      if (cta.classList.contains('cta-static')) { ctitle.style.transform = ''; cstage.style.setProperty('--fo', 1); return; }
      var r = cta.getBoundingClientRect();
      var p = clamp(-r.top / (r.height - vh) * 1.15);
      var e = ease(clamp((p - 0.1) / 0.5));
      var s = cstage.getBoundingClientRect(), t = ctitle.getBoundingClientRect();
      var cur = new DOMMatrixReadOnly(getComputedStyle(ctitle).transform);
      var naturalCx = t.left - cur.m41 + t.width / 2, naturalCy = t.top - cur.m42 + t.height / 2;
      var dx = (s.left + s.width / 2 - naturalCx) * (1 - e);
      var dy = (s.top + s.height / 2 - naturalCy) * (1 - e);
      ctitle.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      cstage.style.setProperty('--fo', ease(clamp((p - 0.45) / 0.3)).toFixed(3));
    });
  }

  if (!tasks.length) return;
  var ticking = false;
  function run() { ticking = false; var vh = window.innerHeight; tasks.forEach(function (f) { f(vh); }); }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(run); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  run();
})();
