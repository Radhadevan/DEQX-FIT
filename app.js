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
  { id: 'Gym', label: 'GYM', sub: 'Strength', icon: '🏋️' },
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
  weight: 99.7,
  goalWeight: 85,
  proteinTarget: 150,
  waterTarget: 3,
  calorieTarget: 2200,
  budgetTarget: 250,
  foods: [],
  history: [{ date: today(), weight: 99.7 }],
  water: 0,
  workout: '',
  spent: 0,
  date: today(),
  xp: 0,
  rewardDays: {},
  workoutHistory: {},
  attendanceStreak: 1,
  lastAttendanceDate: today()
};

let d = JSON.parse(
  localStorage.getItem(KEY) ||
  localStorage.getItem('fitRadhadevanV5') ||
  localStorage.getItem('fitRadhadevanV4') ||
  localStorage.getItem('fitRadhadevanV3') ||
  localStorage.getItem('fitRadhadevanV2') ||
  localStorage.getItem('fitRadhadevan') ||
  'null'
) || JSON.parse(JSON.stringify(INITIAL));

if (d.weight === 97 || d.weight === 97.3 || !d.weight) {
  d.weight = 99.7;
  if (d.history && d.history.length === 1 && (d.history[0].weight === 97 || d.history[0].weight === 97.3)) {
    d.history[0].weight = 99.7;
  }
}

d.workoutAnchor = d.workoutAnchor || { date: '2026-09-30', split: 'Leg Day' };
if (!d.workoutAnchor.split || d.workoutAnchor.split === 'Back + Biceps' || d.workoutAnchor.split === 'Shoulders + Forearms') {
  d.workoutAnchor = { date: today(), split: 'Leg Day' };
}
d.workoutOverrides = d.workoutOverrides || {};
d.foods = d.foods || [];
d.customFoods = d.customFoods || [];
d.history = d.history || [{ date: today(), weight: d.weight || 99.7 }];
d.goalWeight = Number(d.goalWeight) || 85;
d.proteinTarget = Number(d.proteinTarget) || 150;
d.waterTarget = Number(d.waterTarget) || 3;
d.calorieTarget = Number(d.calorieTarget) || 2200;
d.budgetTarget = Number.isFinite(Number(d.budgetTarget)) ? Number(d.budgetTarget) : 250;
d.xp = Number(d.xp) || 0;
d.rewardDays = d.rewardDays || {};
d.workoutHistory = d.workoutHistory || {};
d.attendanceStreak = Number(d.attendanceStreak) >= 1 ? Number(d.attendanceStreak) : 1;
d.lastAttendanceDate = d.lastAttendanceDate || today();

function getDaysDifference(isoDate1, isoDate2) {
  if (!isoDate1 || !isoDate2) return 999;
  const [y1, m1, day1] = isoDate1.split('-').map(Number);
  const [y2, m2, day2] = isoDate2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, day1);
  const utc2 = Date.UTC(y2, m2 - 1, day2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function checkAttendanceStreak() {
  const t = today();
  if (!d.attendanceStreak || d.attendanceStreak < 1) d.attendanceStreak = 1;
  if (!d.lastAttendanceDate) {
    d.lastAttendanceDate = t;
    save(false);
    return;
  }
  const diffDays = getDaysDifference(d.lastAttendanceDate, t);
  if (diffDays === 0) {
    return;
  }
  if (diffDays === 1) {
    // Logged in on consecutive day - increment streak infinitely!
    d.attendanceStreak += 1;
    d.lastAttendanceDate = t;
    if (typeof v9 !== 'undefined') v9.streak = d.attendanceStreak;
    save(false);
    toast('🔥 Streak extended! ' + d.attendanceStreak + (d.attendanceStreak === 1 ? ' day' : ' days') + ' in a row!');
  } else if (diffDays > 1) {
    // Missed 1 or more full days without login/attendance - reset to 1
    d.attendanceStreak = 1;
    d.lastAttendanceDate = t;
    if (typeof v9 !== 'undefined') v9.streak = 1;
    save(false);
    toast('🔥 Daily streak reset. Day 1 starts today!');
  }
}

function showStreakInfo() {
  toast('🔥 ' + (d.attendanceStreak || 1) + ' Day Streak! Attendance logged today ✓');
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
  checkAttendanceStreak();
  if (d.date !== t) {
    foodDraft = [];
    d.foods = [];
    d.water = 0;
    d.workout = '';
    d.spent = 0;
    d.date = t;
    d.rewardDays[t] = d.rewardDays[t] || {};
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
  return JSON.parse(JSON.stringify({ ...INITIAL, date: today(), history: [{ date: today(), weight: 99.7 }] }));
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
  progressTab: { icon: '↗', label: 'Progress' },
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
    d.history.push({ date: today(), weight: w });
    rewardOnce('weightLogged', 20, 'Weight logged');
    save(false);
    document.getElementById('newWeight').value = '';
    render();
    document.getElementById('newWeight').placeholder = 'Enter current weight again';
    toast('Weight saved ✓ Updated today’s data');
  }
}

function saveWorkout() {
  const scheduled = scheduleForDate(new Date());
  if (scheduled === 'Rest') {
    d.workout = 'Rest / Recovery';
    d.workoutHistory[today()] = { scheduled: 'Rest', completed: false };
    save(false);
    document.getElementById('workoutMinutes').value = '';
    document.getElementById('workoutSaved').textContent = 'Saved ✓ Rest day recorded.';
    render();
    renderCalendar();
    toast('Workout data saved ✓');
    return;
  }
  const selected = document.getElementById('workoutSelect').value,
    mins = +document.getElementById('workoutMinutes').value || 0;
  if (mins <= 0) {
    document.getElementById('workoutSaved').textContent = 'Enter workout minutes first.';
    toast('Enter workout minutes');
    return;
  }
  if (selected !== 'Rest' && selected !== scheduled) {
    d.workoutAnchor = { date: today(), split: selected };
    delete (d.workoutOverrides || {})[today()];
  }
  d.workout = selected + ' • ' + mins + ' min';
  d.workoutHistory[today()] = { scheduled, completed: true, actual: d.workout };
  rewardOnce('workoutCompleted', 50, 'Workout complete');
  save(false);
  document.getElementById('workoutMinutes').value = '';
  document.getElementById('workoutSaved').textContent = 'Saved ✓ Workout completed +50 XP';
  render();
  renderCalendar();
  toast('Workout saved ✓ +50 XP');
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
  document.getElementById('profileGoal').value = d.goalWeight;
  document.getElementById('profileProtein').value = d.proteinTarget;
  document.getElementById('profileWaterTarget').value = d.waterTarget;
  document.getElementById('profileCalories').value = d.calorieTarget;
  document.getElementById('profileBudget').value = d.budgetTarget;
  document.getElementById('profileWeight').value = d.weight;
  document.getElementById('profileWater').value = d.water;
  document.getElementById('profileSpent').value = d.spent;
  document.getElementById('profileWorkout').value = d.workout || '';
}

function saveProfile() {
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
  if (!confirm('Reset DEQX FIT? This will erase your food, water, workout, budget, weight history, XP and level.')) return;
  d = cloneInitial();
  calendarCursor = new Date();
  localStorage.setItem(KEY, JSON.stringify(d));
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  document.getElementById('home').classList.add('active');
  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  document.getElementById('n-home').classList.add('active');
  render();
  toast('DEQX FIT reset ✓');
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
}

function renderActivityChoices() {
  const container = document.getElementById('activityChoices');
  if (!container) return;
  container.innerHTML = ACTIVITIES.map(act => `
    <button class="activityChoice" data-activity="${act.id}">
      <span>${act.icon}</span><b>${esc(act.label)}</b><small>${esc(act.sub)}</small>
    </button>
  `).join('');

  container.querySelectorAll('.activityChoice').forEach(b => {
    b.addEventListener('click', () => {
      container.querySelectorAll('.activityChoice').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      v9.activity = b.dataset.activity;
      saveV9();
    });
  });
}

function render() {
  ensureTodayState();
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const setHtml = (id, val) => { const e = document.getElementById(id); if (e) e.innerHTML = val; };
  const setVal = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
  const bar = (id, val) => { const e = document.getElementById(id); if (e) e.style.width = val + '%'; };
  const styleProp = (id, prop, val) => { const e = document.getElementById(id); if (e) e.style.setProperty(prop, val); };

  let p = d.foods.reduce((a, x) => a + (Number(x.p) || 0), 0),
    c = d.foods.reduce((a, x) => a + (Number(x.c) || 0), 0),
    gp = Math.max(0, Math.min(100, ((100 - d.weight) / Math.max(1, 100 - d.goalWeight)) * 100)),
    li = levelInfo();

  set('weightHome', d.weight);
  set('goalWeightHome', d.goalWeight);
  set('remaining', Math.max(0, d.weight - d.goalWeight).toFixed(1) + ' kg remaining');
  styleProp('ring', '--p', gp + '%');
  set('ringText', Math.round(gp) + '%');

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

  setHtml('history', [...d.history].reverse().slice(0, 12).map(x => '<div class="food"><span>' + esc(x.date) + '</span><b>' + x.weight + ' kg</b></div>').join(''));

  setHtml('profileFoodList', d.foods.length
    ? d.foods.map((x, i) => '<div class="card" style="padding:11px;margin-bottom:8px;background:#10130f"><input id="foodName' + i + '" value="' + esc(x.n) + '"><div class="editGrid"><input id="foodProtein' + i + '" type="number" step=".1" value="' + x.p + '"><input id="foodCalories' + i + '" type="number" value="' + x.c + '"></div><div class="editActions"><button onclick="saveFoodEdit(' + i + ')">Save</button><button class="deleteBtn" onclick="removeFood(' + i + ')">Remove</button></div></div>').join('')
    : '<p class="muted">No food logged today.</p>'
  );

  setVal('spent', d.spent || '');
  fillProfile();
  renderCustomFoods();
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

  const goalProgress = Math.max(0, Math.min(100, ((100 - d.weight) / Math.max(1, 100 - d.goalWeight)) * 100));
  bar('weightMiniBar', goalProgress);
  bar('weightJourneyBar', goalProgress);
  set('weightMiniText', Math.round(goalProgress) + '% toward goal');
  set('weightHome2', Number(d.weight).toFixed(1));
  set('goalWeightHome2', Number(d.goalWeight).toFixed(0));
  set('remaining2', Math.max(0, d.weight - d.goalWeight).toFixed(1) + ' kg remaining');
  set('rankHome', (typeof v9 !== 'undefined' && v9.level > 5) ? 'Elite' : (typeof v9 !== 'undefined' && v9.level > 2 ? 'Rising' : 'Rookie'));

  const streakCount = Math.max(1, Number(d.attendanceStreak) || 1);
  set('todayStreakCount', streakCount);
  set('streakHome', streakCount);
  set('streakView', streakCount);
  set('streakUnit', streakCount === 1 ? 'day' : 'days');
  set('streakHomeUnit', streakCount === 1 ? 'day' : 'days');
  set('activityStreakView', streakCount);
  set('activityStreakUnit', streakCount === 1 ? ' DAY' : ' DAYS');
  const streakViewWrap = document.getElementById('streakViewWrap');
  if (streakViewWrap) streakViewWrap.innerHTML = `<span id="streakView">${streakCount}</span> <span id="streakUnit">${streakCount === 1 ? 'day' : 'days'}</span>`;
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
const ACTIVITY_MET = { Gym: 5.5, Badminton: 7, Cricket: 5 };

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

function calculateActivity() {
  if (!v9.activity) {
    toast('Choose an activity first');
    show('activity');
    return;
  }
  const mins = Math.min(600, Math.max(1, Number(document.getElementById('activityMinutes').value) || 45));
  const intensity = document.getElementById('activityIntensity').value;
  const mult = { light: 0.82, moderate: 1, hard: 1.18 }[intensity];
  const weight = Math.max(40, Math.min(180, Number(d.weight) || 70));
  const kcal = Math.round(ACTIVITY_MET[v9.activity] * weight * (mins / 60) * mult);
  v9.burned = kcal;
  v9.lastActivityDate = today();
  saveV9();

  const res = document.getElementById('activityResult');
  if (res) {
    res.style.display = 'block';
    res.innerHTML = '✅ <b>Saved ✓ ' + kcal + ' kcal</b> · ' + mins + ' min ' + v9.activity;
  }
  earnXP(Math.min(60, Math.round(kcal / 10)), 'activity');
  document.getElementById('activityMinutes').value = '45';
  document.getElementById('activityIntensity').value = 'moderate';
  document.querySelectorAll('.activityChoice').forEach(x => x.classList.remove('selected'));
  v9.activity = null;
  saveV9();
  renderV9();
  toast('Activity saved ✓ +XP');
}

function updateStreak() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return;
  const key = today();
  if (v9.lastWorkout === key) return;
  v9.lastWorkout = key;
  v9.streak++;
  saveV9();
  earnXP(50, 'workout');
  renderV9();
}

function renderV9() {
  document.querySelectorAll('.activityChoice').forEach(b => b.classList.toggle('selected', b.dataset.activity === v9.activity));
  const summary = document.getElementById('activitySummary');
  if (summary) summary.textContent = v9.activity ? v9.activity + ' selected' : 'Choose an activity';
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
  const currentStreak = Math.max(1, Number(d?.attendanceStreak) || v9.streak || 1);
  const sUnit = currentStreak === 1 ? 'day' : 'days';
  ['streakHome', 'streakView'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.textContent = currentStreak;
  });
  const su = document.getElementById('streakUnit');
  if (su) su.textContent = sUnit;
  const shu = document.getElementById('streakHomeUnit');
  if (shu) shu.textContent = sUnit;
  const dots = document.getElementById('streakDots');
  if (dots) {
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const activeCount = Math.min(7, currentStreak % 7 === 0 ? 7 : (currentStreak % 7));
    dots.innerHTML = labels.map((x, i) => '<i class="' + (i < activeCount ? 'done ' : '') + (new Date().getDay() === ((i + 1) % 7) ? 'today' : '') + '">' + x + '</i>').join('');
  }
  updateDailyAnalytics();
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
const swipeOrder = ['home', 'food', 'activity', 'workout', 'progressTab', 'budget', 'profile'];
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
  const t = e.changedTouches[0];
  if (!t) return;
  const target = e.target;
  if (target.closest('input, textarea, select, .modalBox, .targetMapBox, .levelUpBox, .calendarTrack')) return;

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
  checkAttendanceStreak();
  renderQuickFoodGrid();
  renderActivityChoices();
  render();
  updateSpendRing();
  renderV9();
  refreshForDateChange();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/* Keyboard navigation & Modal escapes */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTargetMapModal();
    closeAdjustModal();
    closeLevelOverlay();
    closeLevelUp();
    collapseNavDock();
    return;
  }

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
  navigator.serviceWorker.register('./service-worker.js?v=34')
    .then(reg => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.update();
    })
    .catch(() => { });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('deqx-sw-v34-reloaded')) {
      sessionStorage.setItem('deqx-sw-v34-reloaded', '1');
      location.reload();
    }
  });
}
