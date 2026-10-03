/**
 * DEQX FIT - Real-Time Multi-Device Sync Engine
 * Synchronizes changes between Laptop and Phone in real-time without infinite loops or page reloads.
 */

(function (window) {
  'use strict';

  const STORAGE_VERSION_KEY = 'deqx_live_sync_version';
  const CLIENT_ID_KEY = 'deqx_live_client_id';

  // Unique client ID per browser instance/tab
  let clientId = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = 'dev_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
    sessionStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const deviceType = isMobile ? 'phone' : 'laptop';

  let localVersion = Number(localStorage.getItem(STORAGE_VERSION_KEY) || 0);
  let isApplyingRemoteSync = false;
  let isPushing = false;
  let pushTimer = null;
  let pollIntervalId = null;
  let lastKnownHash = '';

  const computeStateHash = (d, v9) => {
    try {
      return JSON.stringify({
        date: d?.date,
        weight: d?.weight,
        water: d?.water,
        spent: d?.spent,
        workout: d?.workout,
        foodsCount: d?.foods?.length,
        foods: d?.foods,
        workoutHistory: d?.workoutHistory,
        workoutChecklist: d?.workoutChecklist,
        xp: d?.xp,
        historyCount: d?.history?.length,
        burned: v9?.burned,
        activity: v9?.activity
      });
    } catch {
      return '';
    }
  };

  const getBaseSyncUrl = () => {
    const loc = window.location;
    if (loc.port === '8080' || !loc.port) {
      return '/api/sync';
    }
    // Fallback if accessed via a different port on the same host
    return `${loc.protocol}//${loc.hostname}:8080/api/sync`;
  };

  const updateSyncIndicator = (status, text) => {
    const badge = document.getElementById('liveSyncBadge');
    if (!badge) return;
    badge.className = `liveSyncBadge ${status || ''}`;
    const txtEl = document.getElementById('liveSyncText');
    if (txtEl) txtEl.textContent = text || 'Live Sync';
  };

  /**
   * Push local modifications to server
   */
  const pushSync = (immediate = false) => {
    if (isApplyingRemoteSync) return;

    clearTimeout(pushTimer);
    const delay = immediate ? 0 : 400;

    pushTimer = setTimeout(async () => {
      if (isPushing || isApplyingRemoteSync) return;

      const currentHash = computeStateHash(window.d, window.v9);
      if (currentHash === lastKnownHash && lastKnownHash !== '') {
        return; // State has not changed, skip redundant network call
      }

      isPushing = true;
      updateSyncIndicator('syncing', 'Syncing…');

      try {
        const newVersion = Date.now();
        const payload = {
          version: newVersion,
          client: clientId,
          device: deviceType,
          d: window.d,
          v9: window.v9
        };

        const res = await fetch(getBaseSyncUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': clientId
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          localVersion = resData.version || newVersion;
          localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));
          lastKnownHash = currentHash;
          updateSyncIndicator('online', '');
        } else {
          updateSyncIndicator('', '');
        }
      } catch (err) {
        updateSyncIndicator('', '');
      } finally {
        isPushing = false;
      }
    }, delay);
  };

  /**
   * Pull updated data from server and apply to active app
   */
  const pullSync = async () => {
    if (isPushing || isApplyingRemoteSync) return;

    try {
      const res = await fetch(getBaseSyncUrl(), {
        headers: {
          'X-Client-Id': clientId,
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.d) return;

      // Don't apply if sent by this exact client
      if (data.client === clientId) {
        if (data.version && data.version > localVersion) {
          localVersion = data.version;
          localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));
        }
        return;
      }

      const remoteHash = computeStateHash(data.d, data.v9);
      if (remoteHash === lastKnownHash && lastKnownHash !== '') {
        localVersion = Math.max(localVersion, Number(data.version) || 0);
        localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));
        return;
      }

      console.log(`[DEQX LIVE SYNC] Applying remote update from ${data.device || 'device'}`);

      isApplyingRemoteSync = true;
      localVersion = Number(data.version) || Date.now();
      localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));
      lastKnownHash = remoteHash;

      // Update in-memory state
      window.d = data.d;
      if (data.v9) window.v9 = data.v9;

      // Persist to local device storage
      if (window.KEY) localStorage.setItem(window.KEY, JSON.stringify(window.d));
      if (window.V9KEY && window.v9) localStorage.setItem(window.V9KEY, JSON.stringify(window.v9));

      // Re-render UI views smoothly without reloading the page
      if (typeof window.render === 'function') window.render();
      if (typeof window.renderCalendar === 'function') window.renderCalendar();
      if (typeof window.renderV9 === 'function') window.renderV9();
      if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
      if (typeof window.updateSpendRing === 'function') window.updateSpendRing();

      if (window.DEQX?.components?.workout?.renderWorkoutVisualization) {
        window.DEQX.components.workout.renderWorkoutVisualization();
      }

      updateSyncIndicator('active-pulse', `Updated from ${data.device || 'laptop'}`);
      setTimeout(() => updateSyncIndicator('online', 'Live Sync Active'), 2500);

      const senderLabel = data.device === 'laptop' ? 'laptop' : 'phone';
      if (typeof window.toast === 'function') {
        window.toast(`⚡ Data updated from ${senderLabel} ✓`);
      }

    } catch (err) {
      console.warn('[DEQX LIVE SYNC] Pull error:', err);
    } finally {
      setTimeout(() => {
        isApplyingRemoteSync = false;
      }, 200);
    }
  };

  /**
   * Fast version check
   */
  const checkVersion = async () => {
    if (isPushing || isApplyingRemoteSync) return;
    try {
      const verUrl = getBaseSyncUrl() + '/version';
      const res = await fetch(verUrl, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data && data.version && data.version > localVersion) {
        await pullSync();
      }
    } catch (e) {
      // Server offline or network idle
    }
  };

  /**
   * Start 2-second polling loop
   */
  const startSyncPolling = () => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(checkVersion, 2000);
  };

  /**
   * Initialize sync engine
   */
  const initSync = async () => {
    lastKnownHash = computeStateHash(window.d, window.v9);

    // Initial check: if server has newer data, pull it
    try {
      const res = await fetch(getBaseSyncUrl(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.d && data.version && data.version > localVersion && data.client !== clientId) {
          await pullSync();
        }
      }
    } catch (e) {}

    startSyncPolling();

    // Check on focus / phone screen wake
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    });

    // Hook into window.save
    const originalSave = window.save;
    window.save = function (doRender = true) {
      if (typeof originalSave === 'function') originalSave(doRender);
      if (!isApplyingRemoteSync) {
        pushSync(false);
      }
    };

    const originalSaveV9 = window.saveV9;
    window.saveV9 = function () {
      if (typeof originalSaveV9 === 'function') originalSaveV9();
      if (!isApplyingRemoteSync) {
        pushSync(false);
      }
    };
  };

  const resetSyncState = async () => {
    clearTimeout(pushTimer);
    isPushing = false;
    isApplyingRemoteSync = false;
    lastKnownHash = '';
    localVersion = Date.now();
    try {
      localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));
    } catch (e) {}

    try {
      await fetch(getBaseSyncUrl() + '/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId
        }
      });
    } catch (e) {}

    try {
      await pushSync(true);
    } catch (e) {}
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.sync = {
    clientId,
    deviceType,
    pushSync,
    pullSync,
    checkVersion,
    initSync,
    resetSyncState,
    updateSyncIndicator
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSync);
  } else {
    initSync();
  }

})(window);
