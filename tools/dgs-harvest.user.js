// ==UserScript==
// @name         BettorPlays DGS Shadow Harvest
// @namespace    bettorplays247
// @version      1.0
// @description  Capture bettorjuice365 Get_LeagueLines2 odds responses from your own logged-in browser session and forward them to your bettorplays247 ingest endpoint for shadow comparison. Reads only what the site already fetches — no extra requests, no password.
// @match        https://bettorjuice365.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      www.bettorplays247.com
// ==/UserScript==

(function () {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────────────────
  // Must match DGS_INGEST_SECRET in your VPS .env. Change both together.
  const INGEST_URL = 'https://www.bettorplays247.com/api/dgs/ingest';
  const SECRET     = 'CHANGE_ME_TO_MATCH_ENV';
  // Only forward responses whose URL contains one of these (the odds feed).
  const WANTED = ['Get_LeagueLines2'];
  // Don't re-send an identical payload within this window (ms).
  const DEDUP_MS = 4000;
  // ──────────────────────────────────────────────────────────────────────

  const lastSent = new Map(); // key -> {ts, hash}

  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return h;
  }

  function wanted(url) {
    return typeof url === 'string' && WANTED.some((w) => url.includes(w));
  }

  function forward(url, bodyText) {
    if (!bodyText || bodyText[0] !== '{') return;
    const key = WANTED.find((w) => url.includes(w)) || url;
    const h = hash(bodyText);
    const prev = lastSent.get(key);
    const now = Date.now();
    if (prev && prev.hash === h && now - prev.ts < DEDUP_MS) return; // skip dup
    lastSent.set(key, { ts: now, hash: h });

    GM_xmlhttpRequest({
      method: 'POST',
      url: INGEST_URL,
      headers: { 'Content-Type': 'application/json', 'X-DGS-Secret': SECRET },
      data: bodyText,
      onload: (r) => console.debug('[dgs-harvest] sent', key, r.status, r.responseText),
      onerror: (e) => console.warn('[dgs-harvest] send failed', e),
    });
  }

  // ── hook fetch ────────────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    const url = (args[0] && args[0].url) || args[0];
    return _fetch.apply(this, args).then((res) => {
      try {
        if (wanted(url)) res.clone().text().then((t) => forward(String(url), t)).catch(() => {});
      } catch (_) {}
      return res;
    });
  };

  // ── hook XHR ──────────────────────────────────────────────────────────
  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__dgsUrl = url;
    return _open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...a) {
    this.addEventListener('load', function () {
      try {
        if (wanted(this.__dgsUrl)) {
          const t = typeof this.responseText === 'string' ? this.responseText : '';
          forward(String(this.__dgsUrl), t);
        }
      } catch (_) {}
    });
    return _send.apply(this, a);
  };

  console.info('[dgs-harvest] active — capturing', WANTED.join(', '), '→', INGEST_URL);
})();
