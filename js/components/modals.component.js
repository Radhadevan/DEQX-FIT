/**
 * DEQX FIT - Modals Component
 * Onboarding setup modal, target completion map modal, day adjustment modal.
 */

(function (window) {
  'use strict';

  /* ===== ONBOARDING SETUP CONTROLLERS ===== */
  const checkOnboardingStatus = () => {
    const d = window.d;
    if (!d) return;
    if (!d.name && !d.weight) {
      openOnboardingModal();
    } else {
      closeOnboardingModal();
    }
  };

  const openOnboardingModal = () => {
    const modal = document.getElementById('onboardingModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.classList.add('onboarding-locked');

    const d = window.d || {};
    const nameInput = document.getElementById('onboardName');
    const ageInput = document.getElementById('onboardAge');
    const curWInput = document.getElementById('onboardCurrentWeight');
    const goalWInput = document.getElementById('onboardTargetWeight');

    if (nameInput) {
      nameInput.value = d.name || '';
      setTimeout(() => nameInput.focus(), 250);
    }
    if (ageInput) ageInput.value = d.age || '';
    if (curWInput) curWInput.value = d.weight ? Number(d.weight) : '';
    if (goalWInput) goalWInput.value = d.goalWeight ? Number(d.goalWeight) : '';

    const err = document.getElementById('onboardError');
    if (err) {
      err.style.display = 'none';
      err.textContent = '';
    }
  };

  const closeOnboardingModal = () => {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.remove('show');
    document.body.classList.remove('onboarding-locked');
  };

  const showOnboardError = (msg) => {
    const errEl = document.getElementById('onboardError');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    } else {
      alert(msg);
    }
  };

  const submitOnboarding = () => {
    const d = window.d;
    if (!d) return;
    const nameEl = document.getElementById('onboardName');
    const ageEl = document.getElementById('onboardAge');
    const curWEl = document.getElementById('onboardCurrentWeight');
    const goalWEl = document.getElementById('onboardTargetWeight');

    const name = (nameEl?.value || '').trim();
    const age = parseInt(ageEl?.value, 10);
    const curW = parseFloat(curWEl?.value);
    const goalW = parseFloat(goalWEl?.value);

    if (!name) return showOnboardError('Please enter your name.');
    if (isNaN(age) || age < 10 || age > 120) return showOnboardError('Please enter a valid age between 10 and 120.');
    if (isNaN(curW) || curW < 20 || curW > 300) return showOnboardError('Please enter a realistic current weight (20 - 300 kg).');
    if (isNaN(goalW) || goalW < 20 || goalW > 300) return showOnboardError('Please enter a realistic target weight (20 - 300 kg).');

    const waterVal = parseFloat(document.getElementById('onboardWater')?.value);
    const protVal = parseFloat(document.getElementById('onboardProtein')?.value);
    const calVal = parseFloat(document.getElementById('onboardCalories')?.value);
    const budVal = parseFloat(document.getElementById('onboardBudget')?.value);

    d.name = name;
    d.age = age;
    d.weight = curW;
    d.goalWeight = goalW;
    d.startWeight = curW;

    if (!isNaN(waterVal) && waterVal >= 0.5) d.waterTarget = waterVal;
    if (!isNaN(protVal) && protVal >= 20) d.proteinTarget = protVal;
    if (!isNaN(calVal) && calVal >= 500) d.calorieTarget = calVal;
    if (!isNaN(budVal) && budVal >= 0) d.budgetTarget = budVal;

    d.history = d.history || [];
    const todayStr = window.today();
    const exIdx = d.history.findIndex(x => x.date === todayStr);
    if (exIdx >= 0) {
      d.history[exIdx].weight = curW;
    } else {
      d.history.push({ date: todayStr, weight: curW });
    }

    d.onboarded = true;
    window.save(true);
    closeOnboardingModal();
    if (typeof window.show === 'function') window.show('home');
    window.toast(`🔥 Welcome, ${d.name}! Your profile has been initialized.`);
  };

  /* ===== TARGET MAP MODAL ===== */
  const openTargetMapModal = () => {
    const modal = document.getElementById('targetMapModal');
    if (!modal) return;
    renderTargetMap();
    modal.classList.add('show');
  };

  const closeTargetMapModal = () => {
    const modal = document.getElementById('targetMapModal');
    if (modal) modal.classList.remove('show');
  };

  const renderTargetMap = () => {
    const d = window.d;
    if (!d) return;
    const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);
    const burn = (window.v9 && window.v9.burned) || 0;
    const todayIso = window.today();
    const done = !!(d.workoutHistory && d.workoutHistory[todayIso]?.completed);

    const pct = (v, t) => Math.min(100, Math.round(((Number(v) || 0) / Math.max(1, Number(t) || 1)) * 100));
    const pp = pct(p, d.proteinTarget);
    const wp = pct(d.water, d.waterTarget);
    const cp = pct(c, d.calorieTarget);
    const bp = pct(burn, 500);
    const gp = done ? 100 : 0;
    const daily = Math.round((pp + wp + cp + bp + gp) / 5);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('tmOverallPct', daily + '%');
    set('tmDate', window.todayLabel());

    const updateTile = (idPrefix, val, target, unit, pctVal, isDone) => {
      set(idPrefix + 'Val', `${val} / ${target} ${unit}`);
      set(idPrefix + 'Pct', pctVal + '%');
      const b = document.getElementById(idPrefix + 'Bar');
      if (b) b.style.width = pctVal + '%';
      const tile = document.getElementById(idPrefix + 'Tile');
      if (tile) tile.classList.toggle('done', isDone);
    };

    updateTile('tmProtein', Math.round(p), d.proteinTarget, 'g', pp, pp >= 100);
    updateTile('tmWater', Number(d.water || 0).toFixed(1), d.waterTarget, 'L', wp, wp >= 100);
    updateTile('tmCalorie', Math.round(c), d.calorieTarget, 'kcal', cp, cp >= 100);
    updateTile('tmBurn', Math.round(burn), 500, 'kcal', bp, bp >= 100);
    updateTile('tmWorkout', done ? 'Completed' : 'Pending', '1 Session', '', gp, done);
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.modals = {
    checkOnboardingStatus,
    openOnboardingModal,
    closeOnboardingModal,
    showOnboardError,
    submitOnboarding,
    openTargetMapModal,
    closeTargetMapModal,
    renderTargetMap
  };

  // Global backward compatibility
  window.checkOnboardingStatus = checkOnboardingStatus;
  window.openOnboardingModal = openOnboardingModal;
  window.closeOnboardingModal = closeOnboardingModal;
  window.showOnboardError = showOnboardError;
  window.submitOnboarding = submitOnboarding;
  window.openTargetMapModal = openTargetMapModal;
  window.closeTargetMapModal = closeTargetMapModal;
  window.renderTargetMap = renderTargetMap;

})(window);
