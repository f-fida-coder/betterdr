import React, { useEffect, useRef, useState } from 'react';

// "Update available" banner — detects when a newer deploy is live while the
// user is still running an older cached bundle (the classic iOS-webview trap:
// the webview never re-fetches index.html on in-app navigation, so a deploy
// goes unnoticed and stale JS runs indefinitely).
//
// How it detects: the app reads the hash of the entry bundle IT ACTUALLY
// LOADED from the <script> tag in the DOM (reflects reality even when that
// bundle came from a stale cache), and compares it against a freshly-fetched
// /version.json (written at build time with the current entry hash). Mismatch
// => a newer deploy is live => show the banner.
//
// It NEVER reloads on its own — reload is always a user tap, because the
// betslip is in-memory only and a reload would wipe an in-progress slip.

// Entry hash of the bundle this document actually loaded, e.g. "index-DT8wbsMt".
const runningBuildId = () => {
  try {
    const el = document.querySelector('script[type="module"][src*="/assets/index-"]');
    const src = el?.getAttribute('src') || '';
    const m = src.match(/\/assets\/(index-[A-Za-z0-9_-]+)\.js/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

const FETCH_THROTTLE_MS = 60 * 1000;      // ignore checks fired < 60s apart (focus thrash)
const POLL_MS = 5 * 60 * 1000;            // light background poll while the tab is visible

// Module-scoped so it survives re-mounts within a session (route changes) but
// resets on a real full reload — exactly the requested nag behavior: dismissed
// stays dismissed for THIS version this session; a full reopen re-prompts.
let dismissedBuild = null;

export default function UpdateBanner() {
  const running = useRef(runningBuildId());
  const lastFetch = useRef(0);
  const [latest, setLatest] = useState(null); // build id the server currently serves
  const [, forceRender] = useState(0);

  useEffect(() => {
    // No baseline (couldn't read our own hash) → we can't reason about drift.
    if (!running.current) return;
    let alive = true;

    const check = async () => {
      const now = Date.now();
      if (now - lastFetch.current < FETCH_THROTTLE_MS) return;
      lastFetch.current = now;
      try {
        // no-store + cache-bust query so no server header change is needed and
        // no intermediary can hand back a stale version.json.
        const res = await fetch(`/version.json?_=${now}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const build = typeof data?.build === 'string' ? data.build : null;
        if (alive && build) setLatest(build);
      } catch {
        /* offline / 404 / parse error → fail silent, never disrupt the app */
      }
    };

    check(); // initial

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    const onFocus = () => check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const iv = window.setInterval(() => {
      if (document.visibilityState === 'visible') check();
    }, POLL_MS);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(iv);
    };
  }, []);

  const updateAvailable =
    !!latest && !!running.current && latest !== running.current && latest !== dismissedBuild;

  if (!updateAvailable) return null;

  const reload = () => {
    // Cache-busting full navigation: a brand-new URL forces even a stubborn
    // webview to re-request index.html (itself no-cache) → new hashed chunk
    // URLs → fresh bundle. Preserves the current route so admin stays on admin.
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('_v', latest);
      window.location.replace(u.toString());
    } catch {
      window.location.reload();
    }
  };

  const dismiss = () => {
    dismissedBuild = latest;
    forceRender((n) => n + 1);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 3000,
        width: 'max-content',
        maxWidth: 'calc(100vw - 24px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 12,
        background: '#0f172a',
        color: '#fff',
        border: '1px solid #334155',
        boxShadow: '0 10px 30px -8px rgba(0,0,0,0.45)',
        fontSize: 13,
      }}
    >
      <i className="fa-solid fa-arrows-rotate" style={{ color: '#38bdf8', fontSize: 14, flexShrink: 0 }} />
      <span style={{ fontWeight: 600 }}>Update available</span>
      <button
        type="button"
        onClick={reload}
        style={{
          border: 'none',
          background: '#16a34a',
          color: '#fff',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          padding: '6px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Reload
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 2px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
