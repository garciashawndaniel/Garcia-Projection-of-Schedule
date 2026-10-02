/* ============================================================
   report-image.js
   - Table columns:  DATE | TIME IN | TIME OUT | HOURS LOGGED | STATUS/NOTES
   - HOURS LOGGED is now AUTOMATIC: fill in Time In and Time Out and
     it calculates and fills the Hours Logged box for you (H:MM:SS).
     A 1-hour lunch break is subtracted automatically for shifts longer
     than LUNCH_THRESHOLD_HOURS below. You can still type Hours Logged
     manually if you leave a time blank.
   - "Print Report" button: makes a picture that looks like the
     website table (dark style) with ONLY:
     Date, Time In, Time Out, Hours Logged (+ Total Hours at the bottom)
   - The picture can be downloaded (PNG) or printed.
   ============================================================ */

// Adjust these two numbers if you want a different lunch rule.
var LUNCH_BREAK_MINUTES = 60;      // how much to subtract
var LUNCH_THRESHOLD_HOURS = 5;     // only subtract if the shift is longer than this
(function () {

    var MONO = "'JetBrains Mono', 'Courier New', monospace";
    var HEAD = "'Space Grotesk', Arial, sans-serif";

    // ---------- Styles ----------
    var style = document.createElement('style');
    style.textContent =
        '@keyframes rpSpin { to { transform: rotate(360deg); } }' +
        '@keyframes rpDot { 0%, 80%, 100% { opacity: .25; transform: scale(.85); } 40% { opacity: 1; transform: scale(1); } }' +
        '@keyframes rpFadeIn { from { opacity: 0; } }' +
        '@keyframes rpPop { 0% { opacity: 0; transform: scale(.92) translateY(10px); } 60% { transform: scale(1.015); } 100% { opacity: 1; transform: none; } }' +
        '@keyframes rpFlash { 0% { opacity: .85; } 100% { opacity: 0; } }' +
        '#reportModal { animation: rpFadeIn .25s ease; }' +
        '#reportModal .report-actions button { transition: transform .15s ease, filter .15s ease, box-shadow .15s ease; }' +
        '#reportModal .report-actions button:hover { transform: translateY(-2px); }' +
        '#reportModal .report-actions button:active { transform: translateY(0) scale(.97); }' +
        '.rp-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; color: #eef2ee; font-family: ' + MONO + '; }' +
        '.rp-spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,.15); border-top-color: #3ecf6e; animation: rpSpin .8s linear infinite; }' +
        '.rp-dots { display: flex; gap: 6px; font-size: .72rem; letter-spacing: 2px; }' +
        '.rp-dots span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #3ecf6e; animation: rpDot 1.1s ease-in-out infinite; }' +
        '.rp-dots span:nth-child(2) { animation-delay: .15s; }' +
        '.rp-dots span:nth-child(3) { animation-delay: .3s; }' +
        '.rp-image-wrap { position: relative; }' +
        '.rp-image-wrap img { display: block; max-width: 100%; height: auto; margin: 0 auto; animation: rpPop .5s cubic-bezier(.2,.8,.2,1) both; border-radius: 10px; box-shadow: 0 20px 55px rgba(0,0,0,.5); }' +
        '.rp-flash { position: absolute; inset: 0; background: #fff; border-radius: 10px; pointer-events: none; animation: rpFlash .5s ease forwards; }' +
        '#attendanceTable { width: 100%; min-width: 720px; table-layout: auto; }' +
        '.table-responsive { overflow-x: auto !important; }' +
        '#attendanceTable th { font-size: 0.75rem; white-space: nowrap; }' +
        '#attendanceTable td.status-cell { white-space: nowrap; font-size: 0.8rem; padding-left: 8px; padding-right: 8px; }' +
        '.log-table input.time-log-input {' +
        '  background-color: #242526 !important; color: #ffffff !important;' +
        '  border: 1px solid #555555; padding: 2px 2px; font-size: 0.75rem; min-width: 105px; color-scheme: dark;' +
        '}' +
        '.log-table input.time-log-input:focus {' +
        '  border-color: #379737; box-shadow: 0 0 0 0.2rem rgba(55, 151, 55, 0.25);' +
        '}' +
        '#rpPrintArea { display: none; }' +
        '@media print {' +
        '  @page { size: A4; margin: 14mm; }' +
        '  html, body { background: #ffffff !important; }' +
        '  html body::before { display: none !important; }' +
        '  html body > *:not(#rpPrintArea) { display: none !important; }' +
        '  #rpPrintArea {' +
        '    display: block !important; color: #000000; font-family: ' + MONO + ';' +
        '  }' +
        '  #rpPrintArea h2 {' +
        '    font-family: ' + HEAD + '; font-weight: 600; font-size: 20pt; margin: 0 0 4px; color: #000;' +
        '  }' +
        '  #rpPrintArea .rp-print-sub { font-size: 9.5pt; color: #333; margin: 0 0 18px; }' +
        '  #rpPrintArea table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }' +
        '  #rpPrintArea th, #rpPrintArea td { border: 1px solid #000; padding: 6px 10px; text-align: left; }' +
        '  #rpPrintArea th.center, #rpPrintArea td.center { text-align: center; }' +
        '  #rpPrintArea thead th { background: #eee; font-weight: 600; }' +
        '  #rpPrintArea tr.rp-total td { font-weight: 600; background: #f3f3f3; }' +
        '  #rpPrintArea tr { page-break-inside: avoid; }' +
        '}';
    document.head.appendChild(style);

    // ---------- Helpers ----------
    function fmt12(v) {                      // "13:30" -> "1:30 PM"
        if (!v) return '-';
        var p = v.split(':');
        var h = parseInt(p[0], 10);
        var m = p[1] || '00';
        var ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return h + ':' + m + ' ' + ap;
    }

    function isViewOnly() {                  // set by firebase-sync.js for non-owner accounts
        var b = document.getElementById('viewOnlyBadge');
        return !!(b && b.style.display === 'block');
    }

    // ---------- Add TIME IN / TIME OUT columns (after DATE) ----------
    function addTimeColumns() {
        var table = document.getElementById('attendanceTable');
        if (!table || table.dataset.timeCols) return;
        table.dataset.timeCols = '1';

        var headRow = table.querySelector('thead tr');
        var ths = headRow.children;              // DATE, HOURS LOGGED, STATUS/NOTES
        var hoursTh = ths[1];
        ['TIME IN', 'TIME OUT'].forEach(function (label) {
            var th = document.createElement('th');
            th.textContent = label;
            headRow.insertBefore(th, hoursTh);
        });
        // Now: DATE | TIME IN | TIME OUT | HOURS LOGGED | STATUS/NOTES
        ['180px', '125px', '125px', '115px', '150px'].forEach(function (w, i) {
            if (ths[i]) {
                ths[i].style.width = 'auto';
                ths[i].style.minWidth = w;
            }
        });

        table.querySelectorAll('tbody tr').forEach(function (tr) {
            var hoursInput = tr.querySelector('.logged-hour-input');
            if (!hoursInput || !hoursInput.id) return;
            var key = hoursInput.id.replace('log-', '');
            var hoursTd = hoursInput.parentNode;

            var inputs = {};
            ['in', 'out'].forEach(function (kind) {
                var td = document.createElement('td');
                var t = document.createElement('input');
                t.type = 'time';
                t.className = 'form-control form-control-sm text-center time-log-input time-' + kind;
                t.dataset.key = 'ojt_' + kind + '-' + key;
                td.appendChild(t);
                tr.insertBefore(td, hoursTd);
                inputs[kind] = t;
            });

            inputs.in.addEventListener('input', function () { autoCalc(inputs.in, inputs.out, hoursInput); });
            inputs.out.addEventListener('input', function () { autoCalc(inputs.in, inputs.out, hoursInput); });
        });
    }

    // ---------- Auto-calculate Hours Logged from Time In / Time Out ----------
    function toHMS(totalSeconds) {
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor((totalSeconds % 3600) / 60);
        var s = Math.floor(totalSeconds % 60);
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        return h + ':' + pad(m) + ':' + pad(s);
    }

    function autoCalc(inEl, outEl, hoursInput) {
        if (isViewOnly()) return;
        var a = inEl.value, b = outEl.value;      // "HH:MM" 24h, from <input type="time">
        if (!a || !b) return;                     // wait until both times are filled in

        var ap = a.split(':'), bp = b.split(':');
        var startMin = (+ap[0]) * 60 + (+ap[1]);
        var endMin = (+bp[0]) * 60 + (+bp[1]);
        var diffMin = endMin - startMin;
        if (diffMin < 0) diffMin += 24 * 60;       // overnight shift (Time Out earlier than Time In)

        if (diffMin > LUNCH_THRESHOLD_HOURS * 60) {
            diffMin = Math.max(0, diffMin - LUNCH_BREAK_MINUTES);
        }

        hoursInput.value = toHMS(diffMin * 60);
        hoursInput.dispatchEvent(new Event('input', { bubbles: true }));   // updates status, totals, and cloud save
    }

    // ---------- Load / save the times ----------
    function loadTimes() {
        var lock = isViewOnly();
        document.querySelectorAll('.time-in').forEach(function (tIn) {
            var tOut = tIn.parentNode.nextElementSibling
                ? tIn.parentNode.nextElementSibling.querySelector('.time-out')
                : null;
            tIn.value = localStorage.getItem(tIn.dataset.key) || '';
            tIn.readOnly = lock;
            if (tOut) {
                tOut.value = localStorage.getItem(tOut.dataset.key) || '';
                tOut.readOnly = lock;
                var tr = tIn.closest('tr');
                var hoursInput = tr ? tr.querySelector('.logged-hour-input') : null;
                if (hoursInput && !lock) autoCalc(tIn, tOut, hoursInput);
            }
        });
    }

    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t.classList || !t.classList.contains('time-log-input')) return;
        if (isViewOnly()) return;
        localStorage.setItem(t.dataset.key, t.value);

        // Tell the cloud-sync script that something changed (so it saves online too)
        var first = document.querySelector('.logged-hour-input');
        if (first) first.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // When data is downloaded from the cloud, also refresh the time boxes
    var originalLoad = window.loadSavedData;
    if (typeof originalLoad === 'function') {
        window.loadSavedData = function () {
            originalLoad();
            loadTimes();
        };
    }

    // ---------- Collect the rows for the picture ----------
    function collectRows() {
        var rows = [];
        document.querySelectorAll('#attendanceTable tbody tr').forEach(function (tr) {
            var dateCell = tr.querySelector('td');
            var hoursInput = tr.querySelector('.logged-hour-input');
            if (!dateCell || !hoursInput) return;

            var hours = hoursInput.value.trim();
            if (hours === '') return;        // skip days with nothing logged (delete this line to include ALL days)

            var tin = tr.querySelector('.time-in');
            var tout = tr.querySelector('.time-out');
            rows.push({
                date: dateCell.textContent.trim(),
                tin: fmt12(tin ? tin.value : ''),
                tout: fmt12(tout ? tout.value : ''),
                hours: hours
            });
        });
        return rows;
    }

    // ---------- Draw the picture (polished report card) ----------
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawReport(rows, totalText, progressPct) {
        var S = 2;                           // 2x for a sharp picture
        var PAGE = 48;                        // outer page margin
        var W = 860;
        var cols = [
            { label: 'DATE',         w: 280, align: 'left'   },
            { label: 'TIME IN',      w: 150, align: 'center' },
            { label: 'TIME OUT',     w: 150, align: 'center' },
            { label: 'HOURS LOGGED', w: 168, align: 'center' }
        ];
        var cardW = cols.reduce(function (a, c) { return a + c.w; }, 0);
        var cardX = (W - cardW) / 2;

        var headBand = 84;
        var theadH = 40, rowH = 34, totalH = 48;
        var waveH = 46;                        // decorative wave strip at the bottom
        var cardH = headBand + theadH + rows.length * rowH + totalH + waveH;
        var H = PAGE * 2 + cardH;

        var c = document.createElement('canvas');
        c.width = W * S;
        c.height = H * S;
        var ctx = c.getContext('2d');
        ctx.scale(S, S);
        ctx.textBaseline = 'middle';

        // Minimalist deep-green page background (same green family as the site)
        var pageG = ctx.createLinearGradient(0, 0, W, H);
        pageG.addColorStop(0, '#0e2b0c');
        pageG.addColorStop(1, '#040a04');
        ctx.fillStyle = pageG;
        ctx.fillRect(0, 0, W, H);

        // Card
        ctx.fillStyle = '#0c1c0c';
        roundRect(ctx, cardX, PAGE, cardW, cardH, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        roundRect(ctx, cardX + 0.5, PAGE + 0.5, cardW - 1, cardH - 1, 14);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 22px ' + HEAD;
        ctx.textAlign = 'left';
        ctx.fillText('Attendance Report', cardX + 28, PAGE + 34);

        var printedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        ctx.font = '11.5px ' + MONO;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(printedOn + '  ·  ' + rows.length + (rows.length === 1 ? ' entry' : ' entries'), cardX + 28, PAGE + 56);

        var tableTop = PAGE + headBand;
        var innerX = cardX + 26;
        var innerW = cardW - 52;
        var scale = innerW / cardW;

        function hline(y) {
            ctx.strokeStyle = 'rgba(255,255,255,0.10)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(innerX, y);
            ctx.lineTo(innerX + innerW, y);
            ctx.stroke();
        }

        function cell(x, y, w, h, text, o) {
            o = o || {};
            if (text) {
                ctx.fillStyle = o.color || 'rgba(255,255,255,0.92)';
                ctx.font = (o.bold ? '600 ' : '') + '13px ' + MONO;
                if (o.align === 'left') {
                    ctx.textAlign = 'left';
                    ctx.fillText(text, x, y + h / 2);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText(text, x + w / 2, y + h / 2);
                }
            }
        }

        // Header
        hline(tableTop);
        var x = innerX;
        cols.forEach(function (col) {
            var w = col.w * scale;
            cell(x, tableTop, w, theadH, col.label, { bold: true, align: col.align, color: 'rgba(255,255,255,0.5)' });
            x += w;
        });
        hline(tableTop + theadH);

        // Rows — plain, no fills, no stripes
        rows.forEach(function (r, i) {
            var y = tableTop + theadH + i * rowH;
            var vals = [r.date, r.tin, r.tout, r.hours];
            var cx = innerX;
            cols.forEach(function (col, j) {
                var w = col.w * scale;
                cell(cx, y, w, rowH, vals[j], { align: col.align });
                cx += w;
            });
        });

        var afterRows = tableTop + theadH + rows.length * rowH;
        hline(afterRows);

        // Total
        var ty = afterRows;
        ctx.font = '600 12px ' + MONO;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'left';
        ctx.fillText('TOTAL', innerX, ty + totalH / 2);
        ctx.font = '600 20px ' + HEAD;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(totalText, innerX + innerW, ty + totalH / 2);

        // Glowing flow-wave accent along the bottom of the card (soft, teal-green)
        var wy = PAGE + cardH - waveH;
        ctx.save();
        roundRect(ctx, cardX, PAGE, cardW, cardH, 14);
        ctx.clip();

        var flowColors = ['rgba(120,230,170,0.5)', 'rgba(80,200,150,0.35)', 'rgba(60,170,140,0.22)'];
        flowColors.forEach(function (color, i) {
            var amp = 10 + i * 6;
            var baseY = wy + waveH * 0.55 + i * 5;
            ctx.beginPath();
            ctx.moveTo(cardX - 10, baseY);
            ctx.bezierCurveTo(
                cardX + cardW * 0.22, baseY - amp,
                cardX + cardW * 0.38, baseY + amp,
                cardX + cardW * 0.55, baseY - amp * 0.6
            );
            ctx.bezierCurveTo(
                cardX + cardW * 0.72, baseY - amp * 1.3,
                cardX + cardW * 0.86, baseY + amp * 0.8,
                cardX + cardW + 10, baseY - amp * 0.3
            );
            ctx.shadowColor = color;
            ctx.shadowBlur = 10 - i * 2;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.6 - i * 0.3;
            ctx.stroke();
        });
        ctx.restore();

        return c;
    }

    // ---------- Loading overlay while the report is being drawn ----------
    function openModal() {
        var old = document.getElementById('reportModal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'reportModal';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.88);' +
            'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px;';

        var loading = document.createElement('div');
        loading.className = 'rp-loading';
        loading.id = 'rpLoading';
        loading.innerHTML =
            '<div class="rp-spinner"></div>' +
            '<div class="rp-dots"><span></span><span></span><span></span></div>' +
            '<div style="font-size:.72rem;letter-spacing:2px;color:rgba(255,255,255,.55);">PREPARING REPORT</div>';

        overlay.appendChild(loading);
        document.body.appendChild(overlay);
        return overlay;
    }

    // ---------- Build the plain white/black text version used only when printing ----------
    function buildPrintArea(rows, totalText) {
        var area = document.getElementById('rpPrintArea');
        if (!area) {
            area = document.createElement('div');
            area.id = 'rpPrintArea';
            document.body.appendChild(area);
        }
        var printedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        var rowsHtml = rows.map(function (r) {
            return '<tr><td>' + r.date + '</td><td class="center">' + r.tin + '</td>' +
                   '<td class="center">' + r.tout + '</td><td class="center">' + r.hours + '</td></tr>';
        }).join('');
        area.innerHTML =
            '<h2>Attendance Report</h2>' +
            '<p class="rp-print-sub">' + printedOn + ' &middot; ' + rows.length + (rows.length === 1 ? ' entry' : ' entries') + '</p>' +
            '<table>' +
                '<thead><tr><th>DATE</th><th class="center">TIME IN</th><th class="center">TIME OUT</th><th class="center">HOURS LOGGED</th></tr></thead>' +
                '<tbody>' + rowsHtml +
                    '<tr class="rp-total"><td colspan="3">TOTAL</td><td class="center">' + totalText + '</td></tr>' +
                '</tbody>' +
            '</table>';
        return area;
    }

    // ---------- Swap the loading state for the finished picture ----------
    function showPreview(overlay, dataUrl, rows, totalText) {
        var loading = document.getElementById('rpLoading');
        if (loading) loading.remove();

        var bar = document.createElement('div');
        bar.className = 'report-actions';
        bar.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;';

        var dl = document.createElement('button');
        dl.type = 'button';
        dl.className = 'btn btn-success btn-sm';
        dl.textContent = 'Download Picture (PNG)';
        dl.onclick = function () {
            var a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'OJT-Report-' + new Date().toISOString().slice(0, 10) + '.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
        };

        var pr = document.createElement('button');
        pr.type = 'button';
        pr.className = 'btn btn-outline-light btn-sm';
        pr.textContent = 'Print';
        pr.onclick = function () {
            buildPrintArea(rows, totalText);
            window.print();
        };

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn btn-outline-light btn-sm';
        close.textContent = 'Close';
        close.onclick = function () { overlay.remove(); };

        bar.appendChild(dl);
        bar.appendChild(pr);
        bar.appendChild(close);

        var box = document.createElement('div');
        box.className = 'report-box rp-image-wrap';
        box.style.cssText = 'overflow:auto;flex:1;max-width:100%;border-radius:10px;';
        var img = new Image();
        img.src = dataUrl;
        img.alt = 'OJT attendance report';
        box.appendChild(img);

        var flash = document.createElement('div');
        flash.className = 'rp-flash';
        box.appendChild(flash);

        overlay.appendChild(bar);
        overlay.appendChild(box);
    }

    window.saveReportPicture = async function () {
        var rows = collectRows();
        if (rows.length === 0) {
            alert('No hours logged yet, so there is nothing to put in the picture.');
            return;
        }

        var overlay = openModal();
        var minWait = new Promise(function (res) { setTimeout(res, 550); });   // lets the loading animation register

        try {   // make sure the website fonts are ready before drawing
            await Promise.all([
                document.fonts.load('14px ' + MONO),
                document.fonts.load('bold 14px ' + MONO),
                document.fonts.load('600 22px ' + HEAD)
            ]);
        } catch (e) { /* fonts not available: fallback fonts are used */ }

        var total = document.getElementById('renderedHours');
        var required = document.getElementById('requiredHours');
        var rendered = total ? parseFloat(total.value) || 0 : 0;
        var target = required ? parseFloat(required.value) || 0 : 0;
        var progressPct = target > 0 ? (rendered / target) * 100 : 0;
        var totalText = rendered.toFixed(1) + ' hrs';

        var canvas = drawReport(rows, totalText, progressPct);
        await minWait;
        if (!document.body.contains(overlay)) return;   // user closed it while we were drawing
        showPreview(overlay, canvas.toDataURL('image/png'), rows, totalText);
    };

    // ---------- Add the "Print Report" button ----------
    function addButton() {
        var resetBtn = document.querySelector('button[onclick="resetAllLogs()"]');
        if (!resetBtn || document.getElementById('savePictureBtn')) return;

        var btn = document.createElement('button');
        btn.id = 'savePictureBtn';
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-outline-light';
        btn.style.fontFamily = MONO;
        btn.style.fontSize = '0.75rem';
        btn.textContent = 'Print Report';
        btn.onclick = window.saveReportPicture;

        var parent = resetBtn.parentNode;
        if (parent.classList.contains('d-flex') && parent.classList.contains('gap-2')) {
            parent.insertBefore(btn, resetBtn);
        } else {
            var wrap = document.createElement('div');
            wrap.className = 'd-flex gap-2';
            parent.insertBefore(wrap, resetBtn);
            wrap.appendChild(btn);
            wrap.appendChild(resetBtn);
        }
    }

    // Give the attendance table the FULL width of the page (Weekly Planner goes
    // below it) so the STATUS column is fully visible
    function fixLayout() {
        var table = document.getElementById('attendanceTable');
        if (!table) return;
        var left = table.closest('.col-md-6');
        if (left) {
            left.classList.remove('col-md-6');
            left.classList.add('col-12');
        }
        var right = document.querySelector('.row.justify-content-between > .col-md-5');
        if (right) {
            right.classList.remove('col-md-5');
            right.classList.add('col-12', 'col-xl-8', 'mx-auto', 'mb-4');
        }
    }

    function init() {
        fixLayout();
        addTimeColumns();
        loadTimes();
        addButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
