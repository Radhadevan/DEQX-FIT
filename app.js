/* ===== DEQX FIT — Core Application Logic ===== */

const KEY = 'fitRadhadevanV7';
const isoDate = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, '0'),
    day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const today = () => isoDate(new Date());
const todayLabel = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();

const DB = {
  egg: { p: 6.3, c: 78, a: ['egg', 'eggs'] },
  appam: { p: 2, c: 120, a: ['appam', 'appams'] },
  chapathi: { p: 3, c: 110, a: ['chapathi', 'chapati', 'chappathi', 'chappati'] },
  chicken: { p: 27, c: 165, a: ['chicken'] },
  beef: { p: 26, c: 250, a: ['beef'] },
  milk: { p: 8, c: 150, a: ['milk'] },
  oats: { p: 6.5, c: 190, a: ['oats', 'oat'] }
};

const QUICK_FOODS = [
  { key: 'egg', name: 'Egg', icon: '🥚', amount: 1, unit: 'count', portion: '1 egg' },
  { key: 'appam', name: 'Appam', icon: '🥞', amount: 1, unit: 'count', portion: '1 appam' },
  { key: 'chicken', name: 'Chicken', icon: '🍗', amount: 50, unit: 'g', portion: '50 g' },
  { key: 'chapathi', name: 'Chapathi', icon: '🫓', amount: 1, unit: 'count', portion: '1 chapathi' },
  { key: 'milk', name: 'Milk', icon: '🥛', amount: 250, unit: 'ml', portion: '250 ml' },
  { key: 'oats', name: 'Oats', icon: '🥣', amount: 50, unit: 'g', portion: '50 g' }
];

const ACTIVITIES = [
  { id: 'Badminton', label: 'BADMINTON', sub: 'Cardio', icon: '🏸' },
  { id: 'Cricket', label: 'CRICKET', sub: 'Sport', icon: '🏏' }
];

const WORKOUT_SPLITS = ['Chest + Triceps', 'Back + Biceps', 'Shoulders + Forearms', 'Leg Day'];

function scheduleForDate(date) {
  const targetIso = isoDate(date);
  if (d && d.workoutOverrides && d.workoutOverrides[targetIso]) {
    return d.workoutOverrides[targetIso];
  }
  const anchor = (d && d.workoutAnchor) || { date: '2026-09-30', split: 'Leg Day' };
  const anchorIso = anchor.date;
  if (targetIso === anchorIso) {
    return anchor.split;
  }
  const dow = date.getDay();
  const isWeekend = (dow === 0 || dow === 6);
  if (isWeekend && targetIso !== anchorIso && (!d || !d.workoutOverrides || !d.workoutOverrides[targetIso])) {
    return 'Rest';
  }
  const sIdx = WORKOUT_SPLITS.indexOf(anchor.split);
  const baseIdx = sIdx >= 0 ? sIdx : 0;

  const anchorParts = anchorIso.split('-').map(Number);
  const anchorDt = new Date(anchorParts[0], anchorParts[1] - 1, anchorParts[2]);
  const targetDt = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const sign = targetDt >= anchorDt ? 1 : -1;
  let count = 0;
  const cur = new Date(anchorDt);
  while ((sign > 0 && cur < targetDt) || (sign < 0 && cur > targetDt)) {
    if (sign > 0) cur.setDate(cur.getDate() + 1);
    const curIso = isoDate(cur);
    const curDow = cur.getDay();
    const curWeekend = (curDow === 0 || curDow === 6);
    let isWorkoutDay = false;
    if (d && d.workoutOverrides && d.workoutOverrides[curIso]) {
      if (d.workoutOverrides[curIso] !== 'Rest') isWorkoutDay = true;
    } else if (!curWeekend || curIso === anchorIso) {
      isWorkoutDay = true;
    }
    if (isWorkoutDay) count += sign;
    if (sign < 0) cur.setDate(cur.getDate() - 1);
  }

  const idx = ((baseIdx + count) % 4 + 4) % 4;
  return WORKOUT_SPLITS[idx];
}

function setWorkoutCycle(split, targetDateIso) {
  const iso = targetDateIso || today();
  ensureTodayState();
  d.workoutOverrides = d.workoutOverrides || {};
  if (split === 'Rest') {
    d.workoutOverrides[iso] = 'Rest';
  } else {
    delete d.workoutOverrides[iso];
    d.workoutAnchor = { date: iso, split: split };
  }
  save();
  render();
  renderCalendar();
  toast('Routine updated: ' + split + ' ✓ Cycle will continue from here');
}

let adjustTargetIso = null;
function openCalendarDayAdjust(iso) {
  adjustTargetIso = iso;
  const current = scheduleForDate(new Date(iso.replace(/-/g, '/')));
  const title = document.getElementById('adjustModalTitle');
  const sub = document.getElementById('adjustModalSubtitle');
  if (title) title.textContent = 'Adjust Routine for ' + iso;
  if (sub) sub.innerHTML = 'Currently scheduled: <b style="color:var(--lime)">' + esc(current) + '</b>.<br>Choose a new workout, and all upcoming days will continue from it:';
  const modal = document.getElementById('adjustWorkoutModal');
  if (modal) modal.classList.add('show');
}

function closeAdjustModal() {
  const modal = document.getElementById('adjustWorkoutModal');
  if (modal) modal.classList.remove('show');
}

function applyDayAdjust(split) {
  if (!adjustTargetIso) return;
  setWorkoutCycle(split, adjustTargetIso);
  closeAdjustModal();
}

const RANKS = ['Rookie', 'Hunter', 'Elite', 'Vanguard', 'Shadow', 'Ascendant', 'Apex'];
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
  date: today(),
  xp: 0,
  rewardDays: {},
  workoutHistory: {},
  workoutOverrides: {},
  customFoods: [],
  customActivities: [],
  attendanceStreak: 0,
  streakStartDate: today(),
  streakHistory: {},
  lastAttendanceDate: today(),
  onboarded: false
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
d.onboarded = typeof d.onboarded === 'boolean' ? d.onboarded : (!!d.name && !!d.weight && !!d.goalWeight);

d.workoutAnchor = d.workoutAnchor || { date: '2026-09-30', split: 'Leg Day' };
if (!d.workoutAnchor.split || d.workoutAnchor.split === 'Back + Biceps' || d.workoutAnchor.split === 'Shoulders + Forearms') {
  d.workoutAnchor = { date: today(), split: 'Leg Day' };
}
d.workoutOverrides = d.workoutOverrides || {};
d.foods = d.foods || [];
d.customFoods = d.customFoods || [];
d.customActivities = d.customActivities || [];
d.history = Array.isArray(d.history) ? d.history : (d.weight ? [{ date: today(), weight: d.weight }] : []);

// Clean up any stale dummy weights (like 99.7 or 97.1) from previous demo/default profiles if user has set their own weight
if (d.weight && d.history && d.history.length > 1) {
  d.history = d.history.filter(x => !(Number(x.weight) === 99.7 || Number(x.weight) === 97.1));
  if (!d.history.length) d.history = [{ date: today(), weight: d.weight }];
}
d.goalWeight = Number(d.goalWeight) || 85;
d.proteinTarget = Number(d.proteinTarget) || 150;
d.waterTarget = Number(d.waterTarget) || 3;
d.calorieTarget = Number(d.calorieTarget) || 2200;
d.budgetTarget = Number.isFinite(Number(d.budgetTarget)) ? Number(d.budgetTarget) : 250;
d.xp = Number(d.xp) || 0;
d.rewardDays = d.rewardDays || {};
d.workoutHistory = d.workoutHistory || {};
d.streakStartDate = d.streakStartDate || today();
d.streakHistory = d.streakHistory || {};
d.attendanceStreak = Number.isFinite(Number(d.attendanceStreak)) ? Number(d.attendanceStreak) : 0;
d.lastAttendanceDate = d.lastAttendanceDate || today();

function getDaysDifference(isoDate1, isoDate2) {
  if (!isoDate1 || !isoDate2) return 999;
  const [y1, m1, day1] = isoDate1.split('-').map(Number);
  const [y2, m2, day2] = isoDate2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, day1);
  const utc2 = Date.UTC(y2, m2 - 1, day2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function calculateCurrentDailyPercent() {
  const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
  const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);
  const burn = (typeof v9 !== 'undefined' && v9.burned) || 0;
  const done = !!(d.workoutHistory && d.workoutHistory[isoDate(new Date())]?.completed);
  const pct = (v, t) => Math.min(100, Math.round(((Number(v) || 0) / Math.max(1, Number(t) || 1)) * 100));
  const pp = pct(p, d.proteinTarget || 150);
  const wp = pct(d.water || 0, d.waterTarget || 3);
  const cp = pct(c, d.calorieTarget || 2200);
  const bp = pct(burn, 500);
  const gp = done ? 100 : 0;
  return Math.round((pp + wp + cp + bp + gp) / 5);
}

function computeAndUpdateStreak(dailyPercent) {
  const t = today();
  d.streakStartDate = d.streakStartDate || t;
  d.streakHistory = d.streakHistory || {};

  const wasQualified = !!(d.streakHistory[t] && d.streakHistory[t].qualified);
  const isQualified = Number(dailyPercent) >= 50;

  d.streakHistory[t] = {
    percent: Number(dailyPercent) || 0,
    qualified: isQualified,
    date: t
  };

  // Toast notification when user crosses 50% today for the first time
  if (!wasQualified && isQualified) {
    toast('🔥 Daily streak recorded! 50%+ daily target completed today ✓');
  }

  // Count past consecutive qualified days backwards from yesterday
  let pastStreak = 0;
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const checkIso = isoDate(cursor);
    if (d.streakStartDate && checkIso < d.streakStartDate) break;
    const entry = d.streakHistory[checkIso];
    if (entry && entry.qualified) {
      pastStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Check if yesterday was missed:
  // If yesterday was on or after streakStartDate and was NOT qualified, the previous streak ended.
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestIso = isoDate(yest);
  if (d.streakStartDate <= yestIso && (!d.streakHistory[yestIso] || !d.streakHistory[yestIso].qualified)) {
    // Yesterday was missed! Previous streak has ended.
    // Reset streak start date to today so Weekly Rhythm resets to today!
    d.streakStartDate = t;
    pastStreak = 0;
  }

  const streakCount = pastStreak + (isQualified ? 1 : 0);
  d.attendanceStreak = streakCount;
  if (typeof v9 !== 'undefined') {
    v9.streak = streakCount;
  }

  return { streakCount, isQualified };
}

function renderWeeklyRhythm(dailyPercent) {
  const dots = document.getElementById('streakDots');
  if (!dots) return;

  const t = today();
  const startIso = d.streakStartDate || t;
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const startDateObj = new Date(sy, sm - 1, sd);
  const [ty, tm, td] = t.split('-').map(Number);
  const todayObj = new Date(ty, tm - 1, td);

  const diffDays = Math.max(0, Math.floor((todayObj - startDateObj) / (1000 * 60 * 60 * 24)));
  const cycleIndex = Math.floor(diffDays / 7);
  const cycleStart = new Date(startDateObj.getTime() + cycleIndex * 7 * 24 * 60 * 60 * 1000);

  const DAY_CHARS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  let html = '';
  for (let i = 0; i < 7; i++) {
    const slotDate = new Date(cycleStart.getTime() + i * 24 * 60 * 60 * 1000);
    const slotIso = isoDate(slotDate);
    const dayOfWeek = slotDate.getDay();
    const char = DAY_CHARS[dayOfWeek];
    const name = DAY_NAMES[dayOfWeek];

    const isToday = (slotIso === t);
    const isPast = (slotIso < t);

    let isDone = false;
    let isBlinking = false;

    if (isPast) {
      isDone = !!(d.streakHistory && d.streakHistory[slotIso]?.qualified);
    } else if (isToday) {
      isDone = Number(dailyPercent) >= 50;
      // Today is active and continuously blinks till streak ends!
      isBlinking = true;
    }

    const classes = [
      isDone ? 'done' : '',
      isToday ? 'today' : '',
      isBlinking ? 'blinking' : '',
      (isPast && !isDone) ? 'missed' : ''
    ].filter(Boolean).join(' ');

    const statusText = isToday
      ? (isDone ? 'Today · Completed (50%+ target achieved)' : `Today · In progress (${dailyPercent}% / 50% target)`)
      : isPast
      ? (isDone ? 'Completed (50%+ achieved)' : 'Missed (< 50%)')
      : 'Upcoming';

    html += `<i class="${classes}" title="${name} (${slotIso}) · ${statusText}">${char}</i>`;
  }

  dots.innerHTML = html;

  const actDots = document.getElementById('activityStreakDots');
  if (actDots) actDots.innerHTML = html;
}

function showStreakInfo() {
  const streak = Number(d.attendanceStreak) || 0;
  const t = today();
  const entry = d.streakHistory && d.streakHistory[t];
  const curPct = entry ? entry.percent : calculateCurrentDailyPercent();
  const sUnit = streak === 1 ? 'day' : 'days';
  if (curPct >= 50) {
    toast(`🔥 ${streak} ${sUnit} streak active! Today’s target is ${curPct}% completed (✓ 50%+ achieved)`);
  } else {
    toast(`🔥 ${streak} ${sUnit} streak. Complete at least 50% today to record today's streak! (Currently ${curPct}%)`);
  }
}

function openTargetMapModal() {
  updateDailyAnalytics();
  const modal = document.getElementById('targetMapModal');
  if (modal) modal.classList.add('show');
}

function closeTargetMapModal() {
  const modal = document.getElementById('targetMapModal');
  if (modal) modal.classList.remove('show');
}

let foodDraft = [];

function ensureTodayState() {
  const t = today();
  if (d.date !== t) {
    const prevDate = d.date;
    const prevEntry = d.streakHistory && d.streakHistory[prevDate];
    if (!prevEntry || !prevEntry.qualified) {
      // Previous day was missed (< 50%) -> Streak ended!
      d.streakStartDate = t;
      d.attendanceStreak = 0;
      if (typeof v9 !== 'undefined') v9.streak = 0;
    }
    foodDraft = [];
    d.foods = [];
    d.water = 0;
    d.workout = '';
    d.spent = 0;
    d.date = t;
    d.rewardDays[t] = d.rewardDays[t] || {};
    if (typeof v9 !== 'undefined') {
      v9.burned = 0;
      v9.activity = null;
      if (typeof saveV9 === 'function') saveV9();
    }
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  }
  return false;
}

function refreshForDateChange() {
  const changed = ensureTodayState();
  const el = document.getElementById('todayDate');
  if (el) el.textContent = todayLabel();
  if (changed) {
    render();
    if (typeof renderV9 === 'function') renderV9();
    if (typeof cloudUser !== 'undefined' && cloudUser && typeof cloudLoad === 'function') setTimeout(() => cloudLoad(), 0);
  }
}
ensureTodayState();

let calendarCursor = new Date();

function cloneInitial() {
  return JSON.parse(JSON.stringify({ ...INITIAL, date: today(), history: d.weight ? [{ date: today(), weight: d.weight }] : [] }));
}

function save(doRender = true) {
  ensureTodayState();
  localStorage.setItem(KEY, JSON.stringify(d));
  if (typeof cloudUser !== 'undefined' && cloudUser) {
    localDirty = true;
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
  }
  if (doRender) render();
}

function levelInfo() {
  let level = Math.floor(d.xp / 500) + 1,
    within = d.xp % 500;
  return {
    level,
    within,
    next: 500,
    pct: (within / 500) * 100,
    rank: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))]
  };
}

function rewardOnce(key, amount, reason) {
  const day = today();
  d.rewardDays[day] = d.rewardDays[day] || {};
  if (d.rewardDays[day][key]) return false;
  d.rewardDays[day][key] = true;
  addXP(amount, reason);
  return true;
}

function addXP(amount, reason) {
  const before = levelInfo().level;
  d.xp += amount;
  const after = levelInfo().level;
  save(false);
  if (after > before) showLevelUp(after, levelInfo().rank);
  render();
  if (after === before && reason) toast('+' + amount + ' XP • ' + reason);
}

function showLevelUp(level, rank) {
  const ol = document.getElementById('overlayLevel');
  const or = document.getElementById('overlayRank');
  if (ol) ol.textContent = level;
  if (or) or.textContent = rank;
  const overlay = document.getElementById('levelOverlay');
  if (overlay) overlay.classList.add('show');
}

function closeLevelOverlay() {
  const overlay = document.getElementById('levelOverlay');
  if (overlay) overlay.classList.remove('show');
}

const TAB_META = {
  home: { icon: '⌂', label: 'Home' },
  food: { icon: '🍽', label: 'Food' },
  activity: { icon: '⚡', label: 'Activity' },
  workout: { icon: '🏋', label: 'Workout' },
  budget: { icon: '₹', label: 'Budget' },
  profile: { icon: '◉', label: 'Profile' }
};

let navDockTimer = null;

function toggleNavDock() {
  const dock = document.getElementById('navDock');
  if (dock && dock.classList.contains('show')) {
    collapseNavDock();
  } else {
    expandNavDock();
  }
}

function expandNavDock() {
  const dock = document.getElementById('navDock');
  const backdrop = document.getElementById('navDockBackdrop');
  const capsule = document.getElementById('navCapsule');
  if (dock) dock.classList.add('show');
  if (backdrop) backdrop.classList.add('show');
  if (capsule) capsule.classList.add('expanded');
  clearTimeout(navDockTimer);
  navDockTimer = setTimeout(() => {
    collapseNavDock();
  }, 4500);
}

function collapseNavDock() {
  const dock = document.getElementById('navDock');
  const backdrop = document.getElementById('navDockBackdrop');
  const capsule = document.getElementById('navCapsule');
  if (dock) dock.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  if (capsule) capsule.classList.remove('expanded');
  clearTimeout(navDockTimer);
}

function selectNavTab(tabId) {
  show(tabId);
  setTimeout(() => {
    collapseNavDock();
  }, 140);
}

function show(id, direction) {
  if (d && !d.onboarded && id !== 'home') {
    openOnboardingModal();
    return;
  }
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active', 'motion-left', 'motion-right'));
  const sec = document.getElementById(id);
  if (sec) {
    sec.classList.add('active');
    if (direction) sec.classList.add(direction === 'left' ? 'motion-left' : 'motion-right');
  }

  // Update navigation dock active state
  document.querySelectorAll('.navDockItem').forEach(x => x.classList.remove('active'));
  document.getElementById('n-' + id)?.classList.add('active');

  // Update capsule current section title and icon
  const meta = TAB_META[id] || { icon: '⌂', label: 'Home' };
  const iconEl = document.getElementById('capsuleIcon');
  const labelEl = document.getElementById('capsuleLabel');
  if (iconEl) iconEl.textContent = meta.icon;
  if (labelEl) labelEl.textContent = meta.label;

  // Update 7-dot indicator track
  document.querySelectorAll('.navDot').forEach(dot => {
    dot.classList.toggle('active', dot.getAttribute('data-tab') === id);
  });

  if (id === 'profile') fillProfile();
  if (id === 'workout') renderCalendar();
  render();
  updateSpendRing();
}

let previousSpendValue = undefined;

function updateSpendRing() {
  const spent = Number((d && d.spent) || 0);
  const maxLimit = 300;
  const targetLimit = 250;
  const ratio = Math.max(0, Math.min(1, spent / maxLimit));
  const pct = Math.round(ratio * 100);

  const ringEl = document.getElementById('dailySpendRing');
  const textEl = document.getElementById('spendRingText');
  const subEl = document.getElementById('spendRingSub');

  if (textEl) {
    textEl.textContent = '₹' + Math.round(spent).toLocaleString('en-IN');
  }

  if (ringEl) {
    ringEl.style.setProperty('--spend-p', pct + '%');

    if (spent <= targetLimit) {
      // SAFE RANGE (<= 250) -> Acid green #d6ff32
      ringEl.className = 'dailyRing dailySpendRing state-safe';
      ringEl.style.setProperty('--spend-color', '#d6ff32');
      ringEl.title = `Today's spend: ₹${spent} / ₹300 (Safe range, ₹${targetLimit - spent} left of target)`;
      if (subEl) subEl.textContent = 'SPENT';
    } else if (spent < maxLimit) {
      // WARNING RANGE (251 - 299) -> Orange #ff9f24
      ringEl.className = 'dailyRing dailySpendRing state-warning';
      ringEl.style.setProperty('--spend-color', '#ff9f24');
      ringEl.title = `Today's spend: ₹${spent} / ₹300 (Warning: Over ₹250 target, ₹${maxLimit - spent} left before max)`;
      if (subEl) subEl.textContent = 'WARN';
    } else {
      // EXCEEDED LIMIT (>= 300) -> Red #ff4d4d
      ringEl.className = 'dailyRing dailySpendRing state-exceeded';
      ringEl.style.setProperty('--spend-color', '#ff4d4d');
      ringEl.title = `Today's spend: ₹${spent} / ₹300 (Exceeded limit by ₹${spent - maxLimit})`;
      if (subEl) subEl.textContent = 'LIMIT';
    }

    // Threshold crossing animations & alerts
    if (previousSpendValue !== undefined) {
      if (previousSpendValue <= targetLimit && spent > targetLimit && spent < maxLimit) {
        ringEl.classList.remove('ring-crossed-warning', 'ring-crossed-danger');
        void ringEl.offsetWidth; // trigger reflow
        ringEl.classList.add('ring-crossed-warning');
        toast('⚠️ Spending entered warning range (>₹250)');
      } else if (previousSpendValue < maxLimit && spent >= maxLimit) {
        ringEl.classList.remove('ring-crossed-warning', 'ring-crossed-danger');
        void ringEl.offsetWidth; // trigger reflow
        ringEl.classList.add('ring-crossed-danger');
        toast('🚨 Maximum spending limit exceeded (₹300+)');
      }
    }
  }

  previousSpendValue = spent;
}

function addWater(v) {
  const before = d.water;
  d.water = Math.round((d.water + v) * 100) / 100;
  save();
  updateDailyAnalytics();
  toast('Water updated ✓');
  if (before < d.waterTarget && d.water >= d.waterTarget) rewardOnce('waterTarget', 30, 'Water target');
}

function smartFill(v) {
  const input = document.getElementById('smartFood');
  if (input) input.value = v;
}

function draftItemLabel(key, qty, servings) {
  const names = { egg: 'egg', appam: 'appam', chicken: 'chicken', chapathi: 'chapathi', milk: 'milk', oats: 'oats' };
  const name = names[key] || key;
  if (servings && servings.unit === 'g') return qty + 'g ' + name;
  if (servings && servings.unit === 'ml') return qty + 'ml ' + name;
  return qty + ' ' + name + (qty === 1 ? '' : 's');
}

function addToFoodDraft(key, quantity, unit, custom) {
  const f = custom || DB[key];
  if (!f) return;
  const amount = Number(quantity) || 0;
  if (amount <= 0) return;
  const existing = foodDraft.find(x => x.key === key && (!!x.customId === !!(custom && custom.id)) && (!custom || x.customId === custom.id));
  let p = 0, c = 0;
  if (custom) {
    p = (Number(custom.protein) || 0) * amount;
    c = (Number(custom.calories) || 0) * amount;
  } else {
    const factor = unit === 'g' ? amount / 100 : unit === 'ml' ? amount / 250 : amount;
    p = (Number(f.p) || 0) * factor;
    c = (Number(f.c) || 0) * factor;
  }
  if (existing) {
    existing.qty += amount;
    existing.p = Math.round((existing.p + p) * 10) / 10;
    existing.c = Math.round(existing.c + c);
    existing.label = custom
      ? (custom.unit === 'grams' ? existing.qty + ' g ' + custom.name : existing.qty + ' ' + custom.name + (existing.qty === 1 ? '' : 's'))
      : draftItemLabel(key, existing.qty, { unit });
  } else {
    foodDraft.push({
      key,
      customId: custom?.id || null,
      qty: amount,
      unit,
      label: custom
        ? (custom.unit === 'grams' ? amount + ' g ' + custom.name : amount + ' ' + custom.name + (amount === 1 ? '' : 's'))
        : draftItemLabel(key, amount, { unit }),
      p: Math.round(p * 10) / 10,
      c: Math.round(c)
    });
  }
  renderFoodDraft();
}

let lastQuickFoodTap = { key: null, time: 0 };
function addQuickFood(key) {
  const now = Date.now();
  if (lastQuickFoodTap.key === key && (now - lastQuickFoodTap.time) < 250) {
    return;
  }
  lastQuickFoodTap = { key, time: now };
  const item = QUICK_FOODS.find(q => q.key === key);
  if (!item || !DB[key]) return;
  addToFoodDraft(key, item.amount, item.unit);
  const currentItem = foodDraft.find(x => x.key === key && !x.customId);
  const qty = currentItem ? currentItem.qty : item.amount;
  toast('Selected ' + draftItemLabel(key, qty, { unit: item.unit }));
}

function removeQuickFood(key, all) {
  const idx = foodDraft.findIndex(x => x.key === key && !x.customId);
  if (idx !== -1) {
    const item = foodDraft[idx];
    const name = item.label || key;
    removeDraftItem(idx, all);
    toast(all ? 'Removed ' + name : 'Decreased ' + name);
  }
}

function renderFoodDraft() {
  const list = document.getElementById('foodDraftList'),
    status = document.getElementById('draftStatus'),
    total = document.getElementById('draftTotal');
  if (!list) return;
  const count = foodDraft.reduce((a, x) => a + 1, 0),
    p = foodDraft.reduce((a, x) => a + (Number(x.p) || 0), 0),
    c = foodDraft.reduce((a, x) => a + (Number(x.c) || 0), 0);
  if (status) status.textContent = count + ' item' + (count === 1 ? '' : 's');
  if (!foodDraft.length) {
    list.innerHTML = '<div class="draftEmpty">Tap foods above to build your meal. Your dashboard will not change yet.</div>';
    if (total) total.textContent = 'Nothing selected';
  } else {
    list.innerHTML = foodDraft.map((x, i) =>
      '<div class="draftItem"><div class="draftMeta"><b>' + esc(x.label) + '</b><small>' + Number(x.p).toFixed(1) + ' g protein • ' + Math.round(x.c) + ' kcal</small></div><div class="draftActions"><button type="button" onclick="removeDraftItem(' + i + ')" title="Decrease 1 portion" style="padding:6px 10px;font-size:13px;border-radius:8px">−1</button><button type="button" class="removeDraft" onclick="removeDraftItem(' + i + ',true)" title="Delete this food" style="padding:6px 10px;font-size:12px;border-radius:8px;display:flex;align-items:center;gap:4px">🗑️ Delete</button></div></div>'
    ).join('');
    if (total) total.innerHTML = '<b>' + p.toFixed(1) + ' g</b> protein • <b>' + Math.round(c) + '</b> kcal';
  }

  document.querySelectorAll('.quickFoodBtn').forEach(btn => {
    const key = btn.dataset.foodKey;
    const item = foodDraft.find(x => x.key === key && !x.customId);
    btn.classList.toggle('selected', !!item);
    let ctrl = btn.querySelector('.quickFoodCtrl');
    if (item) {
      const displayQty = item.unit === 'g' ? item.qty + 'g' : item.unit === 'ml' ? item.qty + 'ml' : item.qty;
      if (!ctrl) {
        ctrl = document.createElement('div');
        ctrl.className = 'quickFoodCtrl';
        btn.appendChild(ctrl);
      }
      ctrl.innerHTML =
        '<button type="button" class="ctrlBtn minus" title="Decrease 1 portion" onclick="event.stopPropagation(); removeQuickFood(\'' + key + '\', false)">−</button>' +
        '<span class="ctrlCount">' + esc(displayQty) + '</span>' +
        '<button type="button" class="ctrlBtn delete" title="Delete selection" onclick="event.stopPropagation(); removeQuickFood(\'' + key + '\', true)">✕</button>';
    } else if (ctrl) {
      ctrl.remove();
    }
  });
}

function removeDraftItem(i, all) {
  if (!foodDraft[i]) return;
  const x = foodDraft[i];
  const f = x.customId ? d.customFoods.find(y => y.id === x.customId) : DB[x.key];
  if (!f) {
    foodDraft.splice(i, 1);
    renderFoodDraft();
    return;
  }
  const unit = x.unit;
  const step = x.customId ? (f.amount || 1) : (unit === 'g' ? 50 : unit === 'ml' ? 250 : 1);
  if (all || x.qty <= step) {
    foodDraft.splice(i, 1);
  } else {
    const factor = unit === 'g' ? step / 100 : unit === 'ml' ? step / 250 : step;
    const pp = x.customId ? (Number(f.protein) || 0) * step : (Number(f.p) || 0) * factor;
    const cc = x.customId ? (Number(f.calories) || 0) * step : (Number(f.c) || 0) * factor;
    x.qty -= step;
    x.p = Math.max(0, Math.round((x.p - pp) * 10) / 10);
    x.c = Math.max(0, Math.round(x.c - cc));
    x.label = x.customId
      ? (f.unit === 'grams' ? x.qty + ' g ' + f.name : x.qty + ' ' + f.name + (x.qty === 1 ? '' : 's'))
      : draftItemLabel(x.key, x.qty, { unit });
  }
  renderFoodDraft();
}

function clearFoodDraft() {
  if (!foodDraft.length) return;
  foodDraft = [];
  renderFoodDraft();
  document.getElementById('smartResult').innerHTML = '<div class="result">Selection cleared.</div>';
  toast('Food selection cleared');
}

function commitFoodDraft() {
  ensureTodayState();
  if (!foodDraft.length) {
    toast('Select some food first');
    return;
  }
  const items = foodDraft.map(x => ({
    n: x.label,
    p: Math.round((Number(x.p) || 0) * 10) / 10,
    c: Math.round(Number(x.c) || 0)
  }));
  d.foods.push(...items);
  d.date = today();
  save(false);
  rewardOnce('foodLogged', 10, 'Meal logged');
  foodDraft = [];
  document.getElementById('smartFood').value = '';
  document.getElementById('smartResult').innerHTML = '<div class="result">Saved ✓ Meal added to today’s data.</div>';
  renderFoodDraft();
  render();
  updateDailyAnalytics();
  toast('Food saved ✓ Updated today’s data');
}

function saveCustomFood() {
  const name = document.getElementById('customFoodName').value.trim();
  const protein = Number(document.getElementById('customFoodProtein').value);
  const calories = Number(document.getElementById('customFoodCalories').value || 0);
  const unit = document.getElementById('customFoodUnit').value;
  const amount = Number(document.getElementById('customFoodAmount').value);
  if (!name || !Number.isFinite(protein) || protein < 0 || !Number.isFinite(calories) || calories < 0 || !Number.isFinite(amount) || amount <= 0) {
    document.getElementById('customFoodResult').innerHTML = '<div class="result">Enter a name, protein, calories and amount.</div>';
    return;
  }
  const id = 'cf_' + Date.now();
  d.customFoods.push({ id, name, protein, calories, unit, amount });
  save(false);
  document.getElementById('customFoodName').value = '';
  document.getElementById('customFoodProtein').value = '';
  document.getElementById('customFoodCalories').value = '';
  document.getElementById('customFoodAmount').value = '1';
  document.getElementById('customFoodUnit').value = 'count';
  document.getElementById('customFoodResult').innerHTML = '<div class="result">Saved ✓ Tap it below to select one serving.</div>';
  render();
  renderCustomFoods();
  toast('Custom food saved ✓');
}

function addCustomFood(id) {
  const f = d.customFoods.find(x => x.id === id);
  if (!f) return;
  addToFoodDraft(null, f.amount, f.unit === 'grams' ? 'g' : 'count', f);
  toast('Selected ' + f.name);
}

function removeCustomFood(id) {
  d.customFoods = d.customFoods.filter(x => x.id !== id);
  foodDraft = foodDraft.filter(x => x.customId !== id);
  save();
  renderCustomFoods();
  renderFoodDraft();
  toast('Custom food removed');
}

function renderCustomFoods() {
  const el = document.getElementById('customFoodList');
  if (!el) return;
  if (!d.customFoods.length) {
    el.innerHTML = '<p class="muted">No custom foods yet.</p>';
    return;
  }
  el.innerHTML = d.customFoods.map(f => {
    const amount = f.unit === 'grams' ? f.amount + ' g' : f.amount + ' serving';
    const draft = foodDraft.find(x => x.customId === f.id);
    return '<div class="customFoodItem"><div class="customFoodMeta"><b>' + esc(f.name) + '</b><small>' + amount + ' • ' + Number(f.protein).toFixed(1) + ' g protein • ' + Number(f.calories) + ' kcal</small></div><div class="actions"><button onclick="addCustomFood(\'' + esc(f.id) + '\')">+ Select</button><button class="deleteBtn" onclick="removeCustomFood(\'' + esc(f.id) + '\')">×</button></div>' + (draft ? '<small class="muted">Selected: ' + esc(draft.label) + '</small>' : '') + '</div>';
  }).join('');
}

function smartAdd() {
  const raw = document.getElementById('smartFood').value.toLowerCase().trim();
  if (!raw) return;
  let parts = raw.split(/,| and /).map(x => x.trim()).filter(Boolean), added = 0;
  parts.forEach(part => {
    let m = part.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml)?\s*(.+)/);
    if (!m) return;
    let q = parseFloat(m[1]), u = m[2] || '', name = m[3];
    let key = Object.keys(DB).find(k => DB[k].a.some(a => name.includes(a)));
    if (!key) return;
    let f = DB[key], unit = u || 'count', amount = q;
    if (u === 'kg') { unit = 'g'; amount = q * 1000; }
    if (!u) unit = 'count';
    addToFoodDraft(key, amount, unit);
    added++;
  });
  document.getElementById('smartResult').innerHTML = added
    ? '<div class="result">Selected ✓ Review the meal below, then tap <b>Add to today\'s data</b>.</div>'
    : '<div class="result">Try: 2 eggs, 3 appam, 100g chicken</div>';
  if (added) document.getElementById('smartFood').value = '';
}

function saveWeight() {
  let w = +document.getElementById('newWeight').value;
  if (w > 0) {
    d.weight = w;
    let latest = [...d.history].reverse().find(x => x.date === today());
    if (latest) latest.weight = w;
    else d.history.push({ date: today(), weight: w });
    rewardOnce('weightLogged', 20, 'Weight logged');
    save(false);
    document.getElementById('newWeight').value = '';
    render();
    document.getElementById('newWeight').placeholder = 'Enter current weight again';
    toast('Weight saved ✓ ' + w + ' kg recorded');
  }
}

function clearWeightHistory() {
  if (!confirm('Clear weight history for this profile? Your current weight will be kept.')) return;
  const cur = Number(d.weight) || (d.history && d.history.length ? d.history[d.history.length - 1].weight : 70);
  d.history = [{ date: today(), weight: cur }];
  d.startWeight = cur;
  save(false);
  if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof cloudUser !== 'undefined' && cloudUser) {
    supabaseClient.from('weight_history').delete().eq('user_id', cloudUser.id).then(() => {
      if (typeof cloudSyncNow === 'function') cloudSyncNow();
    }).catch(() => {});
  }
  render();
  toast('Weight history cleared ✓ Starting fresh from ' + cur + ' kg');
}
window.clearWeightHistory = clearWeightHistory;

function removeWeightEntry(idx) {
  if (!d.history || idx < 0 || idx >= d.history.length) return;
  const removed = d.history.splice(idx, 1)[0];
  if (!d.history.length && d.weight) {
    d.history = [{ date: today(), weight: d.weight }];
  } else if (d.history.length) {
    d.weight = d.history[d.history.length - 1].weight;
  }
  save(false);
  if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof cloudUser !== 'undefined' && cloudUser && removed) {
    supabaseClient.from('weight_history').delete().eq('user_id', cloudUser.id).eq('weight', Number(removed.weight)).then(() => {}).catch(() => {});
  }
  render();
  toast('Weight entry removed ✓');
}
window.removeWeightEntry = removeWeightEntry;

/* ============================================================
   SMART DURATION CONVERTER (HOURS vs MINUTES)
   - Numbers <= 5 are automatically treated as HOURS (1 -> 60m, 2 -> 120m, 1.5 -> 90m)
   - Numbers > 5 are treated as MINUTES (30, 40, 45, 55, 90)
   - Explicit suffixes like "1h", "1.5 hr", "45m", "55 min" are also handled
   ============================================================ */
function parseDurationToMinutes(input) {
  if (input === null || input === undefined) return 0;
  const str = String(input).trim().toLowerCase();
  if (!str) return 0;

  // Explicit suffix matching e.g. "1.5h", "1 hr", "2 hrs", "2 hours"
  const hrMatch = str.match(/^([\d.]+)\s*(h|hr|hrs|hour|hours)$/);
  if (hrMatch) {
    const h = parseFloat(hrMatch[1]);
    return isNaN(h) ? 0 : Math.round(h * 60);
  }

  // Explicit suffix matching e.g. "45m", "45 min", "55 mins"
  const minMatch = str.match(/^([\d.]+)\s*(m|min|mins|minute|minutes)$/);
  if (minMatch) {
    const m = parseFloat(minMatch[1]);
    return isNaN(m) ? 0 : Math.round(m);
  }

  // Pure numeric entry (e.g. 1, 2, 1.5, 30, 40, 55)
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return 0;

  // RULE: <= 5 is automatically converted from HOURS to MINUTES (1 -> 60m, 2 -> 120m, 1.5 -> 90m)
  // > 5 is treated as MINUTES directly (30 -> 30m, 40 -> 40m, 55 -> 55m)
  if (num <= 5) {
    return Math.round(num * 60);
  } else {
    return Math.round(num);
  }
}
window.parseDurationToMinutes = parseDurationToMinutes;

function formatDurationLabel(minutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return '0 min';
  if (m < 60) return m + ' min';
  const hrs = m / 60;
  if (m % 60 === 0) {
    return hrs + (hrs === 1 ? ' hr' : ' hrs') + ' (' + m + ' min)';
  }
  return hrs.toFixed(1).replace(/\.0$/, '') + ' hrs (' + m + ' min)';
}
window.formatDurationLabel = formatDurationLabel;

function updateBarUnit(inputEl, unitElId) {
  const badge = document.getElementById(unitElId);
  if (!badge) return;
  const raw = (inputEl ? String(inputEl.value) : '').trim();
  if (!raw) {
    badge.className = 'unitBadge';
    badge.textContent = '';
    return;
  }
  const num = parseFloat(raw);
  if (isNaN(num) || num <= 0) {
    badge.className = 'unitBadge';
    badge.textContent = '';
    return;
  }
  if (num <= 5) {
    badge.className = 'unitBadge show hours';
    badge.textContent = num === 1 ? 'hour' : 'hours';
  } else {
    badge.className = 'unitBadge show minutes';
    badge.textContent = num === 1 ? 'minute' : 'minutes';
  }
}
window.updateBarUnit = updateBarUnit;

const WORKOUT_INTENSITY_MET = {
  light: { met: 3.0, label: 'Light-to-Moderate (MET 3.0)' },
  moderate: { met: 3.5, label: 'Standard Moderate (MET 3.5)' },
  vigorous: { met: 5.0, label: 'Vigorous / Circuit Style (MET 5.0)' }
};
window.WORKOUT_INTENSITY_MET = WORKOUT_INTENSITY_MET;

function getEffectiveWorkoutWeight() {
  const weightInput = document.getElementById('workoutWeight');
  const rawWeight = weightInput ? weightInput.value.trim() : '';
  if (rawWeight !== '') {
    const val = parseFloat(rawWeight);
    if (!isNaN(val) && val >= 20 && val <= 300) {
      return Math.round(val * 10) / 10;
    }
  }
  const saved = Number(d?.weight) || (d?.history && d.history.length ? Number(d.history[d.history.length - 1].weight) : null);
  return saved && saved >= 20 && saved <= 300 ? saved : 70;
}
window.getEffectiveWorkoutWeight = getEffectiveWorkoutWeight;

function calculateGymCalories(mins, weight, intensityKey) {
  const item = WORKOUT_INTENSITY_MET[intensityKey] || WORKOUT_INTENSITY_MET.moderate;
  const met = item.met;
  // Standard exercise physiology calculation factoring rest periods between sets (MET * weight * hours * 1.05):
  // Reference for 97 kg person @ 1 hour session:
  // - Light-to-Moderate (MET 3.0): ~305 kcal (longer rest times, slower pace)
  // - Standard Moderate (MET 3.5): ~356 kcal (balanced sets, standard 60-90s rests)
  // - Vigorous / Circuit (MET 5.0): ~509 kcal (short rest times, supersets, heavy compound movements)
  const hours = (Number(mins) || 0) / 60;
  return Math.round(met * weight * hours * 1.05);
}
window.calculateGymCalories = calculateGymCalories;

function updateWorkoutCaloriePreview() {
  const valEl = document.getElementById('workoutCalorieValue');
  if (!valEl) return;

  const rawMins = document.getElementById('workoutMinutes')?.value || '';
  const parsedMins = parseDurationToMinutes(rawMins);
  const intensity = document.getElementById('workoutIntensity')?.value || d?.workoutIntensity || 'moderate';
  const weight = getEffectiveWorkoutWeight();
  const item = WORKOUT_INTENSITY_MET[intensity] || WORKOUT_INTENSITY_MET.moderate;

  // If duration not typed yet, default preview to 1 hr (60 min)
  const effectiveMins = parsedMins > 0 ? parsedMins : 60;
  const kcal = calculateGymCalories(effectiveMins, weight, intensity);

  valEl.textContent = kcal;

  const formulaEl = document.getElementById('workoutCalorieFormula');
  if (formulaEl) {
    const durLabel = parsedMins > 0 ? formatDurationLabel(parsedMins) : '1 hr';
    formulaEl.textContent = `${durLabel} · ${weight} kg · ${item.label}`;
  }
}
window.updateWorkoutCaloriePreview = updateWorkoutCaloriePreview;

function saveWorkout() {
  const scheduled = scheduleForDate(new Date());

  // Check optional daily weight update inside Today's Schedule card
  const weightInput = document.getElementById('workoutWeight');
  const rawWeight = weightInput ? weightInput.value.trim() : '';
  let weightLogged = false;
  if (rawWeight !== '') {
    const enteredWeight = parseFloat(rawWeight);
    if (!isNaN(enteredWeight) && enteredWeight >= 20 && enteredWeight <= 300) {
      const cleanWeight = Math.round(enteredWeight * 10) / 10;
      d.weight = cleanWeight;
      let latest = [...d.history].reverse().find(x => x.date === today());
      if (latest) {
        latest.weight = cleanWeight;
      } else {
        d.history.push({ date: today(), weight: cleanWeight });
      }
      rewardOnce('weightLogged', 20, 'Weight logged');
      weightLogged = true;
      weightInput.value = '';
    }
  }

  if (scheduled === 'Rest') {
    d.workout = 'Rest / Recovery';
    d.workoutHistory[today()] = { scheduled: 'Rest', completed: false };
    save(false);
    document.getElementById('workoutMinutes').value = '';
    updateBarUnit(document.getElementById('workoutMinutes'), 'workoutBarUnit');
    updateWorkoutCaloriePreview();
    document.getElementById('workoutSaved').textContent = 'Saved ✓ Rest day recorded.' + (weightLogged ? ' · ⚖️ ' + d.weight + ' kg recorded' : '');
    render();
    renderCalendar();
    toast(weightLogged ? 'Rest day & Weight saved ✓' : 'Workout data saved ✓');
    return;
  }
  const selected = document.getElementById('workoutSelect').value;
  const rawMins = document.getElementById('workoutMinutes').value;
  const mins = parseDurationToMinutes(rawMins);
  if (mins <= 0) {
    document.getElementById('workoutSaved').textContent = 'Enter workout duration first (e.g. 1 hr, 45 min).' + (weightLogged ? ' (Weight was recorded: ' + d.weight + ' kg)' : '');
    toast('Enter workout duration');
    return;
  }
  if (selected !== 'Rest' && selected !== scheduled) {
    d.workoutAnchor = { date: today(), split: selected };
    delete (d.workoutOverrides || {})[today()];
  }
  d.workout = selected + ' • ' + formatDurationLabel(mins);
  d.workoutHistory[today()] = { scheduled, completed: true, actual: d.workout };
  rewardOnce('workoutCompleted', 50, 'Workout complete');

  // Chosen training intensity & body weight
  const intensity = document.getElementById('workoutIntensity')?.value || 'moderate';
  d.workoutIntensity = intensity;
  const weight = getEffectiveWorkoutWeight();
  const item = WORKOUT_INTENSITY_MET[intensity] || WORKOUT_INTENSITY_MET.moderate;

  // ---> GYM SESSION CALORIE BURN CALCULATION:
  // Dynamically calculated based on body weight, duration, and chosen training intensity (factoring rest periods between sets)
  const gymKcal = calculateGymCalories(mins, weight, intensity);

  // Set ONLY that workout burn value on the home page as requested
  if (typeof v9 !== 'undefined') {
    v9.activity = selected; // e.g. "Chest + Triceps", "Back + Biceps", "Leg Day", etc.
    v9.lastWorkout = today();
    v9.lastActivityDate = today();
    v9.burned = gymKcal; // Show only that value on the home page
    saveV9();
  }

  save(false);
  document.getElementById('workoutMinutes').value = '';
  updateBarUnit(document.getElementById('workoutMinutes'), 'workoutBarUnit');
  updateWorkoutCaloriePreview();
  const weightMsg = weightLogged ? ' · ⚖️ ' + d.weight + ' kg recorded' : '';
  document.getElementById('workoutSaved').textContent = 'Saved ✓ ' + esc(selected) + ' completed (' + formatDurationLabel(mins) + ') · 🔥 ' + gymKcal + ' kcal burned (' + item.label + ' · ' + weight + ' kg)' + weightMsg;
  render();
  renderCalendar();
  if (typeof renderV9 === 'function') renderV9();
  toast('Gym workout saved ✓ ' + gymKcal + ' kcal burned on Home Page!' + (weightLogged ? ' (Weight: ' + d.weight + ' kg)' : ''));
}

function saveSpent() {
  const value = +document.getElementById('spent').value;
  if (!Number.isFinite(value) || value < 0) {
    document.getElementById('spentResult').textContent = 'Enter a valid amount.';
    toast('Enter a valid amount');
    return;
  }
  d.spent = value;
  save(false);
  document.getElementById('spent').value = '';
  document.getElementById('spentResult').textContent = 'Saved ✓ Today’s spending updated.';
  render();
  toast('Spending saved ✓');
}

function fillProfile() {
  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.value = d.name || '';
  const ageEl = document.getElementById('profileAge');
  if (ageEl) ageEl.value = d.age || '';
  document.getElementById('profileGoal').value = d.goalWeight || '';
  document.getElementById('profileProtein').value = d.proteinTarget || 150;
  document.getElementById('profileWaterTarget').value = d.waterTarget || 3;
  document.getElementById('profileCalories').value = d.calorieTarget || 2200;
  document.getElementById('profileBudget').value = d.budgetTarget || 250;
  document.getElementById('profileWeight').value = d.weight || '';
  document.getElementById('profileWater').value = d.water || '';
  document.getElementById('profileSpent').value = d.spent || '';
  document.getElementById('profileWorkout').value = d.workout || '';
}

function saveProfile() {
  const nameVal = document.getElementById('profileName')?.value.trim();
  const ageVal = +document.getElementById('profileAge')?.value;
  let goal = +document.getElementById('profileGoal').value,
    protein = +document.getElementById('profileProtein').value,
    water = +document.getElementById('profileWaterTarget').value,
    calories = +document.getElementById('profileCalories').value,
    budget = +document.getElementById('profileBudget').value;
  if (!(goal > 0 && protein > 0 && water > 0 && calories > 0 && budget >= 0)) {
    document.getElementById('profileSaved').textContent = 'Enter valid targets.';
    toast('Enter valid targets');
    return;
  }
  if (nameVal) d.name = nameVal;
  if (ageVal > 0) d.age = ageVal;
  d.goalWeight = goal;
  d.proteinTarget = protein;
  d.waterTarget = water;
  d.calorieTarget = calories;
  d.budgetTarget = budget;
  save(false);
  render();
  document.getElementById('profileSaved').textContent = 'Updated ✓ Goals saved successfully.';
  toast('Goals updated ✓');
}

function saveDailyEdits() {
  let weight = +document.getElementById('profileWeight').value,
    water = +document.getElementById('profileWater').value,
    spent = +document.getElementById('profileSpent').value;
  if (!(weight > 0 && water >= 0 && spent >= 0)) {
    document.getElementById('dailySaved').textContent = 'Enter valid values.';
    toast('Enter valid values');
    return;
  }
  d.weight = weight;
  d.water = water;
  d.spent = spent;
  d.workout = document.getElementById('profileWorkout').value.trim();
  let latest = [...d.history].reverse().find(x => x.date === today());
  if (latest) latest.weight = weight;
  else d.history.push({ date: today(), weight });
  save(false);
  render();
  document.getElementById('profileWeight').value = '';
  document.getElementById('profileWater').value = '';
  document.getElementById('profileSpent').value = '';
  document.getElementById('profileWorkout').value = '';
  document.getElementById('dailySaved').textContent = 'Updated ✓ Today’s data saved successfully.';
  toast('Today’s data updated ✓');
}

function saveFoodEdit(i) {
  let n = document.getElementById('foodName' + i).value.trim(),
    p = +document.getElementById('foodProtein' + i).value,
    c = +document.getElementById('foodCalories' + i).value;
  if (!n || p < 0 || c < 0) {
    toast('Enter valid food values');
    return;
  }
  d.foods[i] = { n, p, c };
  save(false);
  render();
  toast('Food updated ✓');
}

function removeFood(i) {
  d.foods.splice(i, 1);
  save(false);
  render();
  toast('Food removed ✓ Updated today’s data');
}

function resetApp() {
  if (!confirm('Reset DEQX FIT? This will permanently erase your power level, streak, XP, workouts, food logs, spending, and user profile.')) return;
  
  // Preserve custom foods and activities so the user's libraries are not lost
  const preservedCustomFoods = (d && Array.isArray(d.customFoods)) ? [...d.customFoods] : [];
  const preservedCustomActivities = (d && Array.isArray(d.customActivities)) ? [...d.customActivities] : [];

  // Reset cloud data if logged in
  if (typeof cloudResetUserTables === 'function') {
    cloudResetUserTables();
  }

  // 1. Wipe state completely (preserving food and activity selection libraries)
  d = {
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
    date: today(),
    xp: 0,
    rewardDays: {},
    workoutHistory: {},
    workoutOverrides: {},
    workoutAnchor: { date: today(), split: 'Leg Day' },
    attendanceStreak: 0,
    streakStartDate: today(),
    streakHistory: {},
    lastAttendanceDate: today(),
    customFoods: preservedCustomFoods,
    customActivities: preservedCustomActivities,
    onboarded: false
  };

  // 2. Wipe v9 power level, XP, streak, burned completely
  if (typeof v9 !== 'undefined') {
    v9.activity = null;
    v9.burned = 0;
    v9.streak = 0;
    v9.lastWorkout = null;
    v9.lastActivityDate = null;
    v9.xp = 0;
    v9.level = 1;
    if (typeof saveV9 === 'function') saveV9();
  }

  // 3. Clear localStorage
  localStorage.setItem(KEY, JSON.stringify(d));
  if (typeof V9KEY !== 'undefined') localStorage.setItem(V9KEY, JSON.stringify(v9));
  localStorage.removeItem('deqx_food_draft');
  ['fitRadhadevanV5', 'fitRadhadevanV4', 'fitRadhadevanV3', 'fitRadhadevanV2', 'fitRadhadevan'].forEach(k => localStorage.removeItem(k));

  // 4. Reset calendar & navigation
  calendarCursor = new Date();
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  document.getElementById('home').classList.add('active');
  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  document.getElementById('n-home').classList.add('active');

  // 5. Re-render UI in reset state (keeping food and activity selection visible)
  renderQuickFoodGrid();
  renderCustomFoods();
  renderActivityChoices();
  renderCustomActivities();
  renderFoodDraft();
  render();
  if (typeof renderV9 === 'function') renderV9();
  fillProfile();

  // 6. Open the Onboarding Setup Screen (mandatory to unlock app)
  openOnboardingModal();
  toast('DEQX FIT has been reset. Please set up your profile.');
}

/* ===== ONBOARDING SETUP CONTROLLERS ===== */
function checkOnboardingStatus() {
  if (!d.onboarded || !d.name || !d.weight || !d.goalWeight) {
    openOnboardingModal();
  } else {
    closeOnboardingModal();
  }
}

function openOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (!modal) return;
  modal.classList.add('show');
  document.body.classList.add('onboarding-locked');

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
}

function closeOnboardingModal() {
  const modal = document.getElementById('onboardingModal');
  if (modal) modal.classList.remove('show');
  document.body.classList.remove('onboarding-locked');
}

function submitOnboarding() {
  const nameEl = document.getElementById('onboardName');
  const ageEl = document.getElementById('onboardAge');
  const curWEl = document.getElementById('onboardCurrentWeight');
  const goalWEl = document.getElementById('onboardTargetWeight');

  const name = nameEl ? nameEl.value.trim() : '';
  const age = ageEl ? Number(ageEl.value) : 0;
  const currentWeight = curWEl ? Number(curWEl.value) : 0;
  const targetWeight = goalWEl ? Number(goalWEl.value) : 0;

  if (!name) {
    showOnboardError('Please enter your name.');
    if (nameEl) nameEl.focus();
    return;
  }
  if (!age || age < 10 || age > 120) {
    showOnboardError('Please enter a valid age (between 10 and 120).');
    if (ageEl) ageEl.focus();
    return;
  }
  if (!currentWeight || currentWeight < 20 || currentWeight > 300) {
    showOnboardError('Please enter your current weight (between 20 and 300 kg).');
    if (curWEl) curWEl.focus();
    return;
  }
  if (!targetWeight || targetWeight < 20 || targetWeight > 300) {
    showOnboardError('Please enter your target weight (between 20 and 300 kg).');
    if (goalWEl) goalWEl.focus();
    return;
  }

  const water = Number(document.getElementById('onboardWater')?.value) || 3;
  const protein = Number(document.getElementById('onboardProtein')?.value) || 150;
  const calories = Number(document.getElementById('onboardCalories')?.value) || 2200;
  const budget = Number(document.getElementById('onboardBudget')?.value) || 250;

  d.name = name;
  d.age = age;
  d.weight = currentWeight;
  d.goalWeight = targetWeight;
  d.startWeight = currentWeight;
  d.waterTarget = water;
  d.proteinTarget = protein;
  d.calorieTarget = calories;
  d.budgetTarget = budget;
  d.history = [{ date: today(), weight: currentWeight }];
  d.onboarded = true;
  d.attendanceStreak = 0;
  d.streakStartDate = today();
  d.streakHistory = {};
  d.lastAttendanceDate = today();

  if (typeof v9 !== 'undefined') {
    v9.level = 1;
    v9.xp = 0;
    v9.streak = 0;
    v9.burned = 0;
    saveV9();
  }

  save(false);
  render();
  if (typeof renderV9 === 'function') renderV9();
  fillProfile();

  if (typeof cloudQueueSync === 'function') cloudQueueSync();

  closeOnboardingModal();
  show('home');
  toast('🔥 Welcome, ' + d.name + '! Your profile has been initialized.');
}

function showOnboardError(msg) {
  const errEl = document.getElementById('onboardError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } else {
    alert(msg);
  }
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderCalendar() {
  const y = calendarCursor.getFullYear(),
    m = calendarCursor.getMonth();
  const first = new Date(y, m, 1),
    days = new Date(y, m + 1, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const monthEl = document.getElementById('calendarMonth');
  if (monthEl) monthEl.textContent = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(first);

  let out = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => '<div class="calWeek">' + x + '</div>').join('');
  for (let i = 0; i < start; i++) out += '<div class="calDay empty"></div>';
  const now = new Date(),
    todayIso = isoDate(now);
  for (let day = 1; day <= days; day++) {
    let dt = new Date(y, m, day),
      iso = isoDate(dt),
      sch = scheduleForDate(dt),
      isToday = iso === todayIso,
      isWork = sch !== 'Rest',
      completed = !!d.workoutHistory[iso]?.completed;
    out += '<div class="calDay ' + (isWork ? 'workday ' : 'rest ') + (isToday ? 'today ' : '') + (completed ? 'completed' : '') + '" onclick="openCalendarDayAdjust(\'' + iso + '\')" title="Tap to adjust routine from this day"><div class="dateNum">' + day + '</div><div class="calWorkout">' + (sch === 'Rest' ? 'REST' : esc(sch.replace(' + ', ' +<br>'))).replace(/&lt;br&gt;/g, '<br>') + '</div></div>';
  }
  const grid = document.getElementById('calendarGrid');
  if (grid) grid.innerHTML = out;

  const todaySchedule = scheduleForDate(now),
    done = !!d.workoutHistory[todayIso]?.completed;
  const missionEl = document.getElementById('calendarTodayMission');
  if (missionEl) {
    missionEl.innerHTML = todaySchedule === 'Rest'
      ? '<span class="restBadge">😴 <b>Today is a rest day.</b> Weekend recovery is not counted against your workout streak.</span>'
      : done
      ? '✅ <b>Workout completed.</b> Today’s mission is cleared.'
      : '🔥 <b>Today:</b> ' + esc(todaySchedule) + ' · Complete it to earn <b>+50 XP</b>.';
  }
  const title = document.getElementById('workoutScheduleTitle');
  if (title) title.textContent = todaySchedule;
  const subtitle = document.getElementById('workoutScheduleText');
  if (subtitle) {
    subtitle.textContent = todaySchedule === 'Rest'
      ? 'Rest and recover. Saturday and Sunday do not count as workout days.'
      : 'This is today’s scheduled workout. Finish it to earn XP.';
  }
  const sel = document.getElementById('workoutSelect');
  if (sel && [...sel.options].some(o => o.value === todaySchedule)) sel.value = todaySchedule;
  const intSel = document.getElementById('workoutIntensity');
  if (intSel && d.workoutIntensity) intSel.value = d.workoutIntensity;
  const wInput = document.getElementById('workoutWeight');
  if (wInput && !wInput.value) {
    wInput.placeholder = d.weight ? 'Current: ' + d.weight + ' kg (optional)' : 'Current weight in kg (optional)';
  }
  updateWorkoutCaloriePreview();
}

function changeMonth(delta) {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
  renderCalendar();
}

/* Dynamic Renderers for Quick Foods & Activities */
function renderQuickFoodGrid() {
  const container = document.getElementById('quickFoodGrid');
  if (!container) return;
  container.innerHTML = QUICK_FOODS.map(item => `
    <div class="quickFoodBtn" data-food-key="${item.key}" role="button" tabindex="0">
      <span>${item.icon}</span><b>${esc(item.name)}</b><small>${esc(item.portion)}</small>
    </div>
  `).join('');
  if (typeof renderFoodDraft === 'function') renderFoodDraft();
}

function renderActivityChoices() {
  const container = document.getElementById('activityChoices');
  if (!container) return;
  const allActs = [...ACTIVITIES, ...(d.customActivities || [])];

  container.innerHTML = allActs.map(act => `
    <button class="activityChoice" data-activity="${act.id}">
      ${act.isCustom ? `<span class="deleteCustomActBtn" onclick="event.stopPropagation(); removeCustomActivity('${act.id}')" title="Delete custom activity">✕</span>` : ''}
      <span>${act.icon || '⚡'}</span>
      <b>${esc(act.label || act.name)}</b>
      <small>${esc(act.sub || 'Custom')}</small>
    </button>
  `).join('');

  container.querySelectorAll('.activityChoice').forEach(b => {
    b.addEventListener('click', () => {
      container.querySelectorAll('.activityChoice').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      v9.activity = b.dataset.activity;
      saveV9();
      renderV9();
    });
  });
}

function saveCustomActivity() {
  const nameInput = document.getElementById('customActivityName');
  const catInput = document.getElementById('customActivityCategory');
  const iconInput = document.getElementById('customActivityIcon');
  const metInput = document.getElementById('customActivityMET');
  const res = document.getElementById('customActivityResult');

  const name = nameInput ? nameInput.value.trim() : '';
  const sub = (catInput ? catInput.value.trim() : '') || 'Custom';
  const icon = (iconInput ? iconInput.value : '') || '⚡';
  const met = Number(metInput ? metInput.value : 7) || 7;

  if (!name) {
    if (res) {
      res.style.display = 'block';
      res.innerHTML = '<div class="result" style="color:#ff8b8b">Please enter an activity name.</div>';
    }
    return;
  }

  const id = 'act_' + Date.now();
  d.customActivities = d.customActivities || [];
  d.customActivities.push({
    id: id,
    label: name.toUpperCase(),
    name: name,
    sub: sub,
    icon: icon,
    met: met,
    isCustom: true
  });

  save(false);
  if (nameInput) nameInput.value = '';
  if (catInput) catInput.value = '';
  if (res) {
    res.style.display = 'block';
    res.innerHTML = '<div class="result" style="color:var(--lime)">Saved ✓ ' + esc(name) + ' added to activity choices!</div>';
  }

  renderActivityChoices();
  renderCustomActivities();
  toast('Custom activity added ✓');
}

function removeCustomActivity(id) {
  if (!confirm('Remove this custom activity?')) return;
  d.customActivities = (d.customActivities || []).filter(x => x.id !== id);
  if (v9.activity === id) {
    v9.activity = null;
    saveV9();
  }
  save(false);
  renderActivityChoices();
  renderCustomActivities();
  renderV9();
  toast('Custom activity removed');
}

function renderCustomActivities() {
  const el = document.getElementById('customActivityList');
  if (!el) return;
  const list = d.customActivities || [];
  if (!list.length) {
    el.innerHTML = '<p class="muted">No custom activities yet.</p>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="customFoodItem">
      <div class="customFoodMeta">
        <b>${a.icon || '⚡'} ${esc(a.name || a.label)}</b>
        <small>${esc(a.sub || 'Custom')} • ~${a.met || 7} MET</small>
      </div>
      <div class="actions">
        <button onclick="selectActivity('${esc(a.id)}')">+ Select</button>
        <button class="deleteBtn" onclick="removeCustomActivity('${esc(a.id)}')">×</button>
      </div>
    </div>
  `).join('');
}

function selectActivity(actId) {
  v9.activity = actId;
  saveV9();
  renderV9();
  const found = (d.customActivities || []).find(x => x.id === actId);
  toast('Selected ' + (found ? found.name : actId));
}

function render() {
  ensureTodayState();
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const setHtml = (id, val) => { const e = document.getElementById(id); if (e) e.innerHTML = val; };
  const setVal = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
  const bar = (id, val) => { const e = document.getElementById(id); if (e) e.style.width = val + '%'; };
  const styleProp = (id, prop, val) => { const e = document.getElementById(id); if (e) e.style.setProperty(prop, val); };

  let p = d.foods.reduce((a, x) => a + (Number(x.p) || 0), 0),
    c = d.foods.reduce((a, x) => a + (Number(x.c) || 0), 0);
  const startW = Number(d.startWeight) || (d.history && d.history.length ? Number(d.history[0].weight) : null) || Number(d.weight) || 75;
  const curW = Number(d.weight) || startW;
  const goalW = Number(d.goalWeight) || startW;
  let gp = 0;
  if (startW !== goalW) {
    if (startW > goalW) {
      gp = Math.max(0, Math.min(100, ((startW - curW) / Math.max(0.1, startW - goalW)) * 100));
    } else {
      gp = Math.max(0, Math.min(100, ((curW - startW) / Math.max(0.1, goalW - startW)) * 100));
    }
  } else {
    gp = 100;
  }
  const li = levelInfo();

  set('weightHome', Number(curW).toFixed(1));
  set('goalWeightHome', Number(goalW).toFixed(0));
  const diff = (curW - goalW);
  const remText = diff > 0 
    ? diff.toFixed(1) + ' kg remaining' 
    : diff < 0 
    ? Math.abs(diff).toFixed(1) + ' kg to gain' 
    : 'Goal reached! 🎉';
  set('remaining', remText);
  styleProp('ring', '--p', gp + '%');
  set('ringText', Math.round(gp) + '%');

  const heroSub = document.querySelector('.hero .sub');
  if (heroSub) {
    heroSub.textContent = d.name ? ('WELCOME, ' + d.name.toUpperCase() + ' · TRAIN & TRANSFORM') : 'TRAIN · TRACK · TRANSFORM';
  }
  const av = document.querySelector('.hero .avatar');
  if (av) {
    if (d.name) {
      const parts = d.name.trim().split(/\s+/);
      av.textContent = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : d.name.slice(0, 2).toUpperCase();
      av.title = d.name;
    } else {
      av.textContent = 'DQX';
      av.title = 'DEQX FIT';
    }
  }

  set('proteinView', Math.round(p));
  set('waterView', Number(d.water || 0).toFixed(2).replace(/\.00$/, ''));
  set('calView', Math.round(c));

  set('proteinTargetHome', d.proteinTarget);
  set('waterTargetHome', d.waterTarget);
  set('waterQuickTarget', d.waterTarget);
  set('calorieTargetHome', Number(d.calorieTarget).toLocaleString('en-IN'));
  set('budgetTargetView', d.budgetTarget);

  bar('proteinBar', Math.min(100, (p / d.proteinTarget) * 100));
  bar('waterBar', Math.min(100, (d.water / d.waterTarget) * 100));
  set('workoutText', d.workout || 'No workout logged yet.');

  set('levelBadge', 'LV ' + li.level);
  set('levelView', li.level);
  set('rankName', li.rank);
  set('xpView', li.within);
  set('xpNextView', li.next);
  bar('xpBar', li.pct);

  const now = new Date(),
    sch = scheduleForDate(now),
    done = !!d.workoutHistory[isoDate(now)]?.completed;
  set('missionTitle', sch);
  set('missionDay', now.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase() + ' · TODAY');
  set('missionXp', sch === 'Rest' ? 'RECOVERY' : '+50 XP');
  setHtml('missionStatus', sch === 'Rest' ? '😴 <b>Rest day.</b> Weekend recovery is protected and does not count against your workout streak.' : done ? '✅ <b>Mission complete.</b> Great work today.' : '🔥 Complete <b>' + esc(sch) + '</b> to earn <b>+50 XP</b>.');

  set('foodTotal', p.toFixed(1) + ' g protein • ' + c + ' kcal');
  setHtml('foodList', d.foods.length
    ? d.foods.map((x, i) => '<div class="food" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><span>' + esc(x.n) + '</span><div style="display:flex;align-items:center;gap:10px"><span>' + Number(x.p).toFixed(1) + 'g • ' + x.c + ' kcal</span><button type="button" class="deleteBtn" style="padding:4px 8px;font-size:12px;background:#39201f;color:#ffb1aa;border-radius:6px;border:none;cursor:pointer;line-height:1" onclick="removeFood(' + i + ')" title="Delete food">🗑️</button></div></div>').join('')
    : '<p class="muted">No food logged yet.</p>'
  );

  setHtml('history', (d.history && d.history.length)
    ? [...d.history].reverse().slice(0, 15).map((x, revIdx) => {
        const realIdx = d.history.length - 1 - revIdx;
        return '<div class="food" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px">' +
          '<span>' + esc(x.date) + '</span>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<b>' + x.weight + ' kg</b>' +
            '<button type="button" class="deleteBtn" style="padding:2px 7px;font-size:11px;background:#39201f;color:#ffb1aa;border-radius:6px;border:none;cursor:pointer" onclick="removeWeightEntry(' + realIdx + ')" title="Delete entry">✕</button>' +
          '</div>' +
        '</div>';
      }).join('')
    : '<p class="muted" style="font-size:12px;padding:8px 0">No weight history logged yet.</p>'
  );

  setHtml('profileFoodList', d.foods.length
    ? d.foods.map((x, i) => '<div class="card" style="padding:11px;margin-bottom:8px;background:#10130f"><input id="foodName' + i + '" value="' + esc(x.n) + '"><div class="editGrid"><input id="foodProtein' + i + '" type="number" step=".1" value="' + x.p + '"><input id="foodCalories' + i + '" type="number" value="' + x.c + '"></div><div class="editActions"><button onclick="saveFoodEdit(' + i + ')">Save</button><button class="deleteBtn" onclick="removeFood(' + i + ')">Remove</button></div></div>').join('')
    : '<p class="muted">No food logged today.</p>'
  );

  setVal('spent', d.spent || '');
  fillProfile();
  renderQuickFoodGrid();
  renderCustomFoods();
  renderActivityChoices();
  renderCustomActivities();
  renderFoodDraft();
  renderCalendar();
  updateDailyAnalytics();
  updateSpendRing();
}

function updateDailyAnalytics() {
  const p = d.foods.reduce((a, x) => a + (Number(x.p) || 0), 0),
    c = d.foods.reduce((a, x) => a + (Number(x.c) || 0), 0);
  const burn = (typeof v9 !== 'undefined' && v9.burned) || 0;
  const done = !!d.workoutHistory[isoDate(new Date())]?.completed;
  const pct = (v, t) => Math.min(100, Math.round(((Number(v) || 0) / Math.max(1, Number(t) || 1)) * 100));
  const pp = pct(p, d.proteinTarget),
    wp = pct(d.water, d.waterTarget),
    cp = pct(c, d.calorieTarget),
    bp = pct(burn, 500),
    gp = done ? 100 : 0;
  const daily = Math.round((pp + wp + cp + bp + gp) / 5);

  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const bar = (id, val) => { const e = document.getElementById(id); if (e) e.style.width = val + '%'; };

  set('todayDate', todayLabel());
  set('dailyPercent', daily);
  set('dailyRingText', daily + '%');
  set('dayState', daily >= 100 ? 'COMPLETE' : 'IN PROGRESS');

  const dr = document.getElementById('dailyRing');
  if (dr) dr.style.setProperty('--p', daily + '%');

  set('dailyMessage', daily >= 100
    ? 'All daily targets are complete. Strong day.'
    : daily === 0
    ? 'Your day starts here. Every logged goal moves the ring forward.'
    : daily < 50
    ? 'Good start. Keep stacking small wins.'
    : 'You are building momentum. Keep going.');

  set('proteinPct', pp + '%');
  set('waterPct', wp + '%');
  set('caloriePct', cp + '%');
  set('burnPctHome', bp + '%');

  set('proteinView', Math.round(p));
  set('waterView', Number(d.water || 0).toFixed(2).replace(/\.00$/, ''));
  set('calView', Math.round(c));
  set('burnHome', Math.round(burn));

  set('proteinTargetHome', d.proteinTarget);
  set('waterTargetHome', d.waterTarget);
  set('calorieTargetHome', Number(d.calorieTarget).toLocaleString('en-IN'));

  set('proteinRow', Math.round(p));
  set('proteinRowTarget', d.proteinTarget);
  set('waterRow', d.water);
  set('waterRowTarget', d.waterTarget);
  set('calRow', Math.round(c));
  set('calRowTarget', Number(d.calorieTarget).toLocaleString('en-IN'));
  set('burnRow', burn);
  set('workoutRowText', done ? 'Completed' : 'Not completed');
  set('workoutRowPct', gp + '%');

  set('proteinRowPct', pp + '%');
  set('waterRowPct', wp + '%');
  set('calRowPct', cp + '%');
  set('burnRowPct', bp + '%');

  bar('proteinBar', pp);
  bar('waterBar', wp);
  bar('calorieBar', cp);
  bar('calorieBurnBarHome', bp);
  bar('proteinRowBar', pp);
  bar('waterRowBar', wp);
  bar('calRowBar', cp);
  bar('burnRowBar', bp);
  bar('workoutRowBar', gp);

  const startW = Number(d.startWeight) || (d.history && d.history.length ? Number(d.history[0].weight) : null) || Number(d.weight) || 75;
  const curW = Number(d.weight) || startW;
  const goalW = Number(d.goalWeight) || startW;
  let goalProgress = 0;
  if (startW !== goalW) {
    if (startW > goalW) {
      goalProgress = Math.max(0, Math.min(100, ((startW - curW) / Math.max(0.1, startW - goalW)) * 100));
    } else {
      goalProgress = Math.max(0, Math.min(100, ((curW - startW) / Math.max(0.1, goalW - startW)) * 100));
    }
  } else {
    goalProgress = 100;
  }
  bar('weightMiniBar', goalProgress);
  bar('weightJourneyBar', goalProgress);
  set('weightMiniText', Math.round(goalProgress) + '% toward goal');
  set('weightHome2', Number(curW).toFixed(1));
  set('goalWeightHome2', Number(goalW).toFixed(0));
  set('weightHome', Number(curW).toFixed(1));
  set('goalWeightHome', Number(goalW).toFixed(0));
  const diff = (curW - goalW);
  const remText = diff > 0 
    ? diff.toFixed(1) + ' kg remaining' 
    : diff < 0 
    ? Math.abs(diff).toFixed(1) + ' kg to gain' 
    : 'Goal reached! 🎉';
  set('remaining2', remText);
  set('remaining', remText);
  set('rankHome', (typeof v9 !== 'undefined' && v9.level > 5) ? 'Elite' : (typeof v9 !== 'undefined' && v9.level > 2 ? 'Rising' : 'Rookie'));

  const streakRes = computeAndUpdateStreak(daily);
  const streakCount = streakRes.streakCount;
  set('todayStreakCount', streakCount);
  set('streakHome', streakCount);
  set('streakView', streakCount);
  set('streakUnit', streakCount === 1 ? 'day' : 'days');
  set('streakHomeUnit', streakCount === 1 ? 'day' : 'days');
  set('activityStreakView', streakCount);
  set('activityStreakUnit', streakCount === 1 ? ' DAY' : ' DAYS');
  const streakViewWrap = document.getElementById('streakViewWrap');
  if (streakViewWrap) streakViewWrap.innerHTML = `<span id="streakView">${streakCount}</span> <span id="streakUnit">${streakCount === 1 ? 'day' : 'days'}</span>`;

  const badge = document.getElementById('todayStreakBadge');
  if (badge) {
    badge.classList.toggle('blinking', true);
  }

  renderWeeklyRhythm(daily);
  set('modalDailyPercent', daily + '%');
  set('modalDayState', daily >= 100 ? 'COMPLETE' : 'IN PROGRESS');
  set('modalDailyMessage', daily >= 100
    ? 'All daily targets are complete. Strong day.'
    : daily === 0
    ? 'Your day starts here. Every logged goal moves the ring forward.'
    : daily < 50
    ? 'Good start. Keep stacking small wins.'
    : 'You are building momentum. Keep going.');
  const mdr = document.getElementById('modalDailyRing');
  if (mdr) mdr.style.setProperty('--p', daily + '%');
  const mtd = document.getElementById('modalTodayDate');
  if (mtd) mtd.textContent = todayLabel();
}

function toast(msg) {
  document.body.classList.remove('uiPulse');
  void document.body.offsetWidth;
  document.body.classList.add('uiPulse');
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => t.classList.remove('show'), 1700);
}

function savedFeedback(message, sectionId, resetFn) {
  render();
  if (sectionId) show(sectionId);
  if (typeof resetFn === 'function') resetFn();
  toast(message || 'Saved ✓');
}

/* ===== v9 Activity + XP + streak + swipe ===== */
const V9KEY = 'deqxFitV9';
var v9 = JSON.parse(localStorage.getItem(V9KEY) || 'null') || { activity: null, burned: 0, streak: 0, lastWorkout: null, xp: 0, level: 1 };
const ACTIVITY_MET = { Badminton: 7, Cricket: 5 };

function saveV9() {
  localStorage.setItem(V9KEY, JSON.stringify(v9));
  if (typeof cloudUser !== 'undefined' && cloudUser) {
    localDirty = true;
    if (typeof cloudQueueSync === 'function') cloudQueueSync();
  }
}

function earnXP(amount, reason) {
  const before = v9.level;
  v9.xp += Math.max(0, Math.round(amount));
  while (v9.xp >= v9.level * 100) {
    v9.xp -= v9.level * 100;
    v9.level++;
  }
  saveV9();
  renderV9();
  if (v9.level > before) showLevelUpV9();
}

function showLevelUpV9() {
  const t = document.getElementById('levelUpText');
  if (t) t.textContent = 'Level ' + v9.level + ' unlocked';
  const overlay = document.getElementById('levelUpOverlay');
  if (overlay) overlay.classList.add('show');
}

function closeLevelUp() {
  const overlay = document.getElementById('levelUpOverlay');
  if (overlay) overlay.classList.remove('show');
}

function calculateActivityCalories(activityId, mins, weight, intensity) {
  let met = ACTIVITY_MET[activityId];
  let displayName = activityId;
  if (!met && d.customActivities) {
    const custom = d.customActivities.find(x => x.id === activityId);
    if (custom) {
      met = Number(custom.met) || 7;
      displayName = custom.name || custom.label;
    }
  }
  met = met || 7;
  const mult = { light: 0.82, moderate: 1, hard: 1.18 }[intensity] || 1;

  // IN BADMINTON: calculate calories burned of HALF of the entered value (50% active play & rest intervals)
  const isBadminton = (String(activityId).toLowerCase() === 'badminton' || (displayName && String(displayName).trim().toLowerCase() === 'badminton'));
  const effectiveMins = isBadminton ? (mins * 0.5) : mins;

  // Physiological calorie burn calculation factoring body weight and standard MET multiplier (1.05)
  const kcal = Math.round(met * weight * (effectiveMins / 60) * mult * 1.05);
  return {
    kcal,
    met,
    displayName,
    isBadminton,
    effectiveMins
  };
}
window.calculateActivityCalories = calculateActivityCalories;

function updateActivityCaloriePreview() {
  const valEl = document.getElementById('activityCalorieValue');
  const formulaEl = document.getElementById('activityCalorieFormula');
  if (!valEl || !formulaEl) return;

  const rawMins = document.getElementById('activityMinutes')?.value;
  const parsedMins = parseDurationToMinutes(rawMins);
  const mins = Math.min(600, Math.max(1, parsedMins || 45));
  const intensity = document.getElementById('activityIntensity')?.value || 'moderate';
  const weight = Math.max(40, Math.min(180, Number(d?.weight) || 70));

  if (!v9?.activity) {
    valEl.textContent = '--';
    formulaEl.textContent = 'Select an activity above to preview calories';
    return;
  }

  const { kcal, displayName, isBadminton, effectiveMins } = calculateActivityCalories(v9.activity, mins, weight, intensity);
  valEl.textContent = kcal;
  const durStr = formatDurationLabel(mins);
  const badmintonTag = isBadminton ? ' · (50% of ' + durStr + ' active play)' : '';
  formulaEl.textContent = `${durStr} ${displayName}${badmintonTag} · ${weight} kg · ${intensity}`;
}
window.updateActivityCaloriePreview = updateActivityCaloriePreview;

function calculateActivity() {
  if (!v9.activity) {
    toast('Choose an activity first');
    show('activity');
    return;
  }
  const rawMins = document.getElementById('activityMinutes')?.value;
  const parsedMins = parseDurationToMinutes(rawMins);
  const mins = Math.min(600, Math.max(1, parsedMins || 45));
  const intensity = document.getElementById('activityIntensity').value;
  const weight = Math.max(40, Math.min(180, Number(d?.weight) || 70));

  const { kcal, displayName, isBadminton, effectiveMins } = calculateActivityCalories(v9.activity, mins, weight, intensity);

  // Set home page burned calories to this activity session's value
  v9.burned = kcal;
  v9.lastActivityDate = today();
  saveV9();

  const res = document.getElementById('activityResult');
  if (res) {
    res.style.display = 'block';
    const badmintonBadge = isBadminton ? '<br><small style="color:#b8f53a">🏸 Badminton calculated on half duration (' + formatDurationLabel(effectiveMins) + ' active play factoring rest intervals)</small>' : '';
    res.innerHTML = '✅ <b>Saved ✓ ' + kcal + ' kcal</b> · ' + formatDurationLabel(mins) + ' ' + esc(displayName) + badmintonBadge + '<br><small style="color:#a6b69e">' + weight + ' kg · ' + intensity + ' intensity · Shown on Home page</small>';
  }
  earnXP(Math.min(60, Math.round(kcal / 10)), 'activity');
  document.getElementById('activityMinutes').value = '45';
  updateBarUnit(document.getElementById('activityMinutes'), 'activityBarUnit');
  document.getElementById('activityIntensity').value = 'moderate';
  document.querySelectorAll('.activityChoice').forEach(x => x.classList.remove('selected'));
  v9.activity = null;
  saveV9();
  render();
  renderV9();
  updateActivityCaloriePreview();
  toast('Activity saved ✓ ' + kcal + ' kcal burned on Home!');
}

function updateStreak() {
  const key = today();
  if (typeof v9 !== 'undefined') {
    if (v9.lastWorkout === key) return;
    v9.lastWorkout = key;
    earnXP(50, 'workout');
    saveV9();
  }
  updateDailyAnalytics();
}

function renderV9() {
  document.querySelectorAll('.activityChoice').forEach(b => b.classList.toggle('selected', b.dataset.activity === v9.activity));
  const summary = document.getElementById('activitySummary');
  if (summary) {
    let actName = v9.activity;
    if (v9.activity && d.customActivities) {
      const custom = d.customActivities.find(x => x.id === v9.activity);
      if (custom) actName = custom.name || custom.label;
    }
    summary.textContent = actName ? actName + ' selected' : 'Choose an activity';
  }
  const burn = v9.burned || 0,
    target = 500,
    percent = Math.min(100, Math.round((burn / target) * 100)),
    next = v9.level * 100,
    xpPct = Math.min(100, Math.round((v9.xp / next) * 100));

  ['burnView', 'burnHome'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = burn;
  });
  const bar = document.getElementById('burnBar');
  if (bar) bar.style.width = percent + '%';
  const homeBar = document.getElementById('calorieBurnBarHome');
  if (homeBar) homeBar.style.width = percent + '%';
  const bp = document.getElementById('burnPercent');
  if (bp) bp.textContent = percent + '%';
  const bt = document.getElementById('burnTargetLabel');
  if (bt) bt.textContent = burn + ' / ' + target + ' kcal';
  const lv = document.getElementById('levelHome');
  if (lv) lv.textContent = v9.level;
  const xp = document.getElementById('xpHome');
  if (xp) xp.textContent = v9.xp;
  const xn = document.getElementById('xpNextHome');
  if (xn) xn.textContent = next;
  const xb = document.getElementById('xpBarHome');
  if (xb) xb.style.width = xpPct + '%';
  const currentStreak = Number(d?.attendanceStreak) || 0;
  const sUnit = currentStreak === 1 ? 'day' : 'days';
  ['streakHome', 'streakView'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = currentStreak;
  });
  const su = document.getElementById('streakUnit');
  if (su) su.textContent = sUnit;
  const shu = document.getElementById('streakHomeUnit');
  if (shu) shu.textContent = sUnit;
  updateDailyAnalytics();
  updateActivityCaloriePreview();
}

const oldSaveWorkout = window.saveWorkout;
window.saveWorkout = function () {
  oldSaveWorkout();
  updateStreak();
};

/* Delegated food-tap handler guarantees quick-food buttons work */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-food-key]');
  if (btn && !e.target.closest('.ctrlBtn')) {
    e.preventDefault();
    addQuickFood(btn.dataset.foodKey);
  }
});

/* Swipe & Gestures between bottom sections */
const swipeOrder = ['home', 'food', 'activity', 'workout', 'budget', 'profile'];
let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

document.addEventListener('touchstart', e => {
  if (!e.touches[0]) return;
  const target = e.target;
  // Ignore inputs, buttons, sliders, modals
  if (target.closest('input, textarea, select, .modalBox, .targetMapBox, .levelUpBox, .calendarTrack')) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}, { passive: true });

document.addEventListener('touchend', e => {
  if (d && !d.onboarded) return;
  const t = e.changedTouches[0];
  if (!t) return;
  const target = e.target;
  if (target.closest('input, textarea, select, .modalBox, .targetMapBox, .levelUpBox, .onboardBox, .calendarTrack')) return;

  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const dt = Date.now() - touchStartTime;

  // Swipe up on bottom capsule opens dock
  if (target.closest('#navCapsule') && dy < -30 && Math.abs(dy) > Math.abs(dx)) {
    expandNavDock();
    return;
  }

  // Swipe down on nav dock closes it
  if (target.closest('#navDock') && dy > 40 && Math.abs(dy) > Math.abs(dx)) {
    collapseNavDock();
    return;
  }

  // Horizontal swipe between sections
  if (dt > 700 || Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  const active = document.querySelector('.section.active');
  if (!active) return;
  const i = swipeOrder.indexOf(active.id);
  if (i === -1) return;
  const ni = i + (dx < 0 ? 1 : -1);
  if (ni < 0 || ni >= swipeOrder.length) return;
  show(swipeOrder[ni], dx < 0 ? 'left' : 'right');
}, { passive: true });

/* Initialization on DOM load or immediate if already ready */
function initApp() {
  renderQuickFoodGrid();
  renderActivityChoices();
  render();
  updateSpendRing();
  renderV9();
  refreshForDateChange();
  checkOnboardingStatus();
  updateBarUnit(document.getElementById('activityMinutes'), 'activityBarUnit');
  updateBarUnit(document.getElementById('workoutMinutes'), 'workoutBarUnit');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* Keyboard navigation & Modal escapes */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (d && !d.onboarded) return; // Do not dismiss mandatory onboarding
    closeTargetMapModal();
    closeAdjustModal();
    closeLevelOverlay();
    closeLevelUp();
    collapseNavDock();
    return;
  }

  if (d && !d.onboarded) return;

  // Arrow Left / Arrow Right shortcuts when not inside text inputs
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const active = document.querySelector('.section.active');
      if (active) {
        const i = swipeOrder.indexOf(active.id);
        if (i !== -1) {
          const ni = i + (e.key === 'ArrowRight' ? 1 : -1);
          if (ni >= 0 && ni < swipeOrder.length) {
            e.preventDefault();
            show(swipeOrder[ni], e.key === 'ArrowRight' ? 'left' : 'right');
          }
        }
      }
    }
  }
});

/* Auto date change checks */
window.addEventListener('focus', refreshForDateChange);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshForDateChange();
});
setInterval(refreshForDateChange, 30000);

/* PWA Service Worker Registration */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js?v=46')
    .then(reg => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.update();
    })
    .catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('deqx-sw-v46-reloaded')) {
      sessionStorage.setItem('deqx-sw-v46-reloaded', '1');
      location.reload();
    }
  });
}
