/**
 * DEQX FIT - Real-Time Multi-Device Sync Engine
 * Automatically synchronizes changes between Laptop and Phone in real-time.
 */

(function (window) {
  'use strict';

  const STORAGE_VERSION_KEY = 'deqx_live_sync_version';
  const CLIENT_ID_KEY = 'deqx_live_client_id';

  // Identify this specific browser tab/device
  let clientId = sessionStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = 'dev_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
    sessionStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const deviceType = isMobile ? 'phone' : 'laptop';

  let localVersion = Number(localStorage.getItem(STORAGE_VERSION_KEY) || 0);
  let isApplyingRemoteSync = false;
  let pushTimer = null;
  let isPushing = false;
  let pollIntervalId = null;

  // Resolve sync endpoint with cross-port fallback (e.g. if testing on Live Server port 5500 vs 8080)
  const getBaseSyncUrl = () => {
    const loc = window.location;
    if (loc.port === '8080' || !loc.port) {
      return '/api/sync';
    }
    // Fallback to port 8080 on the same host (laptop IP)
    return `${loc.protocol}//${loc.hostname}:8080/api/sync`;
  };

  /**
   * Update visual sync status pill in header
   */
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
    if (isApplyingRemoteSync) return; // Don't echo incoming syncs

    clearTimeout(pushTimer);
    const delay = immediate ? 0 : 250;

    pushTimer = setTimeout(async () => {
      if (isPushing) return;
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
          updateSyncIndicator('online', 'Live Sync Active');
        } else {
          updateSyncIndicator('', 'Local only');
        }
      } catch (err) {
        // Server might be unreachable or offline
        updateSyncIndicator('', 'Offline mode');
      } finally {
        isPushing = false;
      }
    }, delay);
  };

  /**
   * Pull updated data from server and apply to active app
   */
  const pullSync = async () => {
    if (isPushing) return;
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

      // Ignore if this client sent the data and version hasn't changed
      if (data.client === clientId && data.version <= localVersion) {
        return;
      }

      if (data.version && data.version <= localVersion && !window.__DEQX_FORCE_SYNC__) {
        return;
      }

      console.log(`[DEQX LIVE SYNC] Applying remote data from ${data.device || 'device'} (v${data.version})`);

      isApplyingRemoteSync = true;
      localVersion = data.version || Date.now();
      localStorage.setItem(STORAGE_VERSION_KEY, String(localVersion));

      // 1. Update State Objects
      window.d = data.d;
      if (data.v9) window.v9 = data.v9;

      // 2. Persist to localStorage
      if (window.KEY) localStorage.setItem(window.KEY, JSON.stringify(window.d));
      if (window.V9KEY && window.v9) localStorage.setItem(window.V9KEY, JSON.stringify(window.v9));

      // 3. Re-render all views
      if (typeof window.render === 'function') window.render();
      if (typeof window.renderCalendar === 'function') window.renderCalendar();
      if (typeof window.renderV9 === 'function') window.renderV9();
      if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
      if (typeof window.updateSpendRing === 'function') window.updateSpendRing();

      // Re-render workout visualization if workout component is present
      if (window.DEQX?.components?.workout?.renderWorkoutVisualization) {
        window.DEQX.components.workout.renderWorkoutVisualization();
      }

      updateSyncIndicator('active-pulse', `Updated from ${data.device || 'laptop'}`);
      setTimeout(() => updateSyncIndicator('online', 'Live Sync Active'), 3000);

      const senderLabel = data.device === 'laptop' ? 'laptop' : 'other device';
      if (typeof window.toast === 'function') {
        window.toast(`⚡ Real-time update from ${senderLabel} loaded ✓`);
      }

    } catch (err) {
      console.warn('[DEQX LIVE SYNC] Pull error:', err);
    } finally {
      setTimeout(() => {
        isApplyingRemoteSync = false;
      }, 100);
    }
  };

  /**
   * Fast version check to detect if another device updated data
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
      // Server not reachable or temporary network hiccup
    }
  };

  /**
   * Start 1-second auto-sync polling loop
   */
  const startSyncPolling = () => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(checkVersion, 1000); // Check every 1 second
  };

  /**
   * Initial bootstrap on page load
   */
  const initSync = async () => {
    // 1. Initial check: Does server have newer data than this device?
    try {
      const res = await fetch(getBaseSyncUrl(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.d && data.version && data.version > localVersion) {
          await pullSync();
        } else if (window.d && (!data || !data.d)) {
          // If server is empty and this device has data, seed the server
          pushSync(true);
        }
      }
    } catch (e) {
      // Server offline initially
    }

    // 2. Start fast 1-second polling loop
    startSyncPolling();

    // 3. Immediately check when tab is focused or unlocked on phone
    window.addEventListener('focus', checkVersion);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    });

    // 4. Hook into window.save to auto-broadcast
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

  // Export module
  window.DEQX = window.DEQX || {};
  window.DEQX.sync = {
    clientId,
    deviceType,
    pushSync,
    pullSync,
    checkVersion,
    initSync,
    updateSyncIndicator
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSync);
  } else {
    initSync();
  }

})(window);
