/**
 * DEQX FIT - Workout Component
 * Split routines, 4-day cycle schedule, calendar renderer, gym calorie estimation.
 */

(function (window) {
  'use strict';

  let calendarCursor = new Date();

  const scheduleForDate = (date) => {
    const targetIso = window.isoDate(date);
    const d = window.d;
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

    const splits = (window.DEQX?.data?.routines?.WORKOUT_SPLITS) || window.WORKOUT_SPLITS || [
      'Chest + Triceps', 'Back + Biceps', 'Shoulders + Forearms', 'Leg Day'
    ];
    const sIdx = splits.indexOf(anchor.split);
    const baseIdx = sIdx >= 0 ? sIdx : 0;

    const anchorParts = anchorIso.split('-').map(Number);
    const anchorDt = new Date(anchorParts[0], anchorParts[1] - 1, anchorParts[2]);
    const targetDt = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let count = 0;
    if (targetDt > anchorDt) {
      let cur = new Date(anchorDt);
      cur.setDate(cur.getDate() + 1);
      while (cur <= targetDt) {
        const cDow = cur.getDay();
        if (cDow !== 0 && cDow !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return splits[(baseIdx + count) % 4];
    } else {
      let cur = new Date(anchorDt);
      cur.setDate(cur.getDate() - 1);
      while (cur >= targetDt) {
        const cDow = cur.getDay();
        if (cDow !== 0 && cDow !== 6) count++;
        cur.setDate(cur.getDate() - 1);
      }
      const idx = (baseIdx - (count % 4) + 4) % 4;
      return splits[idx];
    }
  };

  const setWorkoutCycle = (split, targetDateIso) => {
    const d = window.d;
    if (!d) return;
    d.workoutAnchor = { date: targetDateIso, split };
    d.workoutOverrides = d.workoutOverrides || {};
    delete d.workoutOverrides[targetDateIso];
    window.save(true);
    renderCalendar();
    window.toast(`Workout cycle anchor set to ${split} on ${targetDateIso}`);
  };

  const openCalendarDayAdjust = (iso) => {
    const modal = document.getElementById('adjustModal');
    if (!modal) return;
    const title = document.getElementById('adjustDateTitle');
    const sch = scheduleForDate(new Date(iso + 'T00:00:00'));
    if (title) title.textContent = `Adjust Routine (${iso} · Currently: ${sch})`;
    modal.dataset.iso = iso;
    modal.classList.add('show');
  };

  const closeAdjustModal = () => {
    const modal = document.getElementById('adjustModal');
    if (modal) modal.classList.remove('show');
  };

  const applyDayAdjust = (split) => {
    const modal = document.getElementById('adjustModal');
    if (!modal) return;
    const iso = modal.dataset.iso;
    if (!iso) return;
    setWorkoutCycle(split, iso);
    closeAdjustModal();
  };

  const getEffectiveWorkoutWeight = () => {
    const d = window.d;
    const inputWeight = parseFloat(document.getElementById('workoutWeight')?.value);
    if (!isNaN(inputWeight) && inputWeight >= 20 && inputWeight <= 300) {
      return inputWeight;
    }
    const profileWeight = parseFloat(d?.weight);
    if (!isNaN(profileWeight) && profileWeight >= 20 && profileWeight <= 300) {
      return profileWeight;
    }
    return 70;
  };

  const calculateGymCalories = (mins, weight, intensityKey) => {
    const metMap = {
      light: 3.5,
      moderate: 5.5,
      hard: 7.5
    };
    const met = metMap[intensityKey] || 5.5;
    const calPerMin = (met * 3.5 * weight) / 200;
    return Math.round(calPerMin * mins);
  };

  const updateWorkoutCaloriePreview = () => {
    const previewEl = document.getElementById('workoutCaloriePreview');
    if (!previewEl) return;
    const rawMins = document.getElementById('workoutMinutes')?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const mins = Math.min(360, Math.max(1, parsedMins || 60));
    const intensity = document.getElementById('workoutIntensity')?.value || 'moderate';
    const weight = getEffectiveWorkoutWeight();
    const kcal = calculateGymCalories(mins, weight, intensity);

    previewEl.style.display = 'block';
    previewEl.innerHTML = `🔥 Est. Burn: <b>${kcal} kcal</b> · ${window.formatDurationLabel(mins)} at ${intensity} intensity (${weight} kg bodyweight)`;
  };

  const renderCalendar = () => {
    const y = calendarCursor.getFullYear(),
      m = calendarCursor.getMonth();
    const first = new Date(y, m, 1),
      days = new Date(y, m + 1, 0).getDate();
    const start = (first.getDay() + 6) % 7;
    const monthEl = document.getElementById('calendarMonth');
    if (monthEl) monthEl.textContent = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(first);

    let out = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div class="calWeek">${x}</div>`).join('');
    for (let i = 0; i < start; i++) out += '<div class="calDay empty"></div>';
    const now = new Date(),
      todayIso = window.isoDate(now);
    const d = window.d;

    for (let day = 1; day <= days; day++) {
      let dt = new Date(y, m, day),
        iso = window.isoDate(dt),
        sch = scheduleForDate(dt),
        isToday = iso === todayIso,
        isWork = sch !== 'Rest',
        completed = !!(d?.workoutHistory && d.workoutHistory[iso]?.completed);
      out += `<div class="calDay ${isWork ? 'workday ' : 'rest '}${isToday ? 'today ' : ''}${completed ? 'completed' : ''}" onclick="openCalendarDayAdjust('${iso}')" title="Tap to adjust routine from this day"><div class="dateNum">${day}</div><div class="calWorkout">${sch === 'Rest' ? 'REST' : window.esc(sch.replace(' + ', ' +<br>')).replace(/&lt;br&gt;/g, '<br>')}</div></div>`;
    }
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = out;

    const todaySchedule = scheduleForDate(now),
      done = !!(d?.workoutHistory && d.workoutHistory[todayIso]?.completed);
    const missionEl = document.getElementById('calendarTodayMission');
    if (missionEl) {
      missionEl.innerHTML = todaySchedule === 'Rest'
        ? '<span class="restBadge">😴 <b>Today is a rest day.</b> Weekend recovery is not counted against your workout streak.</span>'
        : done
        ? '✅ <b>Workout completed.</b> Today’s mission is cleared.'
        : `🔥 <b>Today:</b> ${window.esc(todaySchedule)} · Complete it to earn <b>+50 XP</b>.`;
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
    if (intSel && d?.workoutIntensity) intSel.value = d.workoutIntensity;
    const wInput = document.getElementById('workoutWeight');
    if (wInput && !wInput.value) {
      wInput.placeholder = d?.weight ? `Current: ${d.weight} kg (optional)` : 'Current weight in kg (optional)';
    }
    updateWorkoutCaloriePreview();
    if (window.HologramViewer) window.HologramViewer.update(todaySchedule);
  };

  const changeMonth = (delta) => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
    renderCalendar();
  };

  const saveWorkout = () => {
    const d = window.d;
    if (!d) return;
    const select = document.getElementById('workoutSelect');
    const intensitySel = document.getElementById('workoutIntensity');
    const workoutInput = document.getElementById('workoutCustom');
    const minutesInput = document.getElementById('workoutMinutes');
    const weightInput = document.getElementById('workoutWeight');

    let workoutName = '';
    if (select && select.value) {
      workoutName = select.value;
    } else if (workoutInput && workoutInput.value.trim()) {
      workoutName = workoutInput.value.trim();
    }

    if (!workoutName) {
      window.toast('Please select or specify a workout.');
      return;
    }

    const rawMins = minutesInput?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const duration = Math.min(360, Math.max(1, parsedMins || 60));
    const intensity = intensitySel?.value || 'moderate';
    const weightUsed = getEffectiveWorkoutWeight();
    const caloriesBurned = calculateGymCalories(duration, weightUsed, intensity);

    if (weightInput && weightInput.value.trim()) {
      const explicitWeight = parseFloat(weightInput.value);
      if (!isNaN(explicitWeight) && explicitWeight >= 20 && explicitWeight <= 300) {
        d.weight = explicitWeight;
        d.history = d.history || [];
        d.history.push({ date: window.today(), weight: explicitWeight });
      }
    }

    d.workout = `${workoutName} (${window.formatDurationLabel(duration)} · ${intensity} · ${caloriesBurned} kcal)`;
    d.workoutHistory = d.workoutHistory || {};
    d.workoutHistory[window.today()] = {
      completed: true,
      workout: workoutName,
      duration: duration,
      intensity: intensity,
      calories: caloriesBurned,
      weightUsed: weightUsed
    };

    window.save(true);
    if (typeof window.updateStreak === 'function') window.updateStreak();
    window.savedFeedback(`Workout logged ✓ ${workoutName} (${caloriesBurned} kcal)`, 'workout');
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.workout = {
    scheduleForDate,
    setWorkoutCycle,
    openCalendarDayAdjust,
    closeAdjustModal,
    applyDayAdjust,
    getEffectiveWorkoutWeight,
    calculateGymCalories,
    updateWorkoutCaloriePreview,
    renderCalendar,
    changeMonth,
    saveWorkout
  };

  // Global backward compatibility
  window.scheduleForDate = scheduleForDate;
  window.setWorkoutCycle = setWorkoutCycle;
  window.openCalendarDayAdjust = openCalendarDayAdjust;
  window.closeAdjustModal = closeAdjustModal;
  window.applyDayAdjust = applyDayAdjust;
  window.getEffectiveWorkoutWeight = getEffectiveWorkoutWeight;
  window.calculateGymCalories = calculateGymCalories;
  window.updateWorkoutCaloriePreview = updateWorkoutCaloriePreview;
  window.renderCalendar = renderCalendar;
  window.changeMonth = changeMonth;
  window.saveWorkout = saveWorkout;

})(window);
