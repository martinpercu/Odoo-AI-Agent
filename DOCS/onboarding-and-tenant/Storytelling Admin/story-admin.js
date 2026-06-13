/* ============================================================
   THE ODOO AGENT — Storytelling interactions
   ============================================================ */

(function () {
  'use strict';

  /* ---- Progress bar ---- */
  var progress = document.querySelector('.progress');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Reveal on enter ---- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.classList.add('in');
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* ---- Animate chart bars when visible ---- */
  var chartObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.bar').forEach(function (bar) {
        bar.style.height = (bar.getAttribute('data-h') || '50') + '%';
      });
      chartObs.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.bars').forEach(function (el) { chartObs.observe(el); });

  /* ---- Chat typing sequence ----
     Each .chat[data-seq] plays its scripted steps once on first view. */
  function typeText(el, text, speed, done) {
    el.classList.add('cursor');
    var i = 0;
    (function tick() {
      if (i <= text.length) {
        el.innerHTML = text.slice(0, i);
        i++;
        setTimeout(tick, speed);
      } else {
        el.classList.remove('cursor');
        if (done) done();
      }
    })();
  }

  function playChat(chat) {
    var body = chat.querySelector('.chat-body');
    var steps = JSON.parse(chat.getAttribute('data-script') || '[]');
    var idx = 0;

    function next() {
      if (idx >= steps.length) return;
      var step = steps[idx++];

      if (step.t === 'user') {
        var u = document.createElement('div');
        u.className = 'bub user';
        u.style.opacity = '0';
        u.innerHTML = step.html;
        body.appendChild(u);
        requestAnimationFrame(function () {
          u.style.transition = 'opacity 300ms ease';
          u.style.opacity = '1';
        });
        scrollChat(body);
        setTimeout(next, step.after || 700);

      } else if (step.t === 'typing') {
        var dots = document.createElement('div');
        dots.className = 'bub agent';
        dots.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
        body.appendChild(dots);
        scrollChat(body);
        setTimeout(function () {
          body.removeChild(dots);
          next();
        }, step.dur || 900);

      } else if (step.t === 'agent') {
        var a = document.createElement('div');
        a.className = 'bub agent';
        body.appendChild(a);
        scrollChat(body);
        typeText(a, step.html, step.speed || 18, function () {
          if (step.chart) {
            var c = renderChart(step.chart);
            a.appendChild(c);
            requestAnimationFrame(function () {
              c.querySelectorAll('.bar').forEach(function (bar) {
                bar.style.height = (bar.getAttribute('data-h') || '50') + '%';
              });
            });
            scrollChat(body);
          }
          if (step.confirm) {
            var cf = renderConfirm(step.confirm);
            a.appendChild(cf);
            scrollChat(body);
          }
          setTimeout(next, step.after || 600);
        });
      }
    }
    next();
  }

  function scrollChat(body) {
    body.scrollTop = body.scrollHeight;
  }

  function renderChart(data) {
    var wrap = document.createElement('div');
    wrap.className = 'mini-chart';
    var bars = data.bars.map(function (b) {
      return '<div class="bar ' + (b.peak ? 'peak' : 'dim') + '" data-h="' + b.h + '" style="height:0%"></div>';
    }).join('');
    var labels = data.bars.map(function (b) { return '<span>' + b.x + '</span>'; }).join('');
    wrap.innerHTML =
      '<div class="mc-head"><span class="mc-title">' + data.title + '</span><span class="mc-sub">' + data.sub + '</span></div>' +
      '<div class="bars">' + bars + '</div>' +
      '<div class="bars-x">' + labels + '</div>';
    return wrap;
  }

  function renderConfirm(data) {
    var wrap = document.createElement('div');
    wrap.className = 'confirm';
    wrap.innerHTML =
      '<div class="ch"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' + data.title + '</div>' +
      '<div class="cb">' + data.body + '</div>' +
      '<div class="row"><button class="btn primary">' + data.ok + '</button><button class="btn secondary">' + data.cancel + '</button></div>';
    return wrap;
  }

  var chatObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      if (e.target.getAttribute('data-played')) return;
      e.target.setAttribute('data-played', '1');
      playChat(e.target);
      chatObs.unobserve(e.target);
    });
  }, { threshold: 0.45 });
  document.querySelectorAll('.chat[data-script]').forEach(function (el) { chatObs.observe(el); });

  /* ---- Pin fly animation ---- */
  var pinObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var demo = e.target;
      var src = demo.querySelector('.pin-card');
      var vault = demo.querySelector('.pin-vault');
      var hidden = vault.querySelector('.vault-item.pending');
      if (src && hidden) {
        setTimeout(function () {
          hidden.style.transition = 'opacity 500ms ease, transform 500ms cubic-bezier(0.2,0.7,0.2,1)';
          hidden.style.opacity = '1';
          hidden.style.transform = 'none';
        }, 600);
      }
      pinObs.unobserve(demo);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.pin-demo').forEach(function (el) { pinObs.observe(el); });

})();
