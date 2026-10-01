/**
 * DEQX FIT - Core State Management
 * Persistent localStorage state, synchronization, lifecycle checks.
 */

(function (window) {
  'use strict';

  const KEY = 'fitRadhadevanV7';
  const V9KEY = 'deqxFitV9';

  const INITIAL = {
    name: '',
    age: '',
    weight: null,
    goalWeight: null,
    startWeight: null,
    proteinTarget: 150,
    waterTarget: 3,
    calorieTarget: 2200,
    budgetTarget: 250,
    foods: [],
    history: [],
    water: 0,
    workout: '',
    spent: 0,
    date: window.today ? window.today() : new Date().toISOString().slice(0, 10),
    xp: 0,
    rewardDays: {},
    workoutHistory: {},
    workoutOverrides: {},
    customFoods: [],
    customActivities: [],
    attendanceStreak: 0,
    streakStartDate: window.today ? window.today() : new Date().toISOString().slice(0, 10),
    streakHistory: {},
    lastAttendanceDate: window.today ? window.today() : new Date().toISOString().slice(0, 10),
    onboarded: true
  };

  let d = JSON.parse(
    localStorage.getItem(KEY) ||
    localStorage.getItem('fitRadhadevanV6') ||
    localStorage.getItem('fitRadhadevanV5') ||
    localStorage.getItem('fitRadhadevanV4') ||
    localStorage.getItem('fitRadhadevanV3') ||
    localStorage.getItem('fitRadhadevanV2') ||
    localStorage.getItem('fitRadhadevan') ||
    'null'
  ) || JSON.parse(JSON.stringify(INITIAL));

  d.name = d.name || '';
  d.age = d.age || '';
  d.startWeight = Number(d.startWeight) || (d.history && d.history.length ? Number(d.history[0].weight) : null) || Number(d.weight) || null;
  d.onboarded = true;

  d.workoutAnchor = d.workoutAnchor || { date: '2026-09-30', split: 'Leg Day' };
  if (!d.workoutAnchor.split || d.workoutAnchor.split === 'Back + Biceps' || d.workoutAnchor.split === 'Shoulders + Forearms') {
    d.workoutAnchor = { date: window.today ? window.today() : '2026-09-30', split: 'Leg Day' };
  }
  d.workoutOverrides = d.workoutOverrides || {};
  d.foods = d.foods || [];
  d.customFoods = d.customFoods || [];
  d.customActivities = d.customActivities || [];

  // V9 Activity & Streak State
  let v9 = JSON.parse(localStorage.getItem(V9KEY) || 'null') || {
    activity: null,
    burned: 0,
    streak: 0,
    lastWorkout: null,
    xp: 0,
    level: 1
  };

  const cloneInitial = () => JSON.parse(JSON.stringify(INITIAL));

  const save = (doRender = true) => {
    localStorage.setItem(KEY, JSON.stringify(d));
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
    if (doRender && typeof window.render === 'function') {
      window.render();
    }
  };

  const saveV9 = () => {
    localStorage.setItem(V9KEY, JSON.stringify(v9));
  };

  const ensureTodayState = () => {
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    if (d.date !== t) {
      if (d.weight) {
        d.history = d.history || [];
        const exists = d.history.some(x => x.date === d.date);
        if (!exists) {
          d.history.push({ date: d.date, weight: d.weight });
          d.history = d.history.slice(-30);
        }
      }
      d.date = t;
      d.foods = [];
      d.water = 0;
      d.spent = 0;
      d.workout = '';
      if (v9.lastActivityDate !== t) {
        v9.burned = 0;
      }
      saveV9();
      save(false);
    }
  };

  const refreshForDateChange = () => {
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    if (d.date !== t) {
      ensureTodayState();
      if (typeof window.render === 'function') window.render();
      if (typeof window.renderV9 === 'function') window.renderV9();
    }
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.state = {
    KEY,
    V9KEY,
    INITIAL,
    get d() { return d; },
    set d(val) { d = val; window.d = val; },
    get v9() { return v9; },
    set v9(val) { v9 = val; window.v9 = val; },
    cloneInitial,
    save,
    saveV9,
    ensureTodayState,
    refreshForDateChange
  };

  // Global backward compatibility
  window.KEY = KEY;
  window.V9KEY = V9KEY;
  window.INITIAL = INITIAL;
  window.d = d;
  window.v9 = v9;
  window.cloneInitial = cloneInitial;
  window.save = save;
  window.saveV9 = saveV9;
  window.ensureTodayState = ensureTodayState;
  window.refreshForDateChange = refreshForDateChange;

})(window);
