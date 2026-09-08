import { useEffect } from 'react';

/**
 * Holds a screen wake lock while `active` is true, so the machine doesn't sleep
 * mid-session. Best-effort — see docs/architecture/randomizer.md's "Keeping the screen
 * awake" for when it's refused and why that needs no handling.
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const held = await navigator.wakeLock.request('screen');
        // The request is async: without this, a lock taken for a session that has
        // already ended is never released.
        if (cancelled) {
          held.release().catch(() => {});
          return;
        }
        sentinel = held;
      } catch {
        // Refused. Nothing to recover: the screen dims as it would have anyway.
      }
    };

    // The browser drops the lock whenever the tab is hidden and never restores it, so
    // one request per session isn't enough.
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
