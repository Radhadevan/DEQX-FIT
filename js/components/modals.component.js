/**
 * DEQX FIT - Modals Component
 * Fresh Start onboarding setup modal, Reset confirmation modal, target completion map modal.
 */

(function (window) {
  'use strict';

  /* ===== ONBOARDING / FRESH START SETUP CONTROLLERS ===== */
  const checkOnboardingStatus = () => {
    const d = window.d;
    if (!d) return;
    if (!d.onboarded || !d.name || !d.weight) {
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
    const genderSelect = document.getElementById('onboardGender');
    const heightInput = document.getElementById('onboardHeight');
    const curWInput = document.getElementById('onboardCurrentWeight');
    const goalWInput = document.getElementById('onboardTargetWeight');

    const protInput = document.getElementById('onboardProtein');
    const calInput = document.getElementById('onboardCalories');
    const waterInput = document.getElementById('onboardWater');
    const burnInput = document.getElementById('onboardBurn');

    if (nameInput) {
      nameInput.value = d.name || '';
      setTimeout(() => nameInput.focus(), 250);
    }
    if (ageInput) ageInput.value = d.age || '';
    if (genderSelect) genderSelect.value = d.gender || '';
    if (heightInput) heightInput.value = (d.height !== undefined && d.height !== null) ? d.height : '';
    if (curWInput) curWInput.value = d.weight ? Number(d.weight) : '';
    if (goalWInput) goalWInput.value = d.goalWeight ? Number(d.goalWeight) : '';

    if (protInput) protInput.value = d.proteinTarget || 150;
    if (calInput) calInput.value = d.calorieTarget || 2200;
    if (waterInput) waterInput.value = d.waterTarget || 3.0;
    if (burnInput) burnInput.value = d.burnTarget || 500;

    // Show close button only if user has already onboarded
    const closeBtn = document.getElementById('onboardCloseBtn');
    if (closeBtn) {
      closeBtn.style.display = (d.onboarded && d.name && d.weight) ? 'flex' : 'none';
    }

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
      errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert(msg);
    }
  };

  const submitOnboarding = () => {
    const d = window.d;
    if (!d) return;

    const nameEl = document.getElementById('onboardName');
    const ageEl = document.getElementById('onboardAge');
    const genderEl = document.getElementById('onboardGender');
    const heightEl = document.getElementById('onboardHeight');
    const curWEl = document.getElementById('onboardCurrentWeight');
    const goalWEl = document.getElementById('onboardTargetWeight');

    const protEl = document.getElementById('onboardProtein');
    const calEl = document.getElementById('onboardCalories');
    const waterEl = document.getElementById('onboardWater');
    const burnEl = document.getElementById('onboardBurn');

    const name = (nameEl?.value || '').trim();
    const age = parseInt(ageEl?.value, 10);
    const gender = (genderEl?.value || '').trim();
    const height = parseFloat(heightEl?.value);
    const curW = parseFloat(curWEl?.value);
    const goalW = parseFloat(goalWEl?.value);

    const protVal = parseFloat(protEl?.value);
    const calVal = parseFloat(calEl?.value);
    const waterVal = parseFloat(waterEl?.value);
    const burnVal = parseFloat(burnEl?.value);

    // Strict validation of all required fields
    if (!name) return showOnboardError('Please enter your name.');
    if (isNaN(age) || age < 10 || age > 120) return showOnboardError('Please enter a valid age between 10 and 120 years.');
    if (!gender || !['Male', 'Female', 'Prefer not to say'].includes(gender)) return showOnboardError('Please select a gender option.');
    if (isNaN(height) || height < 50 || height > 260) return showOnboardError('Please enter a valid height (50 - 260 cm).');
    if (isNaN(curW) || curW < 20 || curW > 300) return showOnboardError('Please enter a realistic current weight (20 - 300 kg).');
    if (isNaN(goalW) || goalW < 20 || goalW > 300) return showOnboardError('Please enter a realistic goal weight (20 - 300 kg).');

    if (isNaN(protVal) || protVal < 20 || protVal > 400) return showOnboardError('Please enter a protein target between 20g and 400g.');
    if (isNaN(calVal) || calVal < 500 || calVal > 6000) return showOnboardError('Please enter a calorie target between 500 and 6,000 kcal.');
    if (isNaN(waterVal) || waterVal < 0.5 || waterVal > 10) return showOnboardError('Please enter a daily water target between 0.5L and 10L.');
    if (isNaN(burnVal) || burnVal < 100 || burnVal > 3000) return showOnboardError('Please enter a daily burn target between 100 and 3,000 kcal.');

    // Save profile state
    d.name = name;
    d.age = age;
    d.gender = gender;
    d.height = height;
    d.weight = curW;
    d.startWeight = curW;
    d.goalWeight = goalW;
    d.proteinTarget = protVal;
    d.calorieTarget = calVal;
    d.waterTarget = waterVal;
    d.burnTarget = burnVal;

    // Initialize fresh daily record and clean tracking state
    const todayStr = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    d.date = todayStr;
    d.foods = [];
    d.water = 0;
    d.spent = 0;
    d.workout = '';
    d.xp = 0;
    d.attendanceStreak = 0;
    d.streakStartDate = todayStr;
    d.lastAttendanceDate = todayStr;
    d.lastQualifiedDate = null;
    d.rewardDays = {};
    d.streakHistory = {};
    d.achievements = {};
    d.dailyRecords = {};
    d.timeline = [];
    d.history = [{ date: todayStr, weight: curW }];

    // Reset v9 activity and gamification state
    const v9 = window.v9 || {};
    v9.activity = null;
    v9.burned = 0;
    v9.streak = 0;
    v9.lastWorkout = null;
    v9.lastActivityDate = null;
    v9.xp = 0;
    v9.level = 1;
    window.v9 = v9;

    d.onboarded = true;

    // Save state locally
    window.save(true);
    window.saveV9();

    // If authenticated in Supabase, update Supabase profile & sync
    if (typeof window.cloudSyncNow === 'function') {
      window.cloudSyncNow();
    }

    // Close setup modal
    closeOnboardingModal();

    // Populate profile inputs and update views
    if (typeof window.fillProfile === 'function') window.fillProfile();
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderV9 === 'function') window.renderV9();
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();

    // Show success feedback
    if (typeof window.toast === 'function') {
      window.toast("You're all set ✓ — Your new fitness journey has started.");
    }

    // Automatically navigate to Home
    if (typeof window.show === 'function') {
      window.show('home');
    }
  };

  /* ===== RESET CONFIRMATION MODAL CONTROLLERS ===== */
  const openResetConfirmModal = () => {
    const modal = document.getElementById('resetConfirmModal');
    if (modal) {
      modal.classList.add('show');
    } else if (confirm('Reset all fitness data?\n\nYour food, activity, workout, weight history, XP, streak and progress will be cleared. Your account will NOT be deleted.')) {
      confirmResetAllData();
    }
  };

  const closeResetConfirmModal = () => {
    const modal = document.getElementById('resetConfirmModal');
    if (modal) modal.classList.remove('show');
  };

  const confirmResetAllData = () => {
    closeResetConfirmModal();

    // 1. Reset Supabase tracking tables if connected (preserves auth account & session)
    if (typeof window.cloudResetUserTables === 'function') {
      window.cloudResetUserTables();
    }

    // 2. Remove tracking storage keys (preserve Supabase auth session token)
    const keysToRemove = [
      'fitRadhadevanV8',
      'fitRadhadevanV7',
      'fitRadhadevanV6',
      'fitRadhadevanV5',
      'fitRadhadevanV4',
      'fitRadhadevanV3',
      'fitRadhadevanV2',
      'fitRadhadevan',
      'deqxFitV9',
      'deqx_food_draft'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Clear temporary food draft
    if (typeof window.clearFoodDraft === 'function') {
      try { window.clearFoodDraft(); } catch (e) {}
    }

    // 3. Initialize fresh blank state
    const todayIso = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    const fresh = window.cloneInitial ? window.cloneInitial() : {};
    fresh.onboarded = false;
    fresh.name = '';
    fresh.age = '';
    fresh.gender = '';
    fresh.height = null;
    fresh.weight = null;
    fresh.startWeight = null;
    fresh.goalWeight = null;
    fresh.proteinTarget = 150;
    fresh.waterTarget = 3;
    fresh.calorieTarget = 2200;
    fresh.burnTarget = 500;
    fresh.budgetTarget = 250;
    fresh.foods = [];
    fresh.history = [];
    fresh.water = 0;
    fresh.spent = 0;
    fresh.workout = '';
    fresh.xp = 0;
    fresh.rewardDays = {};
    fresh.workoutHistory = {};
    fresh.workoutOverrides = {};
    fresh.workoutSets = {};
    fresh.workoutChecklist = {};
    fresh.personalRecords = {};
    fresh.exerciseHistory = {};
    fresh.customFoods = [];
    fresh.customActivities = [];
    fresh.attendanceStreak = 0;
    fresh.streakStartDate = todayIso;
    fresh.streakHistory = {};
    fresh.lastAttendanceDate = todayIso;
    fresh.lastQualifiedDate = null;
    fresh.dailyRecords = {};
    fresh.timeline = [];
    fresh.achievements = {};

    window.d = fresh;
    if (window.DEQX && window.DEQX.state) {
      window.DEQX.state.d = fresh;
    }
    localStorage.setItem(window.KEY || 'fitRadhadevanV8', JSON.stringify(fresh));

    // 4. Reset v9 state
    const freshV9 = {
      activity: null,
      burned: 0,
      streak: 0,
      lastWorkout: null,
      lastActivityDate: null,
      xp: 0,
      level: 1
    };
    window.v9 = freshV9;
    if (window.DEQX && window.DEQX.state) {
      window.DEQX.state.v9 = freshV9;
    }
    localStorage.setItem(window.V9KEY || 'deqxFitV9', JSON.stringify(freshV9));

    // 5. Re-render UI to clean state
    if (typeof window.fillProfile === 'function') window.fillProfile();
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderV9 === 'function') window.renderV9();
    if (typeof window.renderFoodDraft === 'function') window.renderFoodDraft();
    if (typeof window.renderFoodList === 'function') window.renderFoodList();
    if (typeof window.renderProgress === 'function') window.renderProgress();
    if (typeof window.renderHomeTimeline === 'function') window.renderHomeTimeline();
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();

    // 6. Open dedicated "FRESH START" onboarding screen immediately (DO NOT go to Home first)
    openOnboardingModal();
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
    const todayIso = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    const done = !!(d.workoutHistory && d.workoutHistory[todayIso]?.completed);

    const pct = (v, t) => Math.min(100, Math.round(((Number(v) || 0) / Math.max(1, Number(t) || 1)) * 100));
    const burnTarget = Number(d.burnTarget) || 500;
    const pp = pct(p, d.proteinTarget);
    const wp = pct(d.water, d.waterTarget);
    const cp = pct(c, d.calorieTarget);
    const bp = pct(burn, burnTarget);
    const gp = done ? 100 : 0;
    const daily = Math.round((pp + wp + cp + bp + gp) / 5);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('tmOverallPct', daily + '%');
    set('tmDate', window.todayLabel ? window.todayLabel() : todayIso);

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
    updateTile('tmBurn', Math.round(burn), burnTarget, 'kcal', bp, bp >= 100);
    updateTile('tmWorkout', done ? 'Completed' : 'Pending', '1 Session', '', gp, done);
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.modals = {
    checkOnboardingStatus,
    openOnboardingModal,
    closeOnboardingModal,
    openFreshStartScreen: openOnboardingModal,
    closeFreshStartScreen: closeOnboardingModal,
    showOnboardError,
    submitOnboarding,
    openResetConfirmModal,
    closeResetConfirmModal,
    confirmResetAllData,
    openTargetMapModal,
    closeTargetMapModal,
    renderTargetMap
  };

  // Global backward compatibility
  window.checkOnboardingStatus = checkOnboardingStatus;
  window.openOnboardingModal = openOnboardingModal;
  window.closeOnboardingModal = closeOnboardingModal;
  window.openFreshStartScreen = openOnboardingModal;
  window.closeFreshStartScreen = closeOnboardingModal;
  window.showOnboardError = showOnboardError;
  window.submitOnboarding = submitOnboarding;
  window.openResetConfirmModal = openResetConfirmModal;
  window.closeResetConfirmModal = closeResetConfirmModal;
  window.confirmResetAllData = confirmResetAllData;
  window.openTargetMapModal = openTargetMapModal;
  window.closeTargetMapModal = closeTargetMapModal;
  window.renderTargetMap = renderTargetMap;

})(window);
