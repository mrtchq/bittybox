/* Bitty Box account helper — STAGING ONLY (test.bittybox.org).
 *
 * Mirrors the field names and header usage of the reference implementation
 * /var/www/bittybox-test-api/src/hooks/useAccount.ts:
 *  - session persisted in localStorage under 'bitty_session_id'
 *  - authenticated calls send the session as the 'x-session-id' request header
 *  - magic/request body {email, displayName, trustDevice}
 *  - magic/verify  body {token}
 *  - logout        body {sessionId} (header also sent)
 *
 * This file is dependency-free vanilla JS. It is loaded by signup.html,
 * account.html, store.html, and (via one additive script tag) index.html so
 * the backend-issued magic link `<origin>/#/auth/verify?token=<token>` —
 * a HASH route that always lands on `/` — is verified and redirected to
 * /account without touching any other page behavior.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'bitty_session_id';

  function getSessionId() {
    try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }

  function setSessionId(sid) {
    try {
      if (sid) localStorage.setItem(SESSION_KEY, sid);
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function isSignedIn() { return Boolean(getSessionId()); }

  function headers(extra) {
    var h = { 'Content-Type': 'application/json' };
    var sid = getSessionId();
    if (sid) h['x-session-id'] = sid;
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || 'GET',
      headers: headers(opts.headers),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    });
  }

  function requestMagicLink(email, displayName, trustDevice) {
    return api('/api/accounts/magic/request', {
      method: 'POST',
      body: {
        email: email,
        displayName: displayName || '',
        trustDevice: trustDevice !== false
      }
    }).then(function (r) { return r; });
  }

  // POST /api/accounts/magic/verify {token} -> persists sessionId, returns result.
  function verifyMagicLink(token) {
    return fetch('/api/accounts/magic/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok && data && data.success && data.sessionId) {
          setSessionId(data.sessionId);
          return { ok: true, data: data };
        }
        return { ok: false, status: res.status, data: data };
      });
    });
  }

  function getMe() { return api('/api/accounts/me'); }

  function getLedger() { return api('/api/accounts/credits/ledger'); }

  // body {packageId} — server also accepts amount/costCents; packageId is canonical.
  function purchaseCredits(packageId) {
    return api('/api/accounts/credits/purchase', {
      method: 'POST',
      body: { packageId: packageId }
    });
  }

  function logout() {
    var sid = getSessionId();
    var done = function () { setSessionId(null); };
    if (!sid) { done(); return Promise.resolve({ ok: true }); }
    return fetch('/api/accounts/logout', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ sessionId: sid })
    }).then(done, done).then(function () { return { ok: true }; });
  }

  function createApiKey(label, scopes) {
    return api('/api/accounts/keys', {
      method: 'POST',
      body: {
        label: label || 'API Key',
        scopes: scopes || ['links:create', 'links:read', 'mcp:access']
      }
    });
  }

  function revokeApiKey(keyId) {
    return api('/api/accounts/keys/' + encodeURIComponent(keyId), {
      method: 'DELETE'
    });
  }

  function deleteLink(linkId) {
    return api('/api/accounts/links/' + encodeURIComponent(linkId), {
      method: 'DELETE'
    });
  }

  function trustDevice(trusted, durationDays) {
    return api('/api/accounts/trust-device', {
      method: 'POST',
      body: {
        trusted: Boolean(trusted),
        durationDays: durationDays || 30
      }
    });
  }

  // Parse `#/auth/verify?token=...` from the current location hash.
  function parseVerifyHash(hash) {
    if (!hash) hash = window.location.hash || '';
    var m = /^#\/auth\/verify\?(.*)$/.exec(hash);
    if (!m) return null;
    var params = new URLSearchParams(m[1]);
    var token = params.get('token');
    return token ? token : null;
  }

  function clearHash() {
    try { history.replaceState(null, '', window.location.pathname + window.location.search); }
    catch (e) { window.location.hash = ''; }
  }

  // Shared top nav. `active` is one of 'signup' | 'account' | 'store' | ''.
  function nav(active) {
    var signed = isSignedIn();
    function link(href, label, key) {
      var style = (key === active)
        ? 'border-color:currentColor;font-weight:700;'
        : '';
      return '<a class="back" style="' + style + '" href="' + href + '">' + label + '</a>';
    }
    var authPart = signed
      ? link('/account', 'Account', 'account') + link('/store', 'Store', 'store')
      : link('/signup', 'Sign up / Sign in', 'signup') + link('/store', 'Store', 'store');
    return '<nav class="bb-nav">'
      + '<a class="bb-home" href="/">Bitty Box</a>'
      + '<span class="bb-links">' + authPart + '</span>'
      + '</nav>';
  }

  function renderNav(active) {
    var el = document.getElementById('bb-nav');
    if (el) el.innerHTML = nav(active || '');
  }

  // If this page load carries a verify hash, verify the token, persist the
  // session, then redirect to /account. Calls onStatus(msg, isError) for UI
  // pages that want to show progress; pages without a status element pass null
  // (index.html: silent verify + redirect).
  function handleVerifyHashIfPresent(onStatus) {
    var token = parseVerifyHash();
    if (!token) return Promise.resolve('none');
    clearHash();
    if (onStatus) onStatus('Verifying your sign-in link…', false);
    return verifyMagicLink(token).then(function (r) {
      if (r.ok) {
        if (onStatus) onStatus('Signed in. Redirecting to your account…', false);
        window.location.href = '/account';
        return 'verified';
      }
      var msg = (r.data && r.data.error) || 'That sign-in link is invalid or expired.';
      if (onStatus) {
        onStatus(msg, true);
        return 'failed';
      }
      // No UI on this page (site root): hand off to signup with the error.
      window.location.href = '/signup?verify=failed&reason=' + encodeURIComponent(msg);
      return 'redirected';
    }).catch(function (err) {
      var msg = (err && err.message) || 'Network error while verifying.';
      if (onStatus) { onStatus(msg, true); return 'failed'; }
      window.location.href = '/signup?verify=failed&reason=' + encodeURIComponent(msg);
      return 'redirected';
    });
  }

  // Guard for account.html / store.html when extra auth is mandatory.
  // Returns a promise resolving true when a session exists.
  function requireSessionOrRedirect() {
    if (isSignedIn()) return Promise.resolve(true);
    window.location.href = '/signup?next=' + encodeURIComponent(window.location.pathname);
    return Promise.resolve(false);
  }

  window.BittyAccount = {
    SESSION_KEY: SESSION_KEY,
    getSessionId: getSessionId,
    setSessionId: setSessionId,
    isSignedIn: isSignedIn,
    api: api,
    requestMagicLink: requestMagicLink,
    verifyMagicLink: verifyMagicLink,
    getMe: getMe,
    getLedger: getLedger,
    purchaseCredits: purchaseCredits,
    logout: logout,
    parseVerifyHash: parseVerifyHash,
    handleVerifyHashIfPresent: handleVerifyHashIfPresent,
    requireSessionOrRedirect: requireSessionOrRedirect,
    renderNav: renderNav
  };

  // Auto-run on the site root ONLY: the backend magic link always lands on `/`
  // (hash routes never reach the server). Other pages call
  // handleVerifyHashIfPresent explicitly so they can show status UI.
  try {
    var path = window.location.pathname;
    if ((path === '/' || path === '/index.html') && parseVerifyHash()) {
      handleVerifyHashIfPresent(null);
    }
  } catch (e) {}
})();
