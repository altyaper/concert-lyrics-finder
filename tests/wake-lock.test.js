import test from 'node:test';
import assert from 'node:assert/strict';
import { createWakeLockManager } from '../wake-lock.js';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function lockWithRelease(releasePromise = Promise.resolve()) {
  const listeners = [];
  return {
    released: false,
    addEventListener(name, listener) { if (name === 'release') listeners.push(listener); },
    async release() {
      await releasePromise;
      this.released = true;
      for (const listener of listeners) listener();
    }
  };
}

test('resume while a paused pending lock is still releasing requests a fresh lock', async () => {
  let active = true;
  let requestCount = 0;
  const firstRequest = deferred();
  const firstRelease = deferred();
  const secondLock = lockWithRelease();
  const manager = createWakeLockManager({
    isActive: () => active,
    requestLock: async () => {
      requestCount += 1;
      return requestCount === 1 ? firstRequest.promise : secondLock;
    }
  });

  const initialAcquire = manager.acquire();
  active = false;
  await manager.release();
  const firstLock = lockWithRelease(firstRelease.promise);
  firstRequest.resolve(firstLock);
  await Promise.resolve();
  await Promise.resolve();
  active = true;
  const resumedAcquire = manager.acquire();
  assert.equal(firstLock.released, false);
  firstRelease.resolve();
  await Promise.all([initialAcquire, resumedAcquire]);

  assert.equal(firstLock.released, true);
  assert.equal(requestCount, 2);
  assert.equal(manager.hasActiveLock(), true);
});

test('an automatically released lock is reacquired while the prompter remains active', async () => {
  let active = true;
  let requestCount = 0;
  const listeners = [];
  const firstLock = {
    released: false,
    addEventListener(name, listener) { if (name === 'release') listeners.push(listener); },
    async release() { this.released = true; for (const listener of listeners) listener(); }
  };
  const secondLock = lockWithRelease();
  const manager = createWakeLockManager({
    isActive: () => active,
    requestLock: async () => (++requestCount === 1 ? firstLock : secondLock)
  });

  await manager.acquire();
  firstLock.released = true;
  for (const listener of listeners) listener();
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(requestCount, 2);
  assert.equal(manager.hasActiveLock(), true);
  active = false;
  await manager.release();
});
