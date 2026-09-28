/* ============================================================
   animations.js
   Adds smooth, professional animations to the tracker.
   - NO colors are changed (motion only)
   - Works in the desktop app and on the website
   - Respects the "reduce motion" setting of the computer
   ============================================================ */
(function () {

    // ---------- 1) CSS animations ----------
    var rowDelays = '';
    for (var i = 1; i <= 12; i++) {
        rowDelays += 'body.logged-in .log-table tbody tr:nth-child(' + i + ') { animation-delay: ' +
            (0.55 + i * 0.035).toFixed(3) + 's; }\n';
    }
    var plannerDelays = '';
    for (var n = 2; n <= 8; n++) {
        plannerDelays += 'body.logged-in .planner-card:nth-child(' + n + ') { animation: anFadeUp .6s ' +
            (0.5 + (n - 2) * 0.07).toFixed(2) + 's ease backwards; }\n';
    }

    var css = `
/* ----- keyframes ----- */
@keyframes anFadeUp    { from { opacity: 0; transform: translateY(14px); } }
@keyframes anFadeDown  { from { opacity: 0; transform: translateY(-10px); } }
@keyframes anFadeIn    { from { opacity: 0; } }
@keyframes anRowIn     { from { opacity: 0; transform: translateY(6px); } }
@keyframes anCardIn    { from { opacity: 0; transform: translateY(18px) scale(0.97); } }
@keyframes anZoomIn    { from { opacity: 0; transform: scale(0.97); } }
@keyframes anShake     { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); }
                         40% { transform: translateX(6px); } 60% { transform: translateX(-4px); }
                         80% { transform: translateX(4px); } }
@keyframes anGridDrift { to { background-position: 42px 42px, 42px 42px; } }
@keyframes anPop       { 0% { transform: scale(0.9); opacity: 0.55; } 60% { transform: scale(1.04); }
                         100% { transform: scale(1); opacity: 1; } }
@keyframes anRing      { from { stroke-dashoffset: 439.82; } }

/* ----- background grid drifts very slowly ----- */
body::before { animation: anGridDrift 40s linear infinite; }

/* ----- login screen ----- */
body.logged-out #loginCard { animation: anCardIn .7s cubic-bezier(.2, .8, .2, 1) backwards; }
body.logged-out .login-logo { animation: anFadeUp .6s .25s ease backwards; }
body.logged-out .login-subtitle { animation: anFadeUp .6s .35s ease backwards; }
body.logged-out #loginCard form > .mb-3:nth-child(1) { animation: anFadeUp .6s .45s ease backwards; }
body.logged-out #loginCard form > .mb-3:nth-child(2) { animation: anFadeUp .6s .52s ease backwards; }
body.logged-out #loginButton { animation: anFadeUp .6s .6s ease backwards; }
#errorMsg { animation: anShake .45s ease; }
#loginButton:active { transform: translateY(0) scale(0.98); }

/* ----- entrance after login ----- */
body.logged-in > .topbar { animation: anFadeDown .5s ease backwards; }
body.logged-in > h1 { animation: anFadeUp .6s .1s ease backwards; }
body.logged-in .container-fluid > .mb-3 { animation: anFadeUp .6s .15s ease backwards; }
body.logged-in .hero-gauge { animation: anFadeUp .7s .2s ease backwards; }
body.logged-in .summary-card { animation: anFadeUp .7s .3s ease backwards; }
body.logged-in .row.justify-content-between > div:first-child { animation: anFadeUp .7s .4s ease backwards; }
body.logged-in .row.justify-content-between > div:last-child > h4 { animation: anFadeUp .6s .45s ease backwards; }
body.logged-in .mb-5 { animation: anFadeUp .6s 1s ease backwards; }
body.logged-in .log-table tbody tr { animation: anRowIn .45s ease backwards; animation-delay: .95s; }
${rowDelays}
${plannerDelays}
/* ----- progress ring draws itself ----- */
#gaugeRingFill.ring-replay { animation: anRing 1.2s cubic-bezier(.4, 0, .2, 1) .35s backwards; }

/* ----- smooth hover / press feedback ----- */
.btn { transition: transform .15s ease, filter .15s ease, background-color .2s ease,
                   border-color .2s ease, color .2s ease, box-shadow .2s ease; }
.btn:hover:not(:disabled) { transform: translateY(-1px); }
.btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.form-control { transition: border-color .2s ease, box-shadow .2s ease; }
.summary-card, .hero-gauge { transition: transform .25s ease, box-shadow .25s ease; }
.summary-card:hover, .hero-gauge:hover { transform: translateY(-2px); }
.gauge-stat { transition: transform .2s ease; }
.gauge-stat:hover { transform: translateX(3px); }

/* ----- status cell "pop" when it changes ----- */
.status-cell.pop { animation: anPop .45s ease; }

/* ----- picture / print preview ----- */
#reportModal { animation: anFadeIn .25s ease; }
#reportModal img { animation: anZoomIn .35s ease .05s backwards; }
#viewOnlyBadge { animation: anFadeUp .5s ease; }

/* ----- respect "reduce motion" ----- */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
    }
}
`;
    var styleEl = document.createElement('style');
    styleEl.id = 'animationsStyle';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- 2) Status cell pops when YOU change the hours ----------
    document.addEventListener('input', function (e) {
        if (!e.isTrusted) return;                       // ignore events made by other scripts
        var t = e.target;
        if (!t.classList || !t.classList.contains('logged-hour-input') || !t.id) return;
        var cell = document.getElementById(t.id.replace('log-', 'status-'));
        if (!cell) return;
        cell.classList.remove('pop');
        void cell.offsetWidth;                          // restart the animation
        cell.classList.add('pop');
    });

    // ---------- 3) Numbers count up smoothly ----------
    var COUNTER_IDS = ['gaugePercent', 'gaugeRendered', 'gaugeTarget', 'gaugeRemaining'];

    function parseNum(text) {
        var m = /-?\d+(\.\d+)?/.exec(text);
        if (!m) return null;
        return {
            num: parseFloat(m[0]),
            pre: text.slice(0, m.index),
            suf: text.slice(m.index + m[0].length),
            dec: m[1] ? m[1].length - 1 : 0
        };
    }

    function fmt(p, v) {
        return p.pre + v.toFixed(p.dec) + p.suf;
    }

    function run(el, from, to, p) {
        el.__anim = true;
        el.__target = to;
        var start = null;
        var dur = 750;
        function step(ts) {
            if (start === null) start = ts;
            var t = Math.min(1, (ts - start) / dur);
            var e = 1 - Math.pow(1 - t, 3);             // ease-out
            var v = from + (to - from) * e;
            el.__cur = v;
            var s = fmt(p, v);
            el.__mine = s;
            el.textContent = s;
            if (t < 1) {
                el.__raf = requestAnimationFrame(step);
            } else {
                el.__anim = false;
                el.__cur = to;
            }
        }
        el.__raf = requestAnimationFrame(step);
    }

    function onChange(el) {
        var txt = el.textContent;
        if (txt === el.__mine) return;                  // that was my own write
        var p = parseNum(txt);
        if (!p) return;

        // The same final value arrives while we are still counting up: keep counting
        if (el.__anim && p.num === el.__target) {
            el.textContent = el.__mine;
            return;
        }

        clearTimeout(el.__timer);
        cancelAnimationFrame(el.__raf);
        var from = (typeof el.__cur === 'number') ? el.__cur : p.num;
        if (from === p.num) {
            el.__cur = p.num;
            el.__anim = false;
            return;
        }
        run(el, from, p.num, p);
    }

    function setupCounters() {
        if (reduceMotion) return;
        COUNTER_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var p = parseNum(el.textContent);
            el.__cur = p ? p.num : 0;
            new MutationObserver(function () { onChange(el); })
                .observe(el, { childList: true, characterData: true, subtree: true });
        });
    }

    // Count up from zero when the dashboard appears after login
    function replayCounters() {
        if (reduceMotion) return;
        COUNTER_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            var p = parseNum(el.textContent);
            if (!p) return;
            clearTimeout(el.__timer);
            cancelAnimationFrame(el.__raf);
            el.__anim = true;
            el.__target = p.num;
            el.__cur = 0;
            var zero = fmt(p, 0);
            el.__mine = zero;
            el.textContent = zero;
            el.__timer = setTimeout(function () { run(el, 0, p.num, p); }, 350);
        });
    }

    // ---------- 4) Play the ring + counters each time you log in ----------
    var wasIn = false;
    function onLogin() {
        var ring = document.getElementById('gaugeRingFill');
        if (ring && !reduceMotion) {
            ring.classList.remove('ring-replay');
            void ring.getBoundingClientRect();
            ring.classList.add('ring-replay');
            setTimeout(function () { ring.classList.remove('ring-replay'); }, 1700);
        }
        replayCounters();
    }

    function init() {
        setupCounters();
        wasIn = document.body.classList.contains('logged-in');
        new MutationObserver(function () {
            var now = document.body.classList.contains('logged-in');
            if (now && !wasIn) onLogin();
            wasIn = now;
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
