export function createWakeLockManager({ requestLock, isActive }) {
  let currentLock = null;
  let pendingRequest = null;
  let retryAfterPending = false;

  async function acquire() {
    if (!isActive() || (currentLock && !currentLock.released)) return;
    if (pendingRequest) {
      retryAfterPending = true;
      return pendingRequest;
    }

    const attempt = (async () => {
      try {
        const requestedLock = await requestLock();
        requestedLock.addEventListener('release', () => {
          if (currentLock === requestedLock) currentLock = null;
          if (isActive()) void acquire();
        });
        if (!isActive()) {
          if (!requestedLock.released) await requestedLock.release();
          return;
        }
        currentLock = requestedLock;
      } catch {
        // Screen Wake Lock is optional and may be denied by the browser.
      }
    })();

    pendingRequest = attempt;
    await attempt;
    if (pendingRequest === attempt) pendingRequest = null;

    if (retryAfterPending) {
      retryAfterPending = false;
      if (isActive() && (!currentLock || currentLock.released)) await acquire();
    }
  }

  async function release() {
    retryAfterPending = false;
    const lock = currentLock;
    currentLock = null;
    if (lock && !lock.released) {
      try { await lock.release(); } catch { /* already released */ }
    }
  }

  return {
    acquire,
    release,
    hasActiveLock: () => Boolean(currentLock && !currentLock.released)
  };
}
