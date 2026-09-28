/* ============================================================
   firebase-sync.js  -  Saves your OJT data to the cloud (Firebase)
   so the desktop app and the website show the same data.

   OWNER account  = can edit and save.
   OTHER accounts = can only VIEW (all inputs are locked).

   ONLY EDIT OWNER_UID BELOW (see the guide).
   ============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDALxRnlqQvAKz6PzRLFuvF-RMdKhXw-78",
    authDomain: "shawn-s-project.firebaseapp.com",
    projectId: "shawn-s-project",
    storageBucket: "shawn-s-project.firebasestorage.app",
    messagingSenderId: "875842484525",
    appId: "1:875842484525:web:952e43741ef221ad2c3ba4",
    measurementId: "G-ZCMGCDHJXW"
};

// The User UID of YOUR account (copy it from Firebase > Authentication > Users)
const OWNER_UID = 'NGR9WiKtZ3Oq1XOgaAzD6tl5ke23';
/* ============================================================
   Do not change anything below this line.
   ============================================================ */

(function () {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const dataDoc = db.collection('users').doc(OWNER_UID);

    let uid = null;
    let isOwner = false;
    let pulledFor = null;
    let timer;

    function setLoggedIn(on) {
        document.body.classList.toggle('logged-in', on);
        document.body.classList.toggle('logged-out', !on);
    }

    // Lock or unlock the page (locked = view only)
    function setViewOnly(on) {
        document.querySelectorAll('.logged-hour-input, #requiredHours').forEach(function (el) {
            el.readOnly = on;
        });
        const resetBtn = document.querySelector('button[onclick="resetAllLogs()"]');
        if (resetBtn) resetBtn.style.display = on ? 'none' : '';

        let badge = document.getElementById('viewOnlyBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'viewOnlyBadge';
            badge.textContent = 'VIEW ONLY';
            badge.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;' +
                'background:#C1ED85;color:#101314;font-family:monospace;font-weight:700;' +
                'letter-spacing:1px;font-size:0.8rem;padding:6px 12px;border-radius:8px;';
            document.body.appendChild(badge);
        }
        badge.style.display = on ? 'block' : 'none';
    }

    // Gather everything the tracker saved in this device
    function collectLocal() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('ojt_')) data[k] = localStorage.getItem(k);
        }
        return data;
    }

    // Upload to the cloud (owner only)
    async function push() {
        if (!uid || !isOwner) return;
        try {
            await dataDoc.set({
                data: collectLocal(),
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error('Save failed:', err.message);
        }
    }

    // Download from the cloud (everyone)
    async function pull() {
        try {
            const snap = await dataDoc.get();
            if (snap.exists) {
                const cloud = snap.data().data || {};
                Object.entries(cloud).forEach(([k, v]) => localStorage.setItem(k, v));
                loadSavedData();   // show the cloud data on screen
            } else if (isOwner) {
                await push();      // first time: upload what is on this device
            }
        } catch (err) {
            console.error('Load failed:', err.message);
        }
    }

    // Auto-save to the cloud 1 second after you stop typing (owner only)
    document.addEventListener('input', (e) => {
        if (!isOwner) return;
        if (e.target.matches('.logged-hour-input, #requiredHours')) {
            clearTimeout(timer);
            timer = setTimeout(push, 1000);
        }
    });

    // Login (uses Firebase email + password)
    window.handleLogin = async function (e) {
        e.preventDefault();
        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        try {
            await auth.signInWithEmailAndPassword(email, password);
            errorMsg.style.display = 'none';
        } catch (err) {
            console.error('Login failed:', err.code);
            errorMsg.textContent = 'Invalid email or password.';
            errorMsg.style.display = 'block';
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    };

    window.handleLogout = async function () {
        clearTimeout(timer);
        await push();
        await auth.signOut();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    };

    window.resetAllLogs = async function () {
        if (!isOwner) return;
        if (confirm('Are you sure you want to clear saved values and reset to defaults?')) {
            try { await dataDoc.delete(); } catch (err) { console.error(err.message); }
            localStorage.clear();
            location.reload();
        }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            uid = user.uid;
            isOwner = (uid === OWNER_UID);
            setLoggedIn(true);
            setViewOnly(!isOwner);
            if (pulledFor !== uid) {
                pulledFor = uid;
                await pull();
            }
        } else {
            uid = null;
            isOwner = false;
            pulledFor = null;
            setLoggedIn(false);
        }
    });
})();
