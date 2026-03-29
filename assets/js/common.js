/* ============================================================
   AQUA PULSE — Common Utilities
   Sidebar nav, toasts, formatters, page bootstrap
   ============================================================ */
(function(window) {
'use strict';

/* ── SVG Icons ── */
var ICONS = {
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  wells: '<svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="4"/></svg>',
  map: '<svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  alerts: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  query: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  back: '<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  droplet: '<svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  activity: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  barChart: '<svg viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  trending: '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  billing: '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  customers: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  expenses: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  estimates: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  analytics: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  arap: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  intel: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>',
  officeAi: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
  variance: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><line x1="1" y1="1" x2="23" y2="23" style="stroke-dasharray:4 3"/></svg>',
  multiSample: '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="12" x2="22" y2="12" style="stroke-dasharray:3 2"/></svg>',
  millipore: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="4"/></svg>'
};

/* ── Owner-only page IDs ── */
var OWNER_PAGES = ['billing', 'estimates', 'expenses', 'customers', 'competitor-intel', 'analytics', 'arap', 'business-manager'];

/* ── Build Sidebar ── */
function buildSidebar(activePage) {
  var navItems = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: ICONS.dashboard, ownerOnly: true },
    { id: 'wells', label: 'Wells', href: 'wells.html', icon: ICONS.wells },
    { id: 'map', label: 'Formation Map', href: 'map.html', icon: ICONS.map },
    { id: 'alerts', label: 'Alerts', href: 'alerts.html', icon: ICONS.alerts },
    { divider: true },
    { id: 'variance-detection', label: 'Variance Detection', href: 'variance-detection.html', icon: ICONS.variance },
    { id: 'multi-sample', label: 'Multi-Sample Avg', href: 'multi-sample.html', icon: ICONS.multiSample },
    { id: 'millipore-analysis', label: 'Millipore Analysis', href: 'millipore-analysis.html', icon: ICONS.millipore },
    { divider: true, ownerOnly: true },
    { id: 'upload', label: 'Upload PDF', href: 'upload.html', icon: ICONS.upload, ownerOnly: true },
    { id: 'query', label: 'Data Query', href: 'query.html', icon: ICONS.query, ownerOnly: true },
    { divider: true, ownerOnly: true },
    { id: 'billing', label: 'Billing', href: 'billing.html', icon: ICONS.billing, ownerOnly: true },
    { id: 'estimates', label: 'Estimates', href: 'estimates.html', icon: ICONS.estimates, ownerOnly: true },
    { id: 'expenses', label: 'Expenses', href: 'expenses.html', icon: ICONS.expenses, ownerOnly: true },
    { id: 'customers', label: 'Customers', href: 'customers.html', icon: ICONS.customers, ownerOnly: true },
    { divider: true, ownerOnly: true },
    { id: 'competitor-intel', label: 'Competitor Intel', href: 'competitor-intel.html', icon: ICONS.intel, ownerOnly: true },
    { id: 'analytics', label: 'Analytics & P/L', href: 'analytics.html', icon: ICONS.analytics, ownerOnly: true },
    { id: 'arap', label: 'AR / AP', href: 'arap.html', icon: ICONS.arap, ownerOnly: true },
    { divider: true, ownerOnly: true },
    { id: 'office-ai', label: 'Office AI', href: 'office-ai.html', icon: ICONS.officeAi, ownerOnly: true },
    { id: 'business-manager', label: 'Business Manager', href: 'business-manager.html', icon: ICONS.briefcase, ownerOnly: true }
  ];

  var sidebar = document.createElement('aside');
  sidebar.className = 'wi-sidebar';
  sidebar.id = 'wiSidebar';

  var brand = '<div class="wi-sidebar-brand"><a href="/">' +
    '<svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:var(--cyan);stroke-width:2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' +
    '<span>Aqua Pulse</span></a></div>';
  var nav = '<nav class="wi-nav" aria-label="Water Intel navigation">';

  var view = (window.wiAuth && window.wiAuth.getActiveView) ? window.wiAuth.getActiveView() : 'owner';
  navItems.forEach(function(item) {
    if (item.ownerOnly && view !== 'owner') return;
    if (item.divider) {
      nav += '<div class="wi-nav-divider"></div>';
    } else {
      var cls = item.id === activePage ? ' active' : '';
      nav += '<a href="' + item.href + '" class="' + cls + '">' + item.icon + item.label + '</a>';
    }
  });
  nav += '</nav>';

  var footer = '<div class="wi-sidebar-footer">' +
    '<a href="#" onclick="wiAuth.logout();return false;" style="color:#ef4444">' + ICONS.logout + 'Sign Out</a>' +
    '</div>';

  sidebar.innerHTML = brand + nav + footer;
  return sidebar;
}

/* ── Rebuild Sidebar after auth resolves ── */
function rebuildSidebar(activePage, oldSidebar, mobileToggle, mobileOverlay) {
  var newSidebar = buildSidebar(activePage);
  // Preserve open state
  if (oldSidebar.classList.contains('open')) newSidebar.classList.add('open');
  oldSidebar.parentNode.replaceChild(newSidebar, oldSidebar);

  // Rebind mobile toggle
  mobileToggle.addEventListener('click', function() {
    newSidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('open');
  });
  mobileOverlay.addEventListener('click', function() {
    newSidebar.classList.remove('open');
    mobileOverlay.classList.remove('open');
  });
}

/* ── Build Auth Overlay ── */
function buildAuthOverlay() {
  var overlay = document.createElement('div');
  overlay.id = 'wiAuthOverlay';
  overlay.className = 'wi-auth-overlay';
  overlay.style.display = 'none';
  // Content set dynamically based on auth state
  return overlay;
}

/* ── Show Under Construction (unauthorized users) ── */
function showUnderConstruction() {
  var overlay = document.getElementById('wiAuthOverlay');
  if (!overlay) return;
  overlay.innerHTML = '<div class="wi-auth-card" style="text-align:center">' +
    '<div style="font-size:3rem;margin-bottom:16px">🚧</div>' +
    '<h2 style="margin-bottom:12px">Page Under Construction</h2>' +
    '<p style="color:var(--white-dim);margin-bottom:24px">This section is currently under development and access is restricted.</p>' +
    '<a href="dashboard.html" class="btn-primary" style="display:inline-block;padding:12px 32px;text-decoration:none;border-radius:4px">← Back to Dashboard</a>' +
    '</div>';
  overlay.style.display = 'flex';
}

/* ── Show Not Signed In (needs to login) ── */
function showNeedLogin() {
  var overlay = document.getElementById('wiAuthOverlay');
  if (!overlay) return;
  overlay.innerHTML = '<div class="wi-auth-card" style="text-align:center;max-width:420px;width:100%">' +
    '<div style="font-size:3rem;margin-bottom:16px">🔒</div>' +
    '<h2 style="margin-bottom:12px">Sign In Required</h2>' +
    '<p style="color:var(--white-dim);margin-bottom:20px">Sign in to access Aqua Pulse.</p>' +
    '<div id="emailLoginForm" style="margin-bottom:20px;text-align:left">' +
      '<input id="loginEmail" type="email" placeholder="Email address" style="width:100%;padding:12px 16px;margin-bottom:10px;background:var(--surface,#0c1829);border:1px solid rgba(0,212,255,0.2);border-radius:6px;color:#e2edf6;font-size:0.95rem;outline:none" />' +
      '<input id="loginPassword" type="password" placeholder="Password" style="width:100%;padding:12px 16px;margin-bottom:6px;background:var(--surface,#0c1829);border:1px solid rgba(0,212,255,0.2);border-radius:6px;color:#e2edf6;font-size:0.95rem;outline:none" />' +
      '<div style="text-align:right;margin-bottom:14px">' +
        '<a href="#" id="resetPasswordLink" style="font-size:0.85rem;color:rgba(0,212,255,0.7)">Forgot password?</a>' +
      '</div>' +
      '<div id="loginError" style="color:#ff6b6b;font-size:0.85rem;margin-bottom:10px;display:none"></div>' +
      '<div id="loginSuccess" style="color:#14b8a6;font-size:0.85rem;margin-bottom:10px;display:none"></div>' +
      '<button id="emailLoginBtn" style="width:100%;padding:12px;background:linear-gradient(135deg,#00d4ff,#0099cc);border:none;border-radius:6px;color:#fff;font-size:1rem;font-weight:600;cursor:pointer">Sign In</button>' +
    '</div>' +
    '<div style="color:var(--white-muted,#4a6580);margin-bottom:16px;font-size:0.85rem">— or —</div>' +
    '<button onclick="wiAuth.login()" class="btn-primary" style="display:inline-block;padding:12px 32px;border:none;border-radius:4px;cursor:pointer;font-size:1rem;width:100%;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);color:#00d4ff">Sign In with Google</button>' +
    '</div>';
  overlay.style.display = 'flex';

  setTimeout(function() {
    var btn = document.getElementById('emailLoginBtn');
    var emailInput = document.getElementById('loginEmail');
    var passInput = document.getElementById('loginPassword');
    var errEl = document.getElementById('loginError');
    var successEl = document.getElementById('loginSuccess');
    var resetLink = document.getElementById('resetPasswordLink');

    if (btn) {
      btn.addEventListener('click', function() {
        var email = emailInput ? emailInput.value.trim() : '';
        var pass = passInput ? passInput.value : '';
        if (!email || !pass) {
          if (errEl) { errEl.textContent = 'Please enter email and password.'; errEl.style.display = 'block'; }
          return;
        }
        btn.textContent = 'Signing in...';
        btn.disabled = true;
        if (errEl) errEl.style.display = 'none';
        wiAuth.loginWithEmail(email, pass);
        wiAuth.subscribe(function(s) {
          if (s.error && typeof s.error === 'string' && s.error !== 'not_authenticated') {
            if (errEl) { errEl.textContent = s.error; errEl.style.display = 'block'; }
            btn.textContent = 'Sign In';
            btn.disabled = false;
          }
        });
      });
      if (passInput) {
        passInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') btn.click();
        });
      }
    }

    if (resetLink) {
      resetLink.addEventListener('click', function(e) {
        e.preventDefault();
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          if (errEl) { errEl.textContent = 'Enter your email address first.'; errEl.style.display = 'block'; }
          return;
        }
        if (errEl) errEl.style.display = 'none';
        wiAuth.resetPassword(email).then(function(result) {
          if (result.success) {
            if (successEl) { successEl.textContent = 'Password reset email sent! Check your inbox.'; successEl.style.display = 'block'; }
          } else {
            if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
          }
        });
      });
    }
  }, 50);
}

/* ── Build Top Bar ── */
function buildTopBar(title, subtitle) {
  var bar = document.createElement('header');
  bar.className = 'wi-topbar';
  bar.innerHTML = '<div class="wi-topbar-left"><h1>' + title + '</h1>' +
    (subtitle ? '<p>' + subtitle + '</p>' : '') +
    '</div><div class="wi-topbar-right" id="wiTopbarRight"></div>';
  return bar;
}

/* ── Initialize Page ── */
function initPage(opts) {
  var layout = document.createElement('div');
  layout.className = 'wi-layout';

  var sidebar = buildSidebar(opts.page);
  var main = document.createElement('main');
  main.className = 'wi-main';
  var topbar = buildTopBar(opts.title, opts.subtitle);
  var content = document.createElement('div');
  content.className = 'wi-content';
  content.id = 'wiContent';

  main.appendChild(topbar);
  main.appendChild(content);
  layout.appendChild(sidebar);
  layout.appendChild(main);

  var authOverlay = buildAuthOverlay();

  document.body.appendChild(layout);
  document.body.appendChild(authOverlay);

  // Mobile sidebar toggle
  var mobileToggle = document.createElement('button');
  mobileToggle.className = 'wi-mobile-toggle';
  mobileToggle.innerHTML = '&#9776;';
  mobileToggle.setAttribute('aria-label', 'Toggle navigation');
  document.body.appendChild(mobileToggle);

  var mobileOverlay = document.createElement('div');
  mobileOverlay.className = 'wi-sidebar-overlay';
  document.body.appendChild(mobileOverlay);

  mobileToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('open');
  });
  mobileOverlay.addEventListener('click', function() {
    sidebar.classList.remove('open');
    mobileOverlay.classList.remove('open');
  });

  // Init auth — Firebase-based, no second login
  window.wiAuth.init().then(function() {
    var s = window.wiAuth.getState();
    if (s.error === 'not_authenticated') {
      showNeedLogin();
    } else if (s.error === 'unauthorized' || !s.authorized) {
      showUnderConstruction();
    } else if (s.user) {
      updateUserPill(s.user);
      // Rebuild sidebar now that role is known
      rebuildSidebar(opts.page, sidebar, mobileToggle, mobileOverlay);
    }
  });

  // Listen for auth changes
  window.wiAuth.subscribe(function(s) {
    if (s.user && s.authorized) {
      updateUserPill(s.user);
    }
  });

  return content;
}

function updateUserPill(user) {
  var right = document.getElementById('wiTopbarRight');
  if (!right) return;
  var initial = (user.full_name || user.username || 'U')[0].toUpperCase();
  var name = user.full_name || user.username;
  var role = user.role || 'user';
  var view = wiAuth.getActiveView ? wiAuth.getActiveView() : 'owner';

  var html = '';

  // Dev toggle: switch between owner and user views
  if (role === 'dev') {
    var ownerActive = view === 'owner';
    html += '<div class="wi-view-toggle" style="display:flex;align-items:center;gap:8px;margin-right:16px;padding:4px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:20px">';
    html += '<span style="font-size:0.75rem;color:' + (!ownerActive ? 'var(--cyan)' : 'var(--white-dim)') + ';font-weight:' + (!ownerActive ? '600' : '400') + '">User</span>';
    html += '<label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer">';
    html += '<input type="checkbox" ' + (ownerActive ? 'checked' : '') + ' onchange="wiAuth.toggleView()" style="opacity:0;width:0;height:0">';
    html += '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (ownerActive ? 'var(--cyan)' : '#374151') + ';border-radius:20px;transition:.3s"></span>';
    html += '<span style="position:absolute;content:\'\';height:16px;width:16px;left:' + (ownerActive ? '18px' : '2px') + ';bottom:2px;background:white;border-radius:50%;transition:.3s;display:block"></span>';
    html += '</label>';
    html += '<span style="font-size:0.75rem;color:' + (ownerActive ? 'var(--cyan)' : 'var(--white-dim)') + ';font-weight:' + (ownerActive ? '600' : '400') + '">Owner</span>';
    html += '</div>';
  }

  // Role badge
  var badgeColor = role === 'dev' ? '#a855f7' : role === 'owner' ? '#22c55e' : '#3b82f6';
  var badgeLabel = role === 'dev' ? 'DEV' : role === 'owner' ? 'OWNER' : 'USER';

  html += '<div class="wi-user-pill">' +
    '<div class="wi-user-avatar">' + initial + '</div>' +
    '<span class="wi-user-name">' + escapeHtml(name) + '</span>' +
    '<span style="font-size:0.65rem;padding:2px 6px;background:' + badgeColor + '22;color:' + badgeColor + ';border:1px solid ' + badgeColor + '44;border-radius:4px;font-weight:600;letter-spacing:0.5px">' + badgeLabel + '</span>' +
    '</div>';

  html += '<button class="btn-outline btn-sm" onclick="wiAuth.logout()" style="color:#ef4444;border-color:rgba(239,68,68,0.3)">Sign Out</button>';

  right.innerHTML = html;
}

/* ── Toast ── */
function showToast(message, type) {
  type = type || 'info';
  var existing = document.querySelector('.wi-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.className = 'wi-toast wi-toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(function() {
    toast.classList.add('show');
  });

  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}

/* ── Formatters ── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(n, decimals) {
  if (n === null || n === undefined) return '—';
  decimals = decimals !== undefined ? decimals : 1;
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function severityBadge(severity) {
  var cls = severity === 'CRITICAL' ? 'badge-critical' : severity === 'WARNING' ? 'badge-warning' : 'badge-info';
  return '<span class="badge ' + cls + '">' + escapeHtml(severity) + '</span>';
}

function statusBadge(status) {
  var cls = status === 'active' ? 'badge-success' : 'badge-info';
  return '<span class="badge ' + cls + '">' + escapeHtml(status) + '</span>';
}

/* ── Skeleton ── */
function skeleton(height) {
  return '<div class="skeleton" style="height:' + (height || 40) + 'px"></div>';
}

function skeletonRows(count, height) {
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<div class="skeleton" style="height:' + (height || 40) + 'px;margin-bottom:8px"></div>';
  }
  return html;
}

/* ── Expose ── */
window.bgat = window.bgat || {};
window.bgat.common = {
  ICONS: ICONS,
  initPage: initPage,
  showToast: showToast,
  formatDate: formatDate,
  formatNumber: formatNumber,
  escapeHtml: escapeHtml,
  severityBadge: severityBadge,
  statusBadge: statusBadge,
  skeleton: skeleton,
  skeletonRows: skeletonRows
};

})(window);
