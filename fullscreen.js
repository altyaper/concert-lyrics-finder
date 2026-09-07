export function createFullscreenController({ applyActive, requestNative, exitNative, hasNativeElement }) {
  let active = false;
  let nativeSession = false;
  let pendingRequest = null;
  let pendingExit = null;

  function setActive(next) {
    if (active === next) return;
    active = next;
    applyActive(active);
  }

  function exitNativeSafely() {
    if (pendingExit) return pendingExit;
    const operation = Promise.resolve()
      .then(() => exitNative())
      .catch(() => {});
    const tracked = operation.finally(() => {
      if (pendingExit === tracked) pendingExit = null;
    });
    pendingExit = tracked;
    return tracked;
  }

  function enter() {
    setActive(true);

    if (pendingExit) {
      const exiting = pendingExit;
      return exiting.then(() => {
        nativeSession = false;
        return { native: false };
      });
    }
    if (nativeSession || hasNativeElement()) {
      nativeSession = true;
      return Promise.resolve({ native: true });
    }
    if (pendingRequest) return pendingRequest;

    let request;
    try {
      request = Promise.resolve(requestNative());
    } catch (error) {
      request = Promise.reject(error);
    }

    const attempt = request.then(async native => {
      const enteredNative = Boolean(native) && hasNativeElement();
      if (!active) {
        if (enteredNative) await exitNativeSafely();
        return { native: false };
      }
      nativeSession = enteredNative;
      return { native: nativeSession };
    }, () => {
      nativeSession = false;
      return { native: false };
    });

    pendingRequest = attempt;
    void attempt.finally(() => {
      if (pendingRequest === attempt) pendingRequest = null;
    });
    return attempt;
  }

  async function exit() {
    const shouldExitNative = nativeSession || hasNativeElement();
    nativeSession = false;
    setActive(false);
    if (shouldExitNative) await exitNativeSafely();
    return { native: false };
  }

  function toggle() {
    return active ? exit() : enter();
  }

  function handleNativeChange() {
    if (hasNativeElement()) {
      if (active && !pendingExit) nativeSession = true;
      else void exitNativeSafely();
      return;
    }

    if (pendingExit) {
      nativeSession = false;
      return;
    }

    const wasNative = nativeSession;
    nativeSession = false;
    if (wasNative && active) {
      setActive(false);
    }
  }

  return {
    enter,
    exit,
    toggle,
    handleNativeChange,
    isActive: () => active
  };
}
