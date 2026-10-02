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

  const isGymWorkoutCompleted = (iso) => {
    const d = window.d;
    if (!d) return false;
    const targetIso = iso || window.today();
    if (d.workoutHistory && d.workoutHistory[targetIso]?.completed) {
      return true;
    }
    // Also check if checklist exercises are fully completed for this date
    if (d.workoutChecklist && d.workoutChecklist[targetIso]) {
      const routine = (typeof window.DEQX?.components?.workout?.getRoutineData === 'function')
        ? window.DEQX.components.workout.getRoutineData()
        : null;
      const exercises = (routine && routine.views)
        ? (routine.views[window.activeViewKey] || Object.values(routine.views)[0])?.exercises
        : null;
      if (exercises && exercises.length > 0) {
        const checklistMap = d.workoutChecklist[targetIso];
        if (exercises.every(ex => checklistMap[ex.id])) {
          return true;
        }
      }
    }
    return false;
  };

  const isDayStreakQualified = (iso, dailyPctOverride) => {
    const d = window.d;
    if (!d) return false;
    const todayIso = window.today();
    const isToday = (iso === todayIso);

    let dailyPct = 0;
    let gymDone = false;

    if (isToday) {
      dailyPct = (dailyPctOverride !== undefined)
        ? Number(dailyPctOverride)
        : calculateCurrentDailyPercent();
      gymDone = isGymWorkoutCompleted(todayIso);
    } else {
      const rec = d.streakHistory && d.streakHistory[iso];
      if (rec) {
        dailyPct = (rec.dailyPercent !== undefined) ? Number(rec.dailyPercent) : 0;
        gymDone = (rec.gymCompleted !== undefined)
          ? !!rec.gymCompleted
          : isGymWorkoutCompleted(iso);
        if (rec.qualified || (rec.completed && dailyPct >= 70 && gymDone)) {
          return true;
        }
      } else {
        gymDone = isGymWorkoutCompleted(iso);
        dailyPct = 0;
      }
    }

    return (dailyPct >= 70 && gymDone);
  };

  const calculateCurrentDailyPercent = () => {
    const d = window.d;
    if (!d) return 0;
    const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);
    const burn = (window.v9 && window.v9.burned) || 0;
    const todayIso = window.today();
    const done = isGymWorkoutCompleted(todayIso);

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

    const todayDaily = (dailyPercent !== undefined)
      ? Number(dailyPercent)
      : calculateCurrentDailyPercent();
    const todayGym = isGymWorkoutCompleted(todayIso);
    const todayQualified = (todayDaily >= 70 && todayGym);

    d.streakHistory[todayIso] = {
      visited: true,
      dailyPercent: todayDaily,
      gymCompleted: todayGym,
      completed: todayQualified,
      qualified: todayQualified
    };

    // Calculate unbroken consecutive days prior to today that qualified
    let pastStreak = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    while (true) {
      const checkIso = window.isoDate(checkDate);
      if (isDayStreakQualified(checkIso)) {
        pastStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Streak broken in past
      }
    }

    // Active streak:
    // If today qualifies: pastStreak + 1 (today continues the streak)
    // If today does not qualify yet:
    //   If yesterday qualified: user holds pastStreak (active/pending today)
    //   If yesterday did not qualify: 0 (streak broken)
    let totalStreak = 0;
    if (todayQualified) {
      totalStreak = pastStreak + 1;
      d.lastQualifiedDate = todayIso;
    } else {
      totalStreak = pastStreak;
    }

    d.attendanceStreak = totalStreak;
    if (window.v9) {
      window.v9.streak = totalStreak;
    }

    return totalStreak;
  };

  const updateStreak = () => {
    const key = window.today();
    const v9 = window.v9;
    if (v9) {
      if (v9.lastWorkout !== key) {
        v9.lastWorkout = key;
        earnXP(50, 'workout');
        window.saveV9();
      }
    }
    const daily = calculateCurrentDailyPercent();
    const streakVal = computeAndUpdateStreak(daily);
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
    return streakVal;
  };

  const renderWeeklyRhythm = (dailyPercent) => {
    const chart = document.getElementById('streakDots') || document.getElementById('weeklyRhythmTrack');
    const actDots = document.getElementById('activityStreakDots');
    if (!chart && !actDots) return;

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7;
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const d = window.d;
    d.streakHistory = d.streakHistory || {};

    let chartHtml = '';
    let actHtml = '';

    for (let i = 0; i < 7; i++) {
      const dayOffset = i - currentDayOfWeek;
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const targetIso = window.isoDate(targetDate);
      const isPast = i < currentDayOfWeek;
      const isToday = i === currentDayOfWeek;

      let qualified = false;
      let dayPct = 0;
      let gymDone = false;

      if (isToday) {
        dayPct = (dailyPercent !== undefined) ? Number(dailyPercent) : calculateCurrentDailyPercent();
        gymDone = isGymWorkoutCompleted(targetIso);
        qualified = (dayPct >= 70 && gymDone);
      } else if (isPast) {
        qualified = isDayStreakQualified(targetIso);
        const rec = d.streakHistory[targetIso];
        dayPct = (rec && rec.dailyPercent !== undefined) ? Number(rec.dailyPercent) : 0;
        gymDone = (rec && rec.gymCompleted !== undefined) ? !!rec.gymCompleted : isGymWorkoutCompleted(targetIso);
      }

      // WeekChart for Home consistency
      if (chart) {
        let classes = [];
        if (qualified) classes.push('done');
        if (isToday) {
          classes.push('today');
          if (!qualified) classes.push('blinking');
        } else if (isPast && !qualified) {
          classes.push('missed');
        }

        const titleText = isToday
          ? `Today: ${dayPct}% Target, Gym: ${gymDone ? 'Done' : 'Pending'}${qualified ? ' (Qualified)' : ''}`
          : isPast
          ? `${targetIso}: ${dayPct}% Target, Gym: ${gymDone ? 'Done' : 'Missed'}${qualified ? ' (Qualified)' : ''}`
          : `${dayNames[i]}: Upcoming`;

        chartHtml += `<i class="${classes.join(' ')}" title="${titleText}" onclick="showStreakInfo()">${dayNames[i]}</i>`;
      }

      // Activity Streak Dots
      if (actDots) {
        let actClass = qualified ? 'done' : (isToday && !qualified) ? 'today' : '';
        actHtml += `<i class="${actClass}" title="${dayNames[i]} (${targetIso})">${dayNames[i]}</i>`;
      }
    }

    if (chart) chart.innerHTML = chartHtml;
    if (actDots) actDots.innerHTML = actHtml;
  };

  const showStreakInfo = () => {
    const d = window.d;
    const streak = (d && d.attendanceStreak) || 0;
    const todayIso = window.today();
    const gymDone = isGymWorkoutCompleted(todayIso);
    const daily = calculateCurrentDailyPercent();
    const qualified = (daily >= 70 && gymDone);

    const targetStatus = daily >= 70 ? `✅ Daily target: ${daily}% (Goal: \u2265 70%)` : `⏳ Daily target: ${daily}% / 70%`;
    const gymStatus = gymDone ? `✅ Gym workout: Completed` : `⏳ Gym workout: Not completed yet`;
    const todayStatus = qualified ? `🔥 Today is QUALIFIED! Streak continues.` : `⚡ Complete both requirements today to continue your streak!`;

    const msg = `🔥 ${streak} Day Streak\n\n${targetStatus}\n${gymStatus}\n\n${todayStatus}\n\nRule: Streak only continues if everyday target is \u2265 70% with completing gym workout.`;
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
    isGymWorkoutCompleted,
    isDayStreakQualified,
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
  window.isGymWorkoutCompleted = isGymWorkoutCompleted;
  window.isDayStreakQualified = isDayStreakQualified;
  window.calculateCurrentDailyPercent = calculateCurrentDailyPercent;
  window.computeAndUpdateStreak = computeAndUpdateStreak;
  window.updateStreak = updateStreak;
  window.renderWeeklyRhythm = renderWeeklyRhythm;
  window.showStreakInfo = showStreakInfo;

})(window);
