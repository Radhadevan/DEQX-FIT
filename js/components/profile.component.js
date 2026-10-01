/**
 * DEQX FIT - Profile Component
 * User profile settings, target macro goals, weight history, and application reset.
 */

(function (window) {
  'use strict';

  const fillProfile = () => {
    const d = window.d;
    if (!d) return;
    const setVal = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };

    setVal('name', d.name || '');
    setVal('age', d.age || '');
    setVal('weight', d.weight || '');
    setVal('goalWeight', d.goalWeight || '');
    setVal('startWeight', d.startWeight || '');
    setVal('proteinTarget', d.proteinTarget || 150);
    setVal('waterTarget', d.waterTarget || 3);
    setVal('calorieTarget', d.calorieTarget || 2200);
    setVal('budgetTarget', d.budgetTarget || 250);

    const intSel = document.getElementById('workoutIntensity');
    if (intSel && d.workoutIntensity) intSel.value = d.workoutIntensity;
    const durInp = document.getElementById('workoutMinutes');
    if (durInp && d.workoutDuration) durInp.value = d.workoutDuration;
  };

  const saveProfile = () => {
    const d = window.d;
    if (!d) return;

    d.name = document.getElementById('name')?.value.trim() || '';
    d.age = document.getElementById('age')?.value.trim() || '';
    const w = parseFloat(document.getElementById('weight')?.value);
    const gw = parseFloat(document.getElementById('goalWeight')?.value);
    const sw = parseFloat(document.getElementById('startWeight')?.value);
    const pt = parseFloat(document.getElementById('proteinTarget')?.value);
    const wt = parseFloat(document.getElementById('waterTarget')?.value);
    const ct = parseFloat(document.getElementById('calorieTarget')?.value);
    const bt = parseFloat(document.getElementById('budgetTarget')?.value);

    if (!isNaN(w)) d.weight = w;
    if (!isNaN(gw)) d.goalWeight = gw;
    if (!isNaN(sw)) d.startWeight = sw;
    if (!isNaN(pt)) d.proteinTarget = pt;
    if (!isNaN(wt)) d.waterTarget = wt;
    if (!isNaN(ct)) d.calorieTarget = ct;
    if (!isNaN(bt)) d.budgetTarget = bt;

    window.save(true);
    window.savedFeedback('Profile details saved', 'profile');
  };

  const saveDailyEdits = () => {
    const d = window.d;
    if (!d) return;
    const w = parseFloat(document.getElementById('editWater')?.value);
    const s = parseFloat(document.getElementById('editSpent')?.value);
    const wo = document.getElementById('editWorkout')?.value.trim();

    if (!isNaN(w)) d.water = Math.max(0, w);
    if (!isNaN(s)) d.spent = Math.max(0, s);
    if (wo !== undefined) d.workout = wo;

    window.save(true);
    window.savedFeedback('Daily totals updated', 'profile');
  };

  const saveWeight = () => {
    const d = window.d;
    if (!d) return;
    const inp = document.getElementById('weightInput');
    const v = parseFloat(inp?.value);
    if (isNaN(v) || v <= 0) {
      window.toast('Please enter a valid weight.');
      return;
    }
    d.weight = v;
    d.history = d.history || [];
    const t = window.today();
    const ex = d.history.find(x => x.date === t);
    if (ex) {
      ex.weight = v;
    } else {
      d.history.push({ date: t, weight: v });
      d.history = d.history.slice(-30);
    }
    inp.value = '';
    window.save(true);
    window.savedFeedback(`Weight logged: ${v} kg`, 'profile');
  };

  const clearWeightHistory = () => {
    const d = window.d;
    if (!d) return;
    if (!confirm('Are you sure you want to clear your weight history log?')) return;
    d.history = [];
    window.save(true);
    window.toast('Weight history cleared.');
  };

  const removeWeightEntry = (idx) => {
    const d = window.d;
    if (!d || !d.history || idx < 0 || idx >= d.history.length) return;
    d.history.splice(idx, 1);
    window.save(true);
    window.toast('Weight entry removed');
  };

  const resetApp = () => {
    if (!confirm('Are you sure you want to reset DEQX FIT? All logged workouts, food, and settings will be cleared.')) return;

    const d = window.d;
    const preservedCustomFoods = (d && d.customFoods) ? JSON.parse(JSON.stringify(d.customFoods)) : [];
    const preservedCustomActivities = (d && d.customActivities) ? JSON.parse(JSON.stringify(d.customActivities)) : [];

    const newD = window.cloneInitial ? window.cloneInitial() : {};
    newD.customFoods = preservedCustomFoods;
    newD.customActivities = preservedCustomActivities;
    newD.onboarded = true;
    window.d = newD;

    const v9 = window.v9;
    if (v9) {
      v9.activity = null;
      v9.burned = 0;
      v9.streak = 0;
      v9.lastWorkout = null;
      v9.lastActivityDate = null;
      v9.xp = 0;
      v9.level = 1;
      window.saveV9();
    }

    localStorage.setItem(window.KEY, JSON.stringify(window.d));
    localStorage.removeItem('deqx_food_draft');
    ['fitRadhadevanV6', 'fitRadhadevanV5', 'fitRadhadevanV4', 'fitRadhadevanV3', 'fitRadhadevanV2', 'fitRadhadevan'].forEach(k => localStorage.removeItem(k));

    document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
    document.getElementById('home')?.classList.add('active');
    document.getElementById('n-home')?.classList.add('active');

    if (typeof window.renderQuickFoodGrid === 'function') window.renderQuickFoodGrid();
    if (typeof window.renderCustomFoods === 'function') window.renderCustomFoods();
    if (typeof window.renderActivityChoices === 'function') window.renderActivityChoices();
    if (typeof window.renderCustomActivities === 'function') window.renderCustomActivities();
    if (typeof window.renderFoodDraft === 'function') window.renderFoodDraft();
    if (typeof window.render === 'function') window.render();
    if (typeof window.renderV9 === 'function') window.renderV9();
    fillProfile();

    if (typeof window.openOnboardingModal === 'function') window.openOnboardingModal();
    window.toast('DEQX FIT has been reset. Please set up your profile.');
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.profile = {
    fillProfile,
    saveProfile,
    saveDailyEdits,
    saveWeight,
    clearWeightHistory,
    removeWeightEntry,
    resetApp
  };

  // Global backward compatibility
  window.fillProfile = fillProfile;
  window.saveProfile = saveProfile;
  window.saveDailyEdits = saveDailyEdits;
  window.saveWeight = saveWeight;
  window.clearWeightHistory = clearWeightHistory;
  window.removeWeightEntry = removeWeightEntry;
  window.resetApp = resetApp;

})(window);
