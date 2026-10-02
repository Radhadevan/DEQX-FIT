/**
 * DEQX FIT - Application Root Orchestrator
 * Coordinates component lifecycle, global renders, date refresh, and PWA setup.
 */

(function (window) {
  'use strict';

  /**
   * Master Render Function
   * Syncs all active component views with the latest application state.
   */
  const render = () => {
    if (typeof window.ensureTodayState === 'function') window.ensureTodayState();

    const d = window.d;
    if (!d) return;

    // Home Overview
    if (typeof window.renderHome === 'function') window.renderHome();

    // Food Views
    const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const setHtml = (id, val) => { const e = document.getElementById(id); if (e) e.innerHTML = val; };

    set('foodTotal', `${p.toFixed(1)} g protein • ${c} kcal`);
    setHtml('foodList', (d.foods && d.foods.length)
      ? d.foods.map((x, i) => `<div class="food" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>${window.esc(x.n)}</span><div style="display:flex;align-items:center;gap:10px"><span>${Number(x.p).toFixed(1)}g • ${x.c} kcal</span><button type="button" class="deleteBtn" style="padding:4px 8px;font-size:12px;background:#39201f;color:#ffb1aa;border-radius:6px;border:none;cursor:pointer;line-height:1" onclick="removeFood(${i})" title="Delete food">🗑️</button></div></div>`).join('')
      : '<p class="muted">No food logged yet.</p>'
    );

    // Profile History & Editable Food Items
    setHtml('history', (d.history && d.history.length)
      ? [...d.history].reverse().slice(0, 15).map((x, revIdx) => {
          const realIdx = d.history.length - 1 - revIdx;
          return `<div class="food" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px">
            <span>${window.esc(x.date)}</span>
            <div style="display:flex;align-items:center;gap:10px">
              <b>${x.weight} kg</b>
              <button type="button" class="deleteBtn" style="padding:2px 7px;font-size:11px;background:#39201f;color:#ffb1aa;border-radius:6px;border:none;cursor:pointer" onclick="removeWeightEntry(${realIdx})" title="Delete entry">✕</button>
            </div>
          </div>`;
        }).join('')
      : '<p class="muted" style="font-size:12px;padding:8px 0">No weight history logged yet.</p>'
    );

    setHtml('profileFoodList', (d.foods && d.foods.length)
      ? d.foods.map((x, i) => `<div class="card" style="padding:11px;margin-bottom:8px;background:#10130f"><input id="foodName${i}" value="${window.esc(x.n)}"><div class="editGrid"><input id="foodProtein${i}" type="number" step=".1" value="${x.p}"><input id="foodCalories${i}" type="number" value="${x.c}"></div><div class="editActions"><button onclick="saveFoodEdit(${i})">Save</button><button class="deleteBtn" onclick="removeFood(${i})">Remove</button></div></div>`).join('')
      : '<p class="muted">No food logged today.</p>'
    );

    const spentEl = document.getElementById('spent');
    if (spentEl) spentEl.value = d.spent || '';

    // Delegate rendering to components
    if (typeof window.fillProfile === 'function') window.fillProfile();
    if (typeof window.renderQuickFoodGrid === 'function') window.renderQuickFoodGrid();
    if (typeof window.renderCustomFoods === 'function') window.renderCustomFoods();
    if (typeof window.renderActivityChoices === 'function') window.renderActivityChoices();
    if (typeof window.renderCustomActivities === 'function') window.renderCustomActivities();
    if (typeof window.renderFoodDraft === 'function') window.renderFoodDraft();
    if (typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();
  };

  /**
   * Application Bootstrapper
   */
  const initApp = () => {
    if (typeof window.renderQuickFoodGrid === 'function') window.renderQuickFoodGrid();
    if (typeof window.renderActivityChoices === 'function') window.renderActivityChoices();
    render();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();
    if (typeof window.renderV9 === 'function') window.renderV9();
    if (typeof window.refreshForDateChange === 'function') window.refreshForDateChange();
    if (typeof window.checkOnboardingStatus === 'function') window.checkOnboardingStatus();
    if (typeof window.updateBarUnit === 'function') {
      window.updateBarUnit(document.getElementById('activityMinutes'), 'activityBarUnit');
      window.updateBarUnit(document.getElementById('workoutMinutes'), 'workoutBarUnit');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Auto date change refreshes
  window.addEventListener('focus', () => {
    if (typeof window.refreshForDateChange === 'function') window.refreshForDateChange();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof window.refreshForDateChange === 'function') {
      window.refreshForDateChange();
    }
  });
  setInterval(() => {
    if (typeof window.refreshForDateChange === 'function') window.refreshForDateChange();
  }, 30000);

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js?v=50')
      .then(reg => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.update();
      })
      .catch(() => { });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[DEQX] Service worker controller updated.');
    });
  }

  window.render = render;
  window.initApp = initApp;

})(window);
