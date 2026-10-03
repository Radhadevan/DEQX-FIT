/**
 * DEQX FIT - Profile Component
 * User profile settings, target macro goals, weight history, and application reset.
 */

(function (window) {
  'use strict';

  /**
   * Pre-populate all profile and target fields from state
   * Section 18: Never appear blank if user saved values previously.
   */
  const fillProfile = () => {
    const d = window.d;
    if (!d) return;

    const setVal = (id, val) => {
      const e = document.getElementById(id);
      if (e && val !== undefined && val !== null) {
        e.value = val;
      }
    };

    // User details and targets
    setVal('profileName', d.name || '');
    setVal('name', d.name || '');
    setVal('profileAge', d.age || '');
    setVal('age', d.age || '');
    setVal('profileGoal', d.goalWeight || 75);
    setVal('goalWeight', d.goalWeight || 75);
    setVal('profileProtein', d.proteinTarget || 150);
    setVal('proteinTarget', d.proteinTarget || 150);
    setVal('profileWaterTarget', d.waterTarget || 3);
    setVal('waterTarget', d.waterTarget || 3);
    setVal('profileCalories', d.calorieTarget || 2200);
    setVal('calorieTarget', d.calorieTarget || 2200);
    setVal('profileBudget', d.budgetTarget || 250);
    setVal('budgetTarget', d.budgetTarget || 250);

    // Today's editable values
    setVal('profileWeight', d.weight || '');
    setVal('weight', d.weight || '');
    setVal('profileWater', d.water || '');
    setVal('profileSpent', d.spent || '');
    setVal('profileWorkout', d.workout || '');

    const intSel = document.getElementById('workoutIntensity');
    if (intSel && d.workoutIntensity) intSel.value = d.workoutIntensity;
    const durInp = document.getElementById('workoutMinutes');
    if (durInp && d.workoutDuration) durInp.value = d.workoutDuration;
  };

  /**
   * Save user goals and targets
   */
  const saveProfile = () => {
    const d = window.d;
    if (!d) return;

    const nameVal = document.getElementById('profileName')?.value || document.getElementById('name')?.value || '';
    const ageVal = document.getElementById('profileAge')?.value || document.getElementById('age')?.value || '';
    const goalVal = parseFloat(document.getElementById('profileGoal')?.value || document.getElementById('goalWeight')?.value);
    const protVal = parseFloat(document.getElementById('profileProtein')?.value || document.getElementById('proteinTarget')?.value);
    const waterVal = parseFloat(document.getElementById('profileWaterTarget')?.value || document.getElementById('waterTarget')?.value);
    const calVal = parseFloat(document.getElementById('profileCalories')?.value || document.getElementById('calorieTarget')?.value);
    const budVal = parseFloat(document.getElementById('profileBudget')?.value || document.getElementById('budgetTarget')?.value);

    d.name = nameVal.trim();
    d.age = ageVal.trim();
    if (!isNaN(goalVal)) d.goalWeight = goalVal;
    if (!isNaN(protVal)) d.proteinTarget = protVal;
    if (!isNaN(waterVal)) d.waterTarget = waterVal;
    if (!isNaN(calVal)) d.calorieTarget = calVal;
    if (!isNaN(budVal)) d.budgetTarget = budVal;

    window.save(true);
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback('Profile targets saved & updated across all pages ✓', 'profile');
    }
  };

  /**
   * Save today's editable data (weight, water, spent, workout)
   */
  const saveDailyEdits = () => {
    const d = window.d;
    if (!d) return;

    const wVal = parseFloat(document.getElementById('profileWeight')?.value || document.getElementById('weight')?.value);
    const watVal = parseFloat(document.getElementById('profileWater')?.value || document.getElementById('editWater')?.value);
    const sVal = parseFloat(document.getElementById('profileSpent')?.value || document.getElementById('editSpent')?.value);
    const woVal = document.getElementById('profileWorkout')?.value || document.getElementById('editWorkout')?.value;

    if (!isNaN(wVal)) {
      d.weight = wVal;
      d.history = d.history || [];
      const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
      const ex = d.history.find(x => x.date === t);
      if (ex) {
        ex.weight = wVal;
      } else {
        d.history.push({ date: t, weight: wVal });
        d.history = d.history.slice(-90);
      }
    }
    if (!isNaN(watVal)) d.water = Math.max(0, watVal);
    if (!isNaN(sVal)) d.spent = Math.max(0, sVal);
    if (woVal !== undefined) d.workout = woVal.trim();

    window.save(true);
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback('Daily records updated ✓', 'profile');
    }
  };

  /**
   * Log weight entry
   */
  const saveWeight = () => {
    const d = window.d;
    if (!d) return;
    const inp = document.getElementById('weightInput') || document.getElementById('profileWeight');
    const v = parseFloat(inp?.value);
    if (isNaN(v) || v <= 0) {
      if (typeof window.toast === 'function') window.toast('Please enter a valid weight');
      return;
    }

    d.weight = v;
    d.history = d.history || [];
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    const ex = d.history.find(x => x.date === t);
    if (ex) {
      ex.weight = v;
    } else {
      d.history.push({ date: t, weight: v });
      d.history = d.history.slice(-90);
    }

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('weight', `Weight Logged`, `${v} kg`, '⚖️', 0);
    }

    window.save(true);
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Weight logged: ${v} kg`, 'profile');
    }
  };

  const removeWeightEntry = (idx) => {
    const d = window.d;
    if (!d || !d.history || idx < 0 || idx >= d.history.length) return;
    d.history.splice(idx, 1);
    if (d.history.length) {
      d.weight = Number(d.history[d.history.length - 1].weight);
    }
    window.save(true);
    if (typeof window.toast === 'function') window.toast('Weight entry removed');
  };

  const clearWeightHistory = () => {
    const d = window.d;
    if (!d) return;
    if (!confirm('Are you sure you want to clear your weight history log?')) return;
    d.history = [];
    window.save(true);
  };

  const resetApp = () => {
    if (!confirm('Are you sure you want to reset all DEQX FIT data? This will clear all data (streak, budget, workouts, weights, foods, XP) and ask for new details.')) return;

    // 1. Reset Supabase tables if connected
    if (typeof window.cloudResetUserTables === 'function') {
      window.cloudResetUserTables();
    }

    // 2. Remove all storage keys (current and legacy migration keys)
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

    // 3. Initialize fresh blank state with streak 0, budget 250, spent 0, weight null, onboarded false
    const fresh = window.cloneInitial ? window.cloneInitial() : {};
    fresh.onboarded = false;
    fresh.name = '';
    fresh.age = '';
    fresh.weight = null;
    fresh.startWeight = null;
    fresh.goalWeight = null;
    fresh.proteinTarget = 150;
    fresh.waterTarget = 3;
    fresh.calorieTarget = 2200;
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
    fresh.streakStartDate = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    fresh.streakHistory = {};
    fresh.lastAttendanceDate = window.today ? window.today() : new Date().toISOString().slice(0, 10);
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

    // 6. Switch to Home and ask for new details via onboarding modal
    if (typeof window.show === 'function') window.show('home');
    if (typeof window.openOnboardingModal === 'function') {
      window.openOnboardingModal();
    }
    if (typeof window.toast === 'function') {
      window.toast('All app data has been reset. Please enter your new details.');
    }
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.profile = {
    fillProfile,
    saveProfile,
    saveDailyEdits,
    saveWeight,
    removeWeightEntry,
    clearWeightHistory,
    resetApp
  };

  // Global backward compatibility
  window.fillProfile = fillProfile;
  window.saveProfile = saveProfile;
  window.saveDailyEdits = saveDailyEdits;
  window.saveWeight = saveWeight;
  window.removeWeightEntry = removeWeightEntry;
  window.clearWeightHistory = clearWeightHistory;
  window.resetApp = resetApp;

})(window);
