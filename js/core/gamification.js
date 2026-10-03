/**
 * DEQX FIT - Gamification System
 * Leveling, XP calculation, Streak tracking, 6-Pillar Daily Score, and Expanded Achievements.
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
    if (typeof window.toast === 'function') {
      window.toast(`+${amount} XP (${reason})`);
    }
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
    const badge = document.getElementById('overlayLevel') || document.getElementById('levelUpBadge');
    const sub = document.getElementById('overlayRank') || document.getElementById('levelUpSub');
    if (!overlay) return;
    if (badge) badge.textContent = `${level}`;
    if (sub) sub.textContent = `${rank}`;
    overlay.classList.add('show');
  };

  const showLevelUpV9 = () => {
    const overlay = document.getElementById('levelUpModal') || document.getElementById('levelUpOverlay');
    if (overlay) overlay.style.display = 'flex';
  };

  const closeLevelUp = () => {
    const overlay = document.getElementById('levelUpModal') || document.getElementById('levelUpOverlay');
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
    // Also check if any sets are logged for this date
    if (d.workoutSets && d.workoutSets[targetIso] && Object.keys(d.workoutSets[targetIso]).length > 0) {
      return true;
    }
    return false;
  };

  /**
   * Determine if a date qualifies for streak preservation.
   * Requirement 8 & 17: Weekend rest days (Saturday & Sunday) must NOT break the streak!
   */
  const isDayStreakQualified = (iso, dailyPctOverride) => {
    const d = window.d;
    if (!d) return false;
    const todayIso = window.today();
    const isToday = (iso === todayIso);

    const dDate = new Date(iso + 'T12:00:00');
    const dow = dDate.getDay();
    const isWeekend = (dow === 0 || dow === 6); // 0=Sunday, 6=Saturday

    let dailyPct = 0;
    let gymDone = false;

    if (isToday) {
      dailyPct = (dailyPctOverride !== undefined)
        ? Number(dailyPctOverride)
        : calculateCurrentDailyPercent();
      gymDone = isGymWorkoutCompleted(todayIso);
      return (dailyPct >= 70 && gymDone);
    } else {
      const rec = d.streakHistory && d.streakHistory[iso];
      if (!rec) return false;
      if (rec.qualified || rec.completed) return true;
      dailyPct = (rec.dailyPercent !== undefined) ? Number(rec.dailyPercent) : 0;
      gymDone = (rec.gymCompleted !== undefined) ? !!rec.gymCompleted : isGymWorkoutCompleted(iso);
      if (isWeekend) {
        return !!(rec.qualified || rec.completed);
      }
      return (dailyPct >= 70 && gymDone);
    }
  };

  /**
   * Calculate 0-100% Daily Score from 6 pillars (Section 16)
   * 1. Protein
   * 2. Water
   * 3. Calories
   * 4. Activity / Burned
   * 5. Workout completion
   * 6. Budget
   * Strict capping: no single metric can exceed 100% contribution!
   */
  const calculateCurrentDailyPercent = () => {
    const d = window.d;
    if (!d) return 0;

    const foods = Array.isArray(d.foods) ? d.foods : [];
    const p = foods.reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = foods.reduce((a, x) => a + (Number(x.c) || 0), 0);
    const water = Number(d.water) || 0;
    const burn = (window.v9 && Number(window.v9.burned)) || 0;
    const todayIso = window.today();
    const done = isGymWorkoutCompleted(todayIso);
    const spent = Number(d.spent) || 0;
    const budgetTarget = Number(d.budgetTarget) || 250;

    // Fresh day / unstarted day check: if zero logs exist across all tracking pillars, completion is strictly 0%
    const hasAnyTracking = (p > 0 || c > 0 || water > 0 || burn > 0 || done || spent > 0 || foods.length > 0);
    if (!hasAnyTracking) {
      return 0;
    }

    const now = new Date();
    const isRest = (typeof window.scheduleForDate === 'function')
      ? (window.scheduleForDate(now) === 'Rest')
      : (now.getDay() === 0 || now.getDay() === 6);

    // Strict 100% capping for each pillar
    const pp = Math.min(100, Math.round((p / Math.max(1, d.proteinTarget || 150)) * 100));
    const wp = Math.min(100, Math.round((water / Math.max(0.1, d.waterTarget || 3)) * 100));
    const cp = Math.min(100, Math.round((c / Math.max(1, d.calorieTarget || 2200)) * 100));
    const bp = Math.min(100, Math.round((burn / Math.max(1, d.burnTarget || 500)) * 100));
    const gp = isRest ? 100 : (done ? 100 : 0);
    const budScore = (spent <= budgetTarget)
      ? 100
      : Math.max(0, Math.min(100, Math.round((1 - (spent - budgetTarget) / budgetTarget) * 100)));

    const score = Math.round((pp + wp + cp + bp + gp + budScore) / 6);

    // Check achievements
    checkAchievements(p, water, burn, done, spent, budgetTarget);

    return Math.min(100, Math.max(0, score));
  };

  /**
   * Check and unlock achievements (Section 17)
   */
  const checkAchievements = (protein, water, burn, workoutDone, spent, budgetTarget) => {
    const d = window.d;
    if (!d) return;
    d.achievements = d.achievements || {};

    const unlock = (id, name, xp, desc) => {
      if (!d.achievements[id]) {
        d.achievements[id] = { unlocked: true, date: window.today(), name, xp };
        addXP(xp, `Achievement: ${name}`);
        if (typeof window.toast === 'function') {
          window.toast(`🏅 Achievement Unlocked: ${name} (+${xp} XP)`);
        }
      }
    };

    if (workoutDone) {
      unlock('first_workout', 'FIRST WORKOUT', 50, 'Completed your first workout');
    }
    if (protein >= 100) {
      unlock('protein_100', '100G PROTEIN', 50, 'Hit 100g of protein in a single day');
    }
    if (water >= 3) {
      unlock('water_3l', '3L WATER', 50, 'Hydrated with 3 liters of water');
    }
    if (spent > 0 && spent <= budgetTarget) {
      unlock('under_budget', 'UNDER BUDGET', 50, 'Stayed disciplined under daily food budget');
    }
    if (d.attendanceStreak >= 7) {
      unlock('streak_7', '7 DAY STREAK', 100, 'Maintained a 7-day consistency streak');
    }

    // 10 workouts check
    const totalWorkouts = Object.values(d.workoutHistory || {}).filter(x => x && x.completed).length;
    if (totalWorkouts >= 10) {
      unlock('workouts_10', '10 WORKOUTS', 150, 'Completed 10 lifetime workout sessions');
    }

    // Weight lost check
    const startW = Number(d.startWeight);
    const curW = Number(d.weight);
    if (startW && curW && (startW - curW) >= 1) {
      unlock('first_1kg_lost', 'FIRST 1KG LOST', 100, 'Lost your first kilogram on your weight journey');
    }
  };

  /**
   * Compute Streak with Weekend Rest Day preservation
   */
  const computeAndUpdateStreak = (dailyPercent) => {
    const d = window.d;
    if (!d) return 0;
    const todayIso = window.today();
    d.streakHistory = d.streakHistory || {};

    const now = new Date();
    const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
    const todayDaily = (dailyPercent !== undefined) ? Number(dailyPercent) : calculateCurrentDailyPercent();
    const todayGym = isGymWorkoutCompleted(todayIso);

    // Trace past unbroken streak
    let pastStreak = 0;
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    while (true) {
      const checkIso = window.isoDate(checkDate);
      if (isDayStreakQualified(checkIso)) {
        pastStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Weekend rest days only preserve an EXISTING streak (pastStreak > 0)
    // They NEVER create a streak from 0!
    // A brand new streak ONLY begins when daily score >= 70% AND gym workout completed!
    let todayQualified = false;
    if (pastStreak > 0 && isWeekend) {
      todayQualified = true;
    } else {
      todayQualified = (todayDaily >= 70 && todayGym);
    }

    d.streakHistory[todayIso] = {
      visited: true,
      dailyPercent: todayDaily,
      gymCompleted: todayGym,
      completed: todayQualified,
      qualified: todayQualified
    };

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
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
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
      const isWeekendDay = (i === 5 || i === 6); // Saturday or Sunday

      let qualified = false;
      if (isToday) {
        qualified = isWeekendDay || (dailyPercent >= 70 && isGymWorkoutCompleted(targetIso));
      } else if (isPast) {
        qualified = isDayStreakQualified(targetIso);
      }

      let statusClass = 'pending';
      if (qualified) {
        statusClass = 'active';
      } else if (isPast) {
        statusClass = isWeekendDay ? 'rest' : 'missed';
      }

      chartHtml += `
        <div class="weekDot ${statusClass} ${isToday ? 'today' : ''}" title="${dayNames[i]}: ${qualified ? 'Streak Goal Achieved' : isWeekendDay ? 'Weekend Rest Day' : 'Goal Missed'}">
          <span>${dayNames[i]}</span>
        </div>
      `;

      actHtml += `
        <span class="dot ${statusClass}" title="${dayNames[i]}"></span>
      `;
    }

    if (chart) chart.innerHTML = chartHtml;
    if (actDots) actDots.innerHTML = actHtml;
  };

  const showStreakInfo = () => {
    const d = window.d;
    const streak = d?.attendanceStreak || 0;
    const daily = calculateCurrentDailyPercent();
    const gymDone = isGymWorkoutCompleted();
    const now = new Date();
    const isWeekend = (now.getDay() === 0 || now.getDay() === 6);

    const msg = isWeekend
      ? `🔥 Streak: ${streak} day${streak === 1 ? '' : 's'}!\n😴 Today is a scheduled Weekend Rest Day. Your streak is safe and continues seamlessly.`
      : `🔥 Streak: ${streak} day${streak === 1 ? '' : 's'}!\nDaily Target: ${daily}% (Requires ≥ 70%)\nGym Workout: ${gymDone ? '✅ Completed' : '⏳ Incomplete'}`;

    if (typeof window.toast === 'function') {
      window.toast(msg);
    } else {
      alert(msg);
    }
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.core = window.DEQX.core || {};
  window.DEQX.core.gamification = {
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
    showStreakInfo,
    checkAchievements
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
  window.checkAchievements = checkAchievements;

})(window);
