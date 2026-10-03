/**
 * DEQX FIT - Core State Management
 * Single Central Data Source of Truth across all pages.
 * Persistent localStorage state, multi-day records, timeline events, and safe migration.
 */

(function (window) {
  'use strict';

  const KEY = 'fitRadhadevanV8';
  const V9KEY = 'deqxFitV9';

  const INITIAL = {
    name: '',
    age: '',
    gender: '',
    height: null,
    weight: null,
    goalWeight: null,
    startWeight: null,
    proteinTarget: 150,
    waterTarget: 3,
    calorieTarget: 2200,
    burnTarget: 500,
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
    workoutSets: {},
    workoutChecklist: {},
    personalRecords: {},
    exerciseHistory: {},
    customFoods: [],
    customActivities: [],
    attendanceStreak: 0,
    streakStartDate: window.today ? window.today() : new Date().toISOString().slice(0, 10),
    streakHistory: {},
    lastAttendanceDate: window.today ? window.today() : new Date().toISOString().slice(0, 10),
    lastQualifiedDate: null,
    dailyRecords: {},
    timeline: [],
    achievements: {},
    onboarded: false
  };

  // Safe migration layer from all prior keys
  const legacyData = JSON.parse(
    localStorage.getItem(KEY) ||
    localStorage.getItem('fitRadhadevanV7') ||
    localStorage.getItem('fitRadhadevanV6') ||
    localStorage.getItem('fitRadhadevanV5') ||
    localStorage.getItem('fitRadhadevanV4') ||
    localStorage.getItem('fitRadhadevanV3') ||
    localStorage.getItem('fitRadhadevanV2') ||
    localStorage.getItem('fitRadhadevan') ||
    'null'
  );

  let d = Object.assign(JSON.parse(JSON.stringify(INITIAL)), legacyData || {});

  // Ensure arrays and objects exist
  d.name = d.name || '';
  d.age = d.age || '';
  d.gender = d.gender || '';
  d.height = (d.height !== undefined && d.height !== null && !isNaN(Number(d.height))) ? Number(d.height) : null;
  d.burnTarget = (d.burnTarget !== undefined && d.burnTarget !== null && !isNaN(Number(d.burnTarget))) ? Number(d.burnTarget) : 500;
  d.foods = Array.isArray(d.foods) ? d.foods : [];
  d.history = Array.isArray(d.history) ? d.history : [];
  d.customFoods = Array.isArray(d.customFoods) ? d.customFoods : [];
  d.customActivities = Array.isArray(d.customActivities) ? d.customActivities : [];
  d.workoutHistory = d.workoutHistory || {};
  d.workoutOverrides = d.workoutOverrides || {};
  d.workoutSets = d.workoutSets || {};
  d.workoutChecklist = d.workoutChecklist || {};
  d.personalRecords = d.personalRecords || {};
  d.exerciseHistory = d.exerciseHistory || {};
  d.streakHistory = d.streakHistory || {};
  d.dailyRecords = d.dailyRecords || {};
  d.timeline = Array.isArray(d.timeline) ? d.timeline : [];
  d.achievements = d.achievements || {};

  // Preserve onboarded flag if valid profile exists
  if (legacyData && (legacyData.name || legacyData.weight)) {
    d.onboarded = (legacyData.onboarded !== false);
  } else if (legacyData && legacyData.onboarded !== undefined) {
    d.onboarded = !!legacyData.onboarded;
  } else {
    d.onboarded = false;
  }

  // Weight initialization
  const todayIso = window.today ? window.today() : new Date().toISOString().slice(0, 10);
  if (!d.weight && d.history && d.history.length) {
    d.weight = Number(d.history[d.history.length - 1].weight);
  }
  if (d.weight) {
    d.startWeight = Number(d.startWeight) || (d.history && d.history.length ? Number(d.history[0].weight) : null) || Number(d.weight);
    if (!d.history.some(x => x.date === todayIso)) {
      d.history.push({ date: todayIso, weight: Number(d.weight) });
    }
  }

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

  /**
   * Synchronize today's active values into d.dailyRecords[todayIso]
   */
  const syncTodayRecord = () => {
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);
    const burn = Number(v9?.burned) || 0;
    const isWorkoutDone = !!(d.workoutHistory && d.workoutHistory[t]?.completed);

    d.dailyRecords = d.dailyRecords || {};
    d.dailyRecords[t] = {
      date: t,
      weight: Number(d.weight) || null,
      protein: Math.round(p * 10) / 10,
      calories: Math.round(c),
      water: Number(d.water) || 0,
      burned: burn,
      activity: v9?.activity || null,
      workout: d.workout || (d.workoutHistory && d.workoutHistory[t]?.workout) || '',
      workoutCompleted: isWorkoutDone,
      spent: Number(d.spent) || 0,
      dailyCompletion: (typeof window.calculateCurrentDailyPercent === 'function')
        ? window.calculateCurrentDailyPercent()
        : 0,
      foods: JSON.parse(JSON.stringify(d.foods || [])),
      timeline: JSON.parse(JSON.stringify(d.timeline || [])),
      updatedAt: new Date().toISOString()
    };
  };

  /**
   * Add an event to today's chronological timeline
   */
  const addTimelineEvent = (type, title, detail, icon, cost) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const id = 'tl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    d.timeline = d.timeline || [];
    d.timeline.push({
      id,
      timestamp: now.getTime(),
      time,
      type: type || 'general',
      title: title || '',
      detail: detail || '',
      icon: icon || '•',
      cost: Number(cost) || 0
    });

    // Keep chronological
    d.timeline.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  };

  /**
   * Save central state to localStorage and notify all subscribers
   */
  const save = (doRender = true) => {
    syncTodayRecord();
    localStorage.setItem(KEY, JSON.stringify(d));
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
    if (doRender && typeof window.render === 'function') {
      window.render();
    }
  };

  const saveV9 = () => {
    localStorage.setItem(V9KEY, JSON.stringify(v9));
    syncTodayRecord();
  };

  /**
   * Check and transition state when calendar day changes
   */
  const ensureTodayState = () => {
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    if (d.date !== t) {
      // Archive previous day's record
      if (d.date) {
        syncTodayRecord();
        if (d.weight) {
          d.history = d.history || [];
          if (!d.history.some(x => x.date === d.date)) {
            d.history.push({ date: d.date, weight: d.weight });
            d.history = d.history.slice(-90);
          }
        }
      }

      // Initialize fresh day for new date
      d.date = t;
      d.foods = [];
      d.water = 0;
      d.spent = 0;
      d.workout = '';
      d.timeline = [];
      if (v9.lastActivityDate !== t) {
        v9.burned = 0;
        v9.activity = null;
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
    syncTodayRecord,
    addTimelineEvent,
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
  window.syncTodayRecord = syncTodayRecord;
  window.addTimelineEvent = addTimelineEvent;
  window.save = save;
  window.saveV9 = saveV9;
  window.ensureTodayState = ensureTodayState;
  window.refreshForDateChange = refreshForDateChange;

})(window);
