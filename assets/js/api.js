/* ============================================================
   JP WATER INTEL — API Client
   Vanilla JS equivalent of the Next.js api.ts
   ============================================================ */
(function(window) {
'use strict';

const API_BASE = window.BGAT_API_URL || 'https://bgat-api-gateway.bmcii1976.workers.dev';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function apiFetch(path, options) {
  options = options || {};
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('bgat_token');
  const headers = Object.assign({}, options.headers || {});

  // Only set Content-Type for requests with a body
  if (method !== 'GET' && method !== 'HEAD') {
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));

  if (res.status === 401) {
    localStorage.removeItem('bgat_token');
    if (window.wiAuth) window.wiAuth.onUnauthorized();
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    var body;
    try { body = await res.json(); } catch(e) { body = { detail: res.statusText }; }
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  if (res.status === 204) return undefined;
  return res.json();
}

async function apiUpload(path, file) {
  const token = localStorage.getItem('bgat_token');
  const form = new FormData();
  form.append('file', file);

  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: headers,
    body: form
  });

  if (!res.ok) {
    var body;
    try { body = await res.json(); } catch(e) { body = { detail: res.statusText }; }
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  return res.json();
}

// Expose globally
window.bgat = window.bgat || {};
window.bgat.api = {
  apiFetch: apiFetch,
  apiUpload: apiUpload,
  apiPost: function(path, body) {
    return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  },
  ApiError: ApiError,
  API_BASE: API_BASE
};

})(window);
