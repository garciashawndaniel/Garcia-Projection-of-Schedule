/* ============================================================
   report-image.js
   - Table columns:  DATE | TIME IN | TIME OUT | HOURS LOGGED | STATUS/NOTES
   - "Print Report" button: makes a picture that looks like the
     website table (dark style) with ONLY:
     Date, Time In, Time Out, Hours Logged (+ Total Hours at the bottom)
   - The picture can be downloaded (PNG) or printed.
   ============================================================ */
(function () {

    var MONO = "'JetBrains Mono', 'Courier New', monospace";
    var HEAD = "'Space Grotesk', Arial, sans-serif";

    // ---------- Styles ----------
    var style = document.createElement('style');
    style.textContent =
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
        '@media print {' +
        '  @page { size: A4; margin: 10mm; }' +
        '  html body { background: none !important; }' +
        '  html body::before { display: none !important; }' +
        '  html body > *:not(#reportModal) { display: none !important; }' +
        '  html body > #reportModal { display: block !important; position: static !important; background: none !important; padding: 0 !important; }' +
        '  #reportModal .report-actions { display: none !important; }' +
        '  #reportModal .report-box { overflow: visible !important; background: none !important; }' +
        '  #reportModal img { max-width: 100% !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
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

            ['in', 'out'].forEach(function (kind) {
                var td = document.createElement('td');
                var t = document.createElement('input');
                t.type = 'time';
                t.className = 'form-control form-control-sm text-center time-log-input time-' + kind;
                t.dataset.key = 'ojt_' + kind + '-' + key;
                td.appendChild(t);
                tr.insertBefore(td, hoursTd);
            });
        });
    }

    // ---------- Load / save the times ----------
    function loadTimes() {
        var lock = isViewOnly();
        document.querySelectorAll('.time-log-input').forEach(function (t) {
            t.value = localStorage.getItem(t.dataset.key) || '';
            t.readOnly = lock;
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

    // ---------- Draw the picture (looks like the website table) ----------
    function drawReport(rows, totalText) {
        var S = 2;                           // 2x for a sharp picture
        var PAD = 25, W = 900;
        var cols = [
            { label: 'DATE',         w: 300, align: 'left'   },
            { label: 'TIME IN',      w: 180, align: 'center' },
            { label: 'TIME OUT',     w: 180, align: 'center' },
            { label: 'HOURS LOGGED', w: 190, align: 'center' }
        ];
        var tableW = 850;
        var top = 100, headH = 40, rowH = 34, totalH = 44;
        var H = top + headH + rows.length * rowH + totalH + PAD + 10;

        var c = document.createElement('canvas');
        c.width = W * S;
        c.height = H * S;
        var ctx = c.getContext('2d');
        ctx.scale(S, S);

        // Background: same green-to-black gradient as the website
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#436e2f');
        g.addColorStop(1, '#030000');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.textBaseline = 'middle';

        // Title
        ctx.fillStyle = 'rgb(188, 224, 173)';
        ctx.font = 'bold 26px ' + HEAD;
        ctx.textAlign = 'center';
        ctx.fillText('OJT ATTENDANCE & LOGS', W / 2, 38);
        ctx.font = '13px ' + MONO;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        var printedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        ctx.fillText('Generated on ' + printedOn, W / 2, 68);

        function cell(x, y, w, h, text, o) {
            o = o || {};
            ctx.fillStyle = o.bg || '#303234';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#868686';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
            if (text) {
                ctx.fillStyle = '#ffffff';
                ctx.font = (o.bold ? 'bold ' : '') + '14px ' + MONO;
                if (o.align === 'left') {
                    ctx.textAlign = 'left';
                    ctx.fillText(text, x + 12, y + h / 2);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText(text, x + w / 2, y + h / 2);
                }
            }
        }

        // Header row
        var x = PAD;
        cols.forEach(function (col) {
            cell(x, top, col.w, headH, col.label, { bold: true, align: 'center' });
            x += col.w;
        });

        // Data rows
        rows.forEach(function (r, i) {
            var y = top + headH + i * rowH;
            var vals = [r.date, r.tin, r.tout, r.hours];
            var cx = PAD;
            cols.forEach(function (col, j) {
                cell(cx, y, col.w, rowH, vals[j], { align: col.align });
                cx += col.w;
            });
        });

        // Total row (green, like the OJT status color on the website)
        var ty = top + headH + rows.length * rowH;
        var greenBg = '#379737';
        cell(PAD, ty, cols[0].w + cols[1].w + cols[2].w, totalH, 'TOTAL HOURS', { bg: greenBg, bold: true, align: 'left' });
        cell(PAD + cols[0].w + cols[1].w + cols[2].w, ty, cols[3].w, totalH, totalText, { bg: greenBg, bold: true, align: 'center' });

        // Outer border like the website table
        ctx.strokeStyle = '#868686';
        ctx.lineWidth = 2;
        ctx.strokeRect(PAD, top, tableW, headH + rows.length * rowH + totalH);

        return c;
    }

    // ---------- Show the picture with Download / Print buttons ----------
    function showPreview(dataUrl) {
        var old = document.getElementById('reportModal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'reportModal';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.88);' +
            'display:flex;flex-direction:column;align-items:center;padding:16px;gap:12px;';

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
        pr.onclick = function () { window.print(); };

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'btn btn-outline-light btn-sm';
        close.textContent = 'Close';
        close.onclick = function () { overlay.remove(); };

        bar.appendChild(dl);
        bar.appendChild(pr);
        bar.appendChild(close);

        var box = document.createElement('div');
        box.className = 'report-box';
        box.style.cssText = 'overflow:auto;flex:1;max-width:100%;border-radius:6px;';
        var img = new Image();
        img.src = dataUrl;
        img.alt = 'OJT attendance report';
        img.style.cssText = 'display:block;max-width:100%;height:auto;margin:0 auto;';
        box.appendChild(img);

        overlay.appendChild(bar);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    window.saveReportPicture = async function () {
        var rows = collectRows();
        if (rows.length === 0) {
            alert('No hours logged yet, so there is nothing to put in the picture.');
            return;
        }
        try {   // make sure the website fonts are ready before drawing
            await Promise.all([
                document.fonts.load('14px ' + MONO),
                document.fonts.load('bold 14px ' + MONO),
                document.fonts.load('bold 26px ' + HEAD)
            ]);
        } catch (e) { /* fonts not available: fallback fonts are used */ }

        var total = document.getElementById('renderedHours');
        var totalText = (total ? total.value : '0') + ' hrs';
        var canvas = drawReport(rows, totalText);
        showPreview(canvas.toDataURL('image/png'));
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
