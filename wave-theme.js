(function () {

    // A small repeating "circuit board" tile: zigzag lines + dots + a ring,
    // reused as a CSS background so it tiles cleanly behind the login card.
    var circuitTile =
        '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
        '<g fill="none" stroke="%2347c96a" stroke-width="1.4" opacity="0.55">' +
        '<path d="M0 40 L60 40 L90 70 L160 70 L190 100 L220 100"/>' +
        '<path d="M0 140 L40 140 L70 170 L140 170 L170 200 L220 200"/>' +
        '<path d="M30 0 L30 30 L60 60"/>' +
        '<path d="M180 0 L180 40 L150 70"/>' +
        '<circle cx="90" cy="70" r="5"/>' +
        '<circle cx="170" cy="200" r="5"/>' +
        '<circle cx="30" cy="30" r="8" fill="none"/>' +
        '</g>' +
        '<g fill="%2347c96a" opacity="0.6">' +
        '<circle cx="60" cy="40" r="2.4"/><circle cx="190" cy="100" r="2.4"/>' +
        '<circle cx="40" cy="140" r="2.4"/><circle cx="220" cy="200" r="2.4"/>' +
        '</g></svg>';
    var circuitURL = 'url("data:image/svg+xml;utf8,' + circuitTile + '")';

    var css = `
/* ---------- Login screen: circuit-board backdrop ---------- */
#loginScreen {
    background:
        linear-gradient(115deg, rgba(3,7,3,0.92) 0%, rgba(6,20,8,0.75) 45%, rgba(20,60,20,0.55) 100%),
        ${circuitURL} !important;
    background-repeat: no-repeat, repeat !important;
    background-size: cover, 220px 220px !important;
}
#loginCard { background: rgba(10,18,10,.72) !important; backdrop-filter: blur(10px); }

/* ---------- Main site: deep green base ---------- */
body { background: linear-gradient(160deg, #0c1f0b 0%, #050b04 70%) !important; }
body::before { display: none !important; }

.wave-bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
body > *:not(.wave-bg) { position: relative; z-index: 1; }

/* Diagonal banner shapes, top-left, layered green tones */
.banner { position: absolute; height: 90px; width: 145%; left: -10%;
    transform: rotate(-8deg); border-radius: 4px; }
.banner.b1 { top: -30px; background: linear-gradient(90deg, #1c4a17, #3f8a37 55%, #1c4a17); opacity: .5; }
.banner.b2 { top: 44px; background: linear-gradient(90deg, #163a12, #2f6b2a 55%, #163a12); opacity: .4; }
.banner.b3 { top: 118px; background: linear-gradient(90deg, #0f2a0c, #235f1e 55%, #0f2a0c); opacity: .35; }

/* Faint circuit accent, tucked in the corner like image 2 */
.corner-circuit { position: absolute; top: 4%; right: -2%; width: 34vw; min-width: 320px; opacity: .5; }

/* ---------- Panels stay clean/glassy over the backdrop ---------- */
.summary-card, .hero-gauge, .table-responsive, .planner-card, .mb-5 {
    background: rgba(8, 18, 8, .55) !important;
    backdrop-filter: blur(10px);
    border-color: rgba(255,255,255,.12) !important;
}
`;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bg = document.createElement('div');
    bg.className = 'wave-bg';
    bg.innerHTML =
        '<div class="banner b1"></div><div class="banner b2"></div><div class="banner b3"></div>' +
        '<svg class="corner-circuit" viewBox="0 0 400 260" fill="none" stroke="#47c96a" stroke-width="1.4">' +
        '<path d="M60 10 L60 70 L110 120 L110 180 M230 0 L230 40 L280 90 L340 90 M180 40 L250 40 L250 100 L360 100"/>' +
        '<circle cx="110" cy="120" r="6" fill="none"/><circle cx="250" cy="40" r="4" fill="#47c96a" stroke="none"/>' +
        '<circle cx="60" cy="70" r="3" fill="#47c96a" stroke="none"/><circle cx="340" cy="90" r="3" fill="#47c96a" stroke="none"/>' +
        '</svg>';
    document.body.insertBefore(bg, document.body.firstChild);
})();
