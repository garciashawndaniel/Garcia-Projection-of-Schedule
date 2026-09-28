/* ============================================================
   firebase-sync.js  -  Saves your OJT data to the cloud (Firebase)
   so the desktop app and the website show the same data.

   Your firebaseConfig is already filled in below.
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
/* ============================================================
   Do not change anything below this line.
   ============================================================ */

(function () {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    let uid = null;
    let pulledFor = null;
    let timer;

    function setLoggedIn(on) {
        document.body.classList.toggle('logged-in', on);
        document.body.classList.toggle('logged-out', !on);
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

    // Upload to the cloud
    async function push() {
        if (!uid) return;
        try {
            await db.collection('users').doc(uid).set({
                data: collectLocal(),
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error('Save failed:', err.message);
        }
    }

    // Download from the cloud
    async function pull() {
        try {
            const snap = await db.collection('users').doc(uid).get();
            if (snap.exists) {
                const cloud = snap.data().data || {};
                Object.entries(cloud).forEach(([k, v]) => localStorage.setItem(k, v));
                loadSavedData();   // show the cloud data on screen
            } else {
                await push();      // first time: upload what is on this device
            }
        } catch (err) {
            console.error('Load failed:', err.message);
        }
    }

    // Auto-save to the cloud 1 second after you stop typing
    document.addEventListener('input', (e) => {
        if (e.target.matches('.logged-hour-input, #requiredHours')) {
            clearTimeout(timer);
            timer = setTimeout(push, 1000);
        }
    });

    // Replaces the old login (now uses your Firebase email + password)
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
        if (confirm('Are you sure you want to clear saved values and reset to defaults?')) {
            if (uid) {
                try { await db.collection('users').doc(uid).delete(); } catch (err) { console.error(err.message); }
            }
            localStorage.clear();
            location.reload();
        }
    };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            uid = user.uid;
            setLoggedIn(true);
            if (pulledFor !== uid) {
                pulledFor = uid;
                await pull();
            }
        } else {
            uid = null;
            pulledFor = null;
            setLoggedIn(false);
        }
    });
})();
