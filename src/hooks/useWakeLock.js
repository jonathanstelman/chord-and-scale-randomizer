import { useEffect } from 'react';

/**
 * Holds a screen wake lock while `active` is true, so the display doesn't dim and the
 * machine doesn't sleep mid-session. Practising is a "watching, not touching" activity —
 * you're looking at the reading and playing an instrument, generating no input events at
 * all, which is exactly the pattern an idle timer reads as "away".
 *
 * Best-effort by design. The lock is refused outside a secure context, under battery
 * saver, and on browsers that don't implement it (Firefox only shipped it in 126) — in
 * every one of those cases the session still runs and the screen just behaves as it did
 * before, so there's nothing to report to the user.
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const held = await navigator.wakeLock.request('screen');
        // The request is async, so the session can end while it's still in flight.
        // Without this the lock outlives the session it was taken for.
        if (cancelled) {
          held.release().catch(() => {});
          return;
        }
        sentinel = held;
      } catch {
        // Refused. Nothing to recover: the screen dims as it would have anyway.
      }
    };

    // The browser drops the lock whenever the tab is hidden and does not restore it, so
    // one request per session isn't enough — switching tabs and back would silently lose
    // it for the rest of a practice session.
    const reacquireOnReturn = () => {
      if (document.visibilityState === 'visible' && !sentinel) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', reacquireOnReturn);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', reacquireOnReturn);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
