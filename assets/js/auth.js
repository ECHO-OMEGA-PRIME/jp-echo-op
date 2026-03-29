/* ============================================================
   JP WATER INTEL — Auth Manager
   Uses Firebase Auth from main site (shared session)
   Only authorized emails can access Water Intel pages
   ============================================================ */
(function(window) {
'use strict';

var FB_CONFIG = {
  apiKey: "AIzaSyCuTHwqo6HPjR0oSlCnWBkRslXTZg41VWY",
  authDomain: "echo-prime-ai.firebaseapp.com",
  projectId: "echo-prime-ai",
  storageBucket: "echo-prime-ai.firebasestorage.app",
  messagingSenderId: "249995513427",
  appId: "1:249995513427:web:0d16c5c1f7b19a5eb140a6"
};

var AUTHORIZED_EMAILS = [
  'bmcii1976@gmail.com',
  'jonathan@blackgoldasset.com',
  'jonpinckard@gmail.com'
];

var OWNER_EMAILS = [
  'jonpinckard@gmail.com',
  'bmcii1976@gmail.com'
];

var DEV_EMAILS = [
  'bmcii1976@gmail.com'
];

var state = {
  user: null,
  loading: true,
  error: null,
  authorized: false,
  role: null
};

var listeners = [];

function notify() {
  var s = getState();
  listeners.forEach(function(cb) { cb(s); });
}

function getState() {
  return { user: state.user, loading: state.loading, error: state.error, authorized: state.authorized, role: state.role };
}

function subscribe(cb) {
  listeners.push(cb);
  cb(getState());
  return function() {
    listeners = listeners.filter(function(l) { return l !== cb; });
  };
}

function isAuthorized(email) {
  if (!email) return false;
  return AUTHORIZED_EMAILS.indexOf(email.toLowerCase()) !== -1;
}

function isOwner(email) {
  if (!email) return false;
  return OWNER_EMAILS.indexOf(email.toLowerCase()) !== -1;
}

function getRole(email) {
  if (!email) return null;
  var e = email.toLowerCase();
  if (DEV_EMAILS.indexOf(e) !== -1) return 'dev';
  if (OWNER_EMAILS.indexOf(e) !== -1) return 'owner';
  if (AUTHORIZED_EMAILS.indexOf(e) !== -1) return 'user';
  return null;
}

function isDev(email) {
  if (!email) return false;
  return DEV_EMAILS.indexOf(email.toLowerCase()) !== -1;
}

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function init() {
  try {
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FB_CONFIG);
    }
    return new Promise(function(resolve) {
      var resolved = false;
      // Timeout: if Firebase doesn't resolve in 8 seconds, mark as not_authenticated
      var timeout = setTimeout(function() {
        if (!resolved) {
          resolved = true;
          state.loading = false;
          state.error = 'not_authenticated';
          notify();
          resolve();
        }
      }, 8000);
      firebase.auth().onAuthStateChanged(function(user) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        if (user) {
          var email = (user.email || '').toLowerCase();
          if (isAuthorized(email)) {
            state.user = {
              uid: user.uid,
              email: email,
              full_name: user.displayName || email,
              username: user.displayName || email,
              role: getRole(email)
            };
            state.authorized = true;
            state.role = getRole(email);
            state.error = null;
            // Store Firebase ID token for API calls
            user.getIdToken().then(function(token) {
              localStorage.setItem('bgat_token', token);
            }).catch(function() {});
          } else {
            state.user = null;
            state.authorized = false;
            state.role = null;
            state.error = 'unauthorized';
          }
        } else {
          state.user = null;
          state.authorized = false;
          state.role = null;
          state.error = 'not_authenticated';
        }
        state.loading = false;
        notify();
        resolve();
      });
    });
  } catch(e) {
    state.loading = false;
    state.error = 'Firebase failed to load';
    notify();
  }
}

async function login() {
  try {
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FB_CONFIG);
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    var result = await firebase.auth().signInWithPopup(provider);
    var user = result.user;
    var email = (user.email || '').toLowerCase();
    if (isAuthorized(email)) {
      state.user = {
        uid: user.uid,
        email: email,
        full_name: user.displayName || email,
        username: user.displayName || email,
        role: getRole(email)
      };
      state.authorized = true;
      state.role = getRole(email);
      state.error = null;
      state.loading = false;
      var token = await user.getIdToken();
      localStorage.setItem('bgat_token', token);
      notify();
      if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        window.location.href = 'dashboard.html';
      } else {
        window.location.reload();
      }
    } else {
      await firebase.auth().signOut();
      state.user = null;
      state.authorized = false;
      state.role = null;
      state.error = 'unauthorized';
      state.loading = false;
      notify();
    }
  } catch(e) {
    console.error('Login error:', e);
    state.error = 'login_failed';
    state.loading = false;
    notify();
  }
}

async function loginWithEmail(email, password) {
  try {
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FB_CONFIG);
    }
    var result = await firebase.auth().signInWithEmailAndPassword(email, password);
    var user = result.user;
    var userEmail = (user.email || '').toLowerCase();
    if (isAuthorized(userEmail)) {
      state.user = {
        uid: user.uid,
        email: userEmail,
        full_name: user.displayName || userEmail,
        username: user.displayName || userEmail,
        role: getRole(userEmail)
      };
      state.authorized = true;
      state.role = getRole(userEmail);
      state.error = null;
      state.loading = false;
      var token = await user.getIdToken();
      localStorage.setItem('bgat_token', token);
      notify();
      if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        window.location.href = 'dashboard.html';
      } else {
        window.location.reload();
      }
    } else {
      await firebase.auth().signOut();
      state.user = null;
      state.authorized = false;
      state.role = null;
      state.error = 'unauthorized';
      state.loading = false;
      notify();
    }
  } catch(e) {
    console.error('Email login error:', e);
    state.error = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
      ? 'Invalid email or password'
      : e.code === 'auth/user-not-found'
      ? 'No account found with this email'
      : e.code === 'auth/too-many-requests'
      ? 'Too many attempts. Try again later.'
      : 'Login failed. Please try again.';
    state.loading = false;
    notify();
  }
}

async function resetPassword(email) {
  try {
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js');
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FB_CONFIG);
    }
    await firebase.auth().sendPasswordResetEmail(email);
    return { success: true };
  } catch(e) {
    console.error('Reset error:', e);
    return { success: false, error: e.code === 'auth/user-not-found' ? 'No account found with this email.' : 'Failed to send reset email. Please try again.' };
  }
}

function logout() {
  localStorage.removeItem('bgat_token');
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut();
  }
  state.user = null;
  state.authorized = false;
  state.role = null;
  state.error = null;
  notify();
  window.location.href = 'index.html';
}

function onUnauthorized() {
  state.user = null;
  state.authorized = false;
  state.role = null;
  notify();
}

function requireAuth() {
  return state.authorized;
}

function showLoginOverlay() {
  var overlay = document.getElementById('wiAuthOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideLoginOverlay() {
  var overlay = document.getElementById('wiAuthOverlay');
  if (overlay) overlay.style.display = 'none';
}

// Active view: dev users can toggle between 'owner' and 'user' dashboards
var activeView = localStorage.getItem('ap_active_view') || 'owner';

function getActiveView() {
  // Dev users can toggle. Owners always see owner. Users always see user.
  if (state.role === 'dev') return activeView;
  if (state.role === 'owner') return 'owner';
  return 'user';
}

function toggleView() {
  if (state.role !== 'dev') return;
  activeView = activeView === 'owner' ? 'user' : 'owner';
  localStorage.setItem('ap_active_view', activeView);
  notify();
  window.location.reload();
}

window.wiAuth = {
  init: init,
  login: login,
  loginWithEmail: loginWithEmail,
  resetPassword: resetPassword,
  logout: logout,
  subscribe: subscribe,
  getState: getState,
  requireAuth: requireAuth,
  isOwner: function() { return getActiveView() === 'owner'; },
  isDev: function() { return state.role === 'dev'; },
  getRole: function() { return state.role; },
  getActiveView: getActiveView,
  toggleView: toggleView,
  showLoginOverlay: showLoginOverlay,
  hideLoginOverlay: hideLoginOverlay,
  onUnauthorized: onUnauthorized,
  fetchMe: function() { return Promise.resolve(state.user); }
};

})(window);
