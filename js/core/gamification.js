/**
 * DEQX FIT - Gamification System
 * Leveling, XP calculation, Streak tracking, Level-up overlays.
 */

(function (window) {
  'use strict';

  const RANKS = ['Initiate', 'Rookie', 'Contender', 'Acrobat', 'Vanguard', 'Titan', 'Immortal'];

  const levelInfo = () => {
    const xp = (window.d && window.d.xp) || 0;
    const level = Math.floor(xp / 100) + 1;
    const within = xp % 100;
    const rank = RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 5))];
    return { level, rank, within, next: 100, pct: within };
  };

  const rewardOnce = (key, amount, reason) => {
    const d = window.d;
    if (!d) return;
    d.rewardDays = d.rewardDays || {};
    const fullKey = `${key}_${window.today()}`;
    if (!d.rewardDays[fullKey]) {
      d.rewardDays[fullKey] = true;
      addXP(amount, reason);
    }
  };

  const addXP = (amount, reason) => {
    const d = window.d;
    if (!d) return;
    const prev = levelInfo().level;
    d.xp = (d.xp || 0) + amount;
    window.save(true);
    const now = levelInfo();
    window.toast(`+${amount} XP (${reason})`);
    if (now.level > prev) {
      showLevelUp(now.level, now.rank);
    }
  };

  const earnXP = (amount, reason) => {
    const v9 = window.v9;
    if (!v9) return;
    const prevLevel = v9.level;
    v9.xp += amount;
    const needed = v9.level * 100;
    if (v9.xp >= needed) {
      v9.level++;
      v9.xp -= needed;
      showLevelUpV9();
    }
    window.saveV9();
    window.save(true);
    if (typeof window.renderV9 === 'function') window.renderV9();
  };

  const showLevelUp = (level, rank) => {
    const overlay = document.getElementById('levelOverlay');
    const badge = document.getElementById('levelUpBadge');
    const sub = document.getElementById('levelUpSub');
    if (!overlay) return;
    if (badge) badge.textContent = `LEVEL ${level}`;
    if (sub) sub.textContent = `You reached rank: ${rank}`;
    overlay.classList.add('show');
  };

  const showLevelUpV9 = () => {
    const overlay = document.getElementById('levelUpModal');
    if (overlay) overlay.style.display = 'flex';
  };

  const closeLevelUp = () => {
    const overlay = document.getElementById('levelUpModal');
    if (overlay) overlay.style.display = 'none';
  };

  const closeLevelOverlay = () => {
    const overlay = document.getElementById('levelOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  const calculateCurrentDailyPercent = () => {
    const d = window.d;
    if (!d) return 0;
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
    return Math.round((pp + wp + cp + bp + gp) / 5);
  };

  const computeAndUpdateStreak = (dailyPercent) => {
    const d = window.d;
    if (!d) return 0;
    const todayIso = window.today();
    d.streakHistory = d.streakHistory || {};
    d.lastAttendanceDate = d.lastAttendanceDate || todayIso;
    d.streakStartDate = d.streakStartDate || todayIso;

    d.streakHistory[todayIso] = {
      visited: true,
      dailyPercent: dailyPercent,
      completed: dailyPercent >= 100
    };

    const daysSinceLast = window.getDaysDifference(d.lastAttendanceDate, todayIso);
    if (daysSinceLast === 0) {
      if (!d.attendanceStreak || d.attendanceStreak < 1) {
        d.attendanceStreak = 1;
      }
    } else if (daysSinceLast === 1) {
      d.attendanceStreak = (d.attendanceStreak || 0) + 1;
      d.lastAttendanceDate = todayIso;
    } else {
      d.attendanceStreak = 1;
      d.streakStartDate = todayIso;
      d.lastAttendanceDate = todayIso;
    }
    return d.attendanceStreak;
  };

  const updateStreak = () => {
    const key = window.today();
    const v9 = window.v9;
    if (v9) {
      if (v9.lastWorkout === key) return;
      v9.lastWorkout = key;
      earnXP(50, 'workout');
      window.saveV9();
    }
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
  };

  const renderWeeklyRhythm = (dailyPercent) => {
    const container = document.getElementById('weeklyRhythmTrack');
    if (!container) return;
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const d = window.d;
    d.streakHistory = d.streakHistory || {};

    let html = '';
    for (let i = 0; i < 7; i++) {
      const dayOffset = i - currentDayOfWeek;
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + dayOffset);
      const targetIso = window.isoDate(targetDate);
      const isPast = i < currentDayOfWeek;
      const isToday = i === currentDayOfWeek;
      const dayRec = d.streakHistory[targetIso];
      let stateClass = 'empty';
      let icon = '';

      if (isToday) {
        stateClass = dailyPercent >= 100 ? 'complete pulse' : 'active';
        icon = dailyPercent >= 100 ? '✓' : '🔥';
      } else if (isPast) {
        if (dayRec && dayRec.completed) {
          stateClass = 'complete';
          icon = '✓';
        } else if (dayRec && dayRec.visited) {
          stateClass = 'partial';
          icon = '•';
        } else {
          stateClass = 'missed';
          icon = '—';
        }
      } else {
        stateClass = 'future';
        icon = '';
      }

      html += `<div class="rhythmDay ${stateClass}" title="${targetIso}">
        <span class="rhythmLetter">${dayNames[i]}</span>
        <div class="rhythmPill"><span class="rhythmIcon">${icon}</span></div>
      </div>`;
    }
    container.innerHTML = html;
  };

  const showStreakInfo = () => {
    const d = window.d;
    const streak = (d && d.attendanceStreak) || 1;
    const msg = `🔥 ${streak} Day Streak!\n\nEvery day you log in, build your nutrition, or train, your attendance streak climbs. Complete 100% daily targets to lock in gold streak badges!`;
    window.toast(msg);
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.gamification = {
    RANKS,
    levelInfo,
    rewardOnce,
    addXP,
    earnXP,
    showLevelUp,
    showLevelUpV9,
    closeLevelUp,
    closeLevelOverlay,
    calculateCurrentDailyPercent,
    computeAndUpdateStreak,
    updateStreak,
    renderWeeklyRhythm,
    showStreakInfo
  };

  // Global backward compatibility
  window.levelInfo = levelInfo;
  window.rewardOnce = rewardOnce;
  window.addXP = addXP;
  window.earnXP = earnXP;
  window.showLevelUp = showLevelUp;
  window.showLevelUpV9 = showLevelUpV9;
  window.closeLevelUp = closeLevelUp;
  window.closeLevelOverlay = closeLevelOverlay;
  window.calculateCurrentDailyPercent = calculateCurrentDailyPercent;
  window.computeAndUpdateStreak = computeAndUpdateStreak;
  window.updateStreak = updateStreak;
  window.renderWeeklyRhythm = renderWeeklyRhythm;
  window.showStreakInfo = showStreakInfo;

})(window);
