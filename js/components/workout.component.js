/**
 * DEQX FIT - Workout Component
 * High-performance, modular component for workout schedule, muscle visualizer,
 * progress tracking, interactive checklists, and calendar synchronization.
 */

(function (window) {
  'use strict';

  let calendarCursor = new Date();
  let activeSplit = null;
  let activeViewKey = null;
  let viewingIso = null;

  /**
   * Determine the scheduled workout routine for a given date.
   * Priority:
   * 1. Manual day override (d.workoutOverrides[iso])
   * 2. Manual cycle anchor (d.workoutAnchor)
   * 3. Default weekly schedule (Mon Chest+Tri, Tue Back+Bi, Wed Shoulder+Forearm, Thu Leg, Fri Chest+Tri, Sat/Sun Rest)
   */
  const scheduleForDate = (date) => {
    const targetIso = window.isoDate(date);
    const d = window.d;

    // 1. Check direct override
    if (d && d.workoutOverrides && d.workoutOverrides[targetIso]) {
      return d.workoutOverrides[targetIso];
    }

    // 2. Check anchor if set and matches
    const anchor = d && d.workoutAnchor;
    if (anchor && anchor.date === targetIso) {
      return anchor.split;
    }

    const dow = date.getDay(); // 0 is Sunday, 6 is Saturday
    const weeklyMap = window.DEQX?.data?.routines?.WEEKLY_SCHEDULE || {
      0: 'Rest',
      1: 'Chest + Triceps',
      2: 'Back + Biceps',
      3: 'Shoulders + Forearms',
      4: 'Leg Day',
      5: 'Chest + Triceps',
      6: 'Rest'
    };

    // If anchor is set on another date and target is weekday, calculate rotational cycle
    if (anchor && anchor.date) {
      const splits = (window.DEQX?.data?.routines?.WORKOUT_SPLITS) || [
        'Chest + Triceps', 'Back + Biceps', 'Shoulders + Forearms', 'Leg Day'
      ];
      const sIdx = splits.indexOf(anchor.split);
      if (sIdx >= 0) {
        if (dow === 0 || dow === 6) return 'Rest';

        const anchorParts = anchor.date.split('-').map(Number);
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
          return splits[(sIdx + count) % splits.length];
        } else if (targetDt < anchorDt) {
          let cur = new Date(anchorDt);
          cur.setDate(cur.getDate() - 1);
          while (cur >= targetDt) {
            const cDow = cur.getDay();
            if (cDow !== 0 && cDow !== 6) count++;
            cur.setDate(cur.getDate() - 1);
          }
          const idx = (sIdx - (count % splits.length) + splits.length) % splits.length;
          return splits[idx];
        }
        return anchor.split;
      }
    }

    // Standard weekly routine mapping
    return weeklyMap[dow] || 'Rest';
  };

  /**
   * Set workout view (e.g. 'back' or 'biceps')
   */
  const setWorkoutView = (viewKey) => {
    activeViewKey = viewKey;
    renderWorkoutVisualization();
  };

  /**
   * Manually select or switch workout routine split
   */
  const setWorkoutSplit = (splitName) => {
    activeSplit = splitName;
    activeViewKey = null;
    renderWorkoutVisualization();
    const sel = document.getElementById('workoutSelect');
    if (sel && sel.value !== splitName) sel.value = splitName;
    updateWorkoutCaloriePreview();
  };

  /**
   * Toggle/Flip workout view between available angles
   */
  const toggleWorkoutView = () => {
    const routineData = getRoutineData();
    if (!routineData || !routineData.views) return;
    const keys = Object.keys(routineData.views);
    if (keys.length <= 1) return;
    const currentIdx = keys.indexOf(activeViewKey);
    const nextIdx = (currentIdx + 1) % keys.length;
    setWorkoutView(keys[nextIdx]);
  };

  /**
   * Get active routine configuration
   */
  const getRoutineData = () => {
    const routines = window.DEQX?.data?.routines?.WORKOUT_ROUTINES_DATA || {};
    const splitName = activeSplit || scheduleForDate(new Date());
    return routines[splitName] || routines['Back + Biceps'] || {};
  };

  /**
   * Toggle checklist exercise item
   */
  const toggleExerciseCheck = (exerciseId) => {
    const d = window.d;
    if (!d) return;
    const todayIso = viewingIso || window.today();

    d.workoutChecklist = d.workoutChecklist || {};
    d.workoutChecklist[todayIso] = d.workoutChecklist[todayIso] || {};

    const currentState = !!d.workoutChecklist[todayIso][exerciseId];
    d.workoutChecklist[todayIso][exerciseId] = !currentState;

    window.save(true);
    renderWorkoutProgressAndChecklist();
  };

  /**
   * Render the complete workout section
   */
  const renderWorkoutVisualization = () => {
    const today = new Date();
    const todayIso = window.today();
    const currentIso = viewingIso || todayIso;
    const split = activeSplit || scheduleForDate(today);
    activeSplit = split;

    const routine = getRoutineData();
    if (!routine) return;

    // Default view key initialization
    if (!activeViewKey || !routine.views[activeViewKey]) {
      activeViewKey = routine.defaultView || Object.keys(routine.views)[0] || 'back';
    }

    const currentView = routine.views[activeViewKey] || Object.values(routine.views)[0];

    // 1. Update Header Title & Split Badge
    const titleEl = document.getElementById('workoutHeroTitle');
    if (titleEl) titleEl.textContent = routine.title || split;

    const tagEl = document.getElementById('workoutHeroTag');
    if (tagEl) {
      tagEl.innerHTML = `<span class="pillDumbbell">🏋</span> <span>${routine.badgeTag || split.toUpperCase()}</span>`;
    }

    const subEl = document.getElementById('workoutHeroSubtitle');
    if (subEl) {
      subEl.innerHTML = (routine.subtitle || "This is today's scheduled workout. Complete it to earn +50 XP.")
        .replace('+50 XP', '<span class="xpHighlight">+50 XP</span>');
    }

    // 2. Render View Switcher Buttons
    const switcherEl = document.getElementById('workoutViewSwitcher');
    if (switcherEl && routine.views) {
      const viewKeys = Object.keys(routine.views);
      if (viewKeys.length > 1) {
        let html = '';
        viewKeys.forEach(key => {
          const v = routine.views[key];
          const isActive = key === activeViewKey;
          const label = v.label || key.toUpperCase();
          html += `<button type="button" class="workoutViewBtn ${isActive ? 'active' : ''}" onclick="DEQX.components.workout.setWorkoutView('${key}')">${window.esc(label)}</button>`;
        });
        html += `<button type="button" class="workoutFlipBtn" onclick="DEQX.components.workout.toggleWorkoutView()" title="Flip 3D Angle">Flip</button>`;
        switcherEl.innerHTML = html;
        switcherEl.style.display = 'flex';
      } else {
        switcherEl.style.display = 'none';
      }
    }

    // 3. Update Muscle Visualization Stage Image
    const imgEl = document.getElementById('workoutMuscleImg');
    if (imgEl && currentView) {
      imgEl.src = currentView.image || 'assets/workout-back.png';
      imgEl.alt = `${routine.title} - ${currentView.label || 'Muscle Diagram'}`;
    }

    // 4. Update Target Muscle Card
    const targetCard = document.getElementById('workoutTargetCard');
    if (targetCard && currentView?.targetMuscle) {
      const tm = currentView.targetMuscle;
      const iconEl = document.getElementById('workoutTargetIcon');
      if (iconEl) iconEl.src = tm.icon || 'assets/target-lat.png';
      const nameEl = document.getElementById('workoutTargetName');
      if (nameEl) nameEl.textContent = tm.name || 'Primary Muscle';
      const roleEl = document.getElementById('workoutTargetRole');
      if (roleEl) roleEl.textContent = tm.role || 'Primary Target';
      targetCard.style.display = 'block';
    } else if (targetCard) {
      targetCard.style.display = 'none';
    }

    // 5. Render Progress & Checklist
    renderWorkoutProgressAndChecklist();
  };

  /**
   * Render circular progress ring, progress bar, exercise count, and exercise checklist
   */
  const renderWorkoutProgressAndChecklist = () => {
    const routine = getRoutineData();
    if (!routine) return;
    const currentView = routine.views[activeViewKey] || Object.values(routine.views)[0];
    if (!currentView) return;

    const exercises = currentView.exercises || [];
    const totalCount = exercises.length;
    const todayIso = viewingIso || window.today();
    const d = window.d;

    const checklistMap = (d?.workoutChecklist && d.workoutChecklist[todayIso]) || {};
    let doneCount = 0;
    exercises.forEach(ex => {
      if (checklistMap[ex.id]) doneCount++;
    });

    const isAllDone = totalCount > 0 && doneCount === totalCount;
    const isWorkoutLogged = !!(d?.workoutHistory && d.workoutHistory[todayIso]?.completed);
    const completedOverall = isAllDone || isWorkoutLogged;

    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : (completedOverall ? 100 : 0);

    // Update Progress Circle & Percent
    const pctEl = document.getElementById('workoutProgressPercent');
    if (pctEl) pctEl.textContent = `${pct}%`;

    const circleFill = document.getElementById('workoutProgressFillCircle');
    if (circleFill) {
      const circumference = 2 * Math.PI * 26; // r=26, ~163.36
      const offset = circumference - (pct / 100) * circumference;
      circleFill.style.strokeDashoffset = offset;
    }

    // Update Counter & Progress Bar
    const countEl = document.getElementById('workoutProgressCount');
    if (countEl) countEl.innerHTML = `${doneCount} / ${totalCount} <span>exercises</span>`;

    const barFill = document.getElementById('workoutProgressBarFill');
    if (barFill) barFill.style.width = `${pct}%`;

    // Update Exercises Header
    const exHeader = document.getElementById('workoutExercisesTitle');
    if (exHeader) {
      exHeader.textContent = currentView.exerciseHeader || `EXERCISES (${(currentView.label || 'ROUTINE').toUpperCase()})`;
    }

    // Render Exercise List Items
    const listEl = document.getElementById('workoutExerciseList');
    if (listEl) {
      let listHtml = '';
      exercises.forEach((ex, idx) => {
        const isChecked = !!checklistMap[ex.id] || isWorkoutLogged;
        listHtml += `
          <div class="workoutExerciseItem ${isChecked ? 'checked' : ''}" onclick="DEQX.components.workout.toggleExerciseCheck('${ex.id}')" role="button" tabindex="0">
            <img src="${ex.thumb || 'assets/pull-up.png'}" alt="${window.esc(ex.name)}" class="workoutExerciseThumb" loading="lazy">
            <div class="workoutExerciseNum">${idx + 1}</div>
            <div class="workoutExerciseDetails">
              <div class="workoutExerciseName">${window.esc(ex.name)}</div>
              <div class="workoutExerciseSets">${window.esc(ex.setsReps || '3 sets · 8–12 reps')}</div>
            </div>
            <button type="button" class="workoutCheckBtn" aria-label="Toggle ${window.esc(ex.name)}"></button>
          </div>
        `;
      });
      listEl.innerHTML = listHtml;
    }

    // Update Sticky Bottom CTA Button
    const ctaBtn = document.getElementById('workoutCtaBtn');
    const ctaText = document.getElementById('workoutCtaText');
    if (ctaBtn && ctaText) {
      if (completedOverall) {
        ctaBtn.classList.add('completed');
        ctaText.textContent = '✓ Workout Completed (+50 XP Earned)';
      } else {
        ctaBtn.classList.remove('completed');
        ctaText.textContent = currentView.ctaText ? `▶ ${currentView.ctaText}` : `▶ Start ${currentView.label || 'Workout'}`;
      }
    }

    // Auto-award 50 XP if user just checked all 5 exercises and workout wasn't marked complete yet
    if (isAllDone && !isWorkoutLogged) {
      markWorkoutComplete(false);
    }
  };

  /**
   * Mark workout completed for today and award XP
   */
  const markWorkoutComplete = (manualClick = true) => {
    const d = window.d;
    if (!d) return;
    const todayIso = viewingIso || window.today();
    const routine = getRoutineData();
    const splitName = routine.title || activeSplit || 'Workout';

    d.workoutHistory = d.workoutHistory || {};
    const alreadyDone = !!(d.workoutHistory[todayIso]?.completed);

    if (alreadyDone && manualClick) {
      window.toast("Today's workout is already completed! Awesome discipline. 💪");
      return;
    }

    // Mark all exercises checked for today
    const currentView = routine.views[activeViewKey] || Object.values(routine.views)[0];
    if (currentView?.exercises) {
      d.workoutChecklist = d.workoutChecklist || {};
      d.workoutChecklist[todayIso] = d.workoutChecklist[todayIso] || {};
      currentView.exercises.forEach(ex => {
        d.workoutChecklist[todayIso][ex.id] = true;
      });
    }

    const weightUsed = getEffectiveWorkoutWeight();
    const duration = 45;
    const intensity = 'moderate';
    const caloriesBurned = calculateGymCalories(duration, weightUsed, intensity);

    d.workout = `${splitName} (${duration} min · ${caloriesBurned} kcal)`;
    d.workoutHistory[todayIso] = {
      completed: true,
      workout: splitName,
      duration: duration,
      intensity: intensity,
      calories: caloriesBurned,
      weightUsed: weightUsed
    };

    window.save(true);

    if (typeof window.rewardOnce === 'function') {
      window.rewardOnce('workout', 50, 'Completed daily workout!');
    } else if (typeof window.addXP === 'function') {
      window.addXP(50, 'Completed daily workout!');
    }

    if (typeof window.updateStreak === 'function') window.updateStreak();
    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();

    renderWorkoutProgressAndChecklist();
    renderCalendar();

    window.toast(`🔥 Workout Mission Completed! +50 XP Awarded!`);
  };

  /**
   * Toggle completion from CTA button
   */
  const toggleWorkoutComplete = () => {
    const todayIso = viewingIso || window.today();
    const d = window.d;
    const isWorkoutLogged = !!(d?.workoutHistory && d.workoutHistory[todayIso]?.completed);

    if (isWorkoutLogged) {
      window.toast("Workout already recorded for today! Great job! 🏆");
    } else {
      markWorkoutComplete(true);
    }
  };

  /**
   * Render monthly calendar view
   */
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
        isSelected = iso === viewingIso,
        isWork = sch !== 'Rest',
        completed = !!(d?.workoutHistory && d.workoutHistory[iso]?.completed);
      out += `<div class="calDay ${isWork ? 'workday ' : 'rest '}${isToday ? 'today ' : ''}${isSelected ? 'selected ' : ''}${completed ? 'completed' : ''}" onclick="DEQX.components.workout.onCalendarDayClick('${iso}')" title="Tap to preview or edit routine for ${iso}"><div class="dateNum">${day}</div><div class="calWorkout">${sch === 'Rest' ? 'REST' : window.esc(sch.replace(' + ', ' +<br>')).replace(/&lt;br&gt;/g, '<br>')}</div></div>`;
    }
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = out;

    const activeIso = viewingIso || todayIso;
    const activeDateObj = new Date(activeIso + 'T00:00:00');
    const activeSchedule = scheduleForDate(activeDateObj);
    const isToday = activeIso === todayIso;
    const isDone = !!(d?.workoutHistory && d.workoutHistory[activeIso]?.completed);
    const dayLabel = isToday ? 'Today' : activeIso;

    const missionEl = document.getElementById('calendarTodayMission');
    if (missionEl) {
      missionEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            ${activeSchedule === 'Rest'
              ? '<span class="restBadge">😴 <b>' + dayLabel + ' is a rest day.</b> Recovery days do not penalize your streak.</span>'
              : isDone
              ? '✅ <b>' + dayLabel + ': ' + window.esc(activeSchedule) + ' completed.</b>'
              : '🔥 <b>' + dayLabel + ':</b> ' + window.esc(activeSchedule) + ' · Complete it to earn <b>+50 XP</b>.'}
          </div>
          <button type="button" class="calEditBtn" onclick="DEQX.components.workout.openCalendarDayAdjust('${activeIso}')" title="Edit Workout Schedule for ${dayLabel}">
            ✏️ Edit Routine
          </button>
        </div>
      `;
    }

    // Sync activeSplit and render visualization
    if (!activeSplit) activeSplit = scheduleForDate(now);
    renderWorkoutVisualization();
    updateWorkoutCaloriePreview();
  };

  /**
   * Handler for calendar day tap
   */
  const onCalendarDayClick = (iso) => {
    const dateObj = new Date(iso + 'T00:00:00');
    viewingIso = iso;
    activeSplit = scheduleForDate(dateObj);
    activeViewKey = null; // Reset to default view for new day
    renderWorkoutVisualization();
    renderCalendar();
    window.toast(`Selected ${iso}: ${activeSplit}`);
  };

  const changeMonth = (delta) => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
    renderCalendar();
  };

  const setWorkoutCycle = (split, targetDateIso) => {
    const d = window.d;
    if (!d) return;
    d.workoutAnchor = { date: targetDateIso, split };
    d.workoutOverrides = d.workoutOverrides || {};
    d.workoutOverrides[targetDateIso] = split;
    window.save(true);
    viewingIso = targetDateIso;
    activeSplit = split;
    activeViewKey = null;
    renderWorkoutVisualization();
    renderCalendar();
    window.toast(`Routine updated: ${split} for ${targetDateIso} ✓`);
  };

  const openCalendarDayAdjust = (iso) => {
    const modal = document.getElementById('adjustWorkoutModal') || document.getElementById('adjustModal');
    if (!modal) return;
    const targetIso = iso || viewingIso || window.isoDate(new Date());
    const sch = scheduleForDate(new Date(targetIso + 'T00:00:00'));
    const title = document.getElementById('adjustModalTitle') || document.getElementById('adjustDateTitle');
    if (title) title.textContent = `Edit Workout Routine (${targetIso})`;
    const sub = document.getElementById('adjustModalSubtitle');
    if (sub) sub.innerHTML = `Currently scheduled: <b style="color:var(--neon-lime,#d6ff32)">${sch}</b>.<br>Choose a workout split to set for this date and continue your workout cycle:`;
    modal.dataset.iso = targetIso;
    modal.classList.add('show');
  };

  const closeAdjustModal = () => {
    const modal = document.getElementById('adjustWorkoutModal') || document.getElementById('adjustModal');
    if (modal) modal.classList.remove('show');
  };

  const applyDayAdjust = (split) => {
    const modal = document.getElementById('adjustWorkoutModal') || document.getElementById('adjustModal');
    const iso = (modal && modal.dataset.iso) || viewingIso || window.isoDate(new Date());
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
    const mins = Math.min(360, Math.max(1, parsedMins || 45));
    const intensity = document.getElementById('workoutIntensity')?.value || 'moderate';
    const weight = getEffectiveWorkoutWeight();
    const kcal = calculateGymCalories(mins, weight, intensity);

    const valEl = document.getElementById('workoutCalorieValue');
    if (valEl) valEl.textContent = kcal;

    const formulaEl = document.getElementById('workoutCalorieFormula');
    if (formulaEl) {
      formulaEl.textContent = `${window.formatDurationLabel(mins)} · ${intensity} (MET ${intensity === 'light' ? 3.5 : intensity === 'hard' ? 7.5 : 5.5})`;
    }
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
    } else {
      workoutName = activeSplit || 'Standard Workout';
    }

    const rawMins = minutesInput?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const duration = Math.min(360, Math.max(1, parsedMins || 45));
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
    if (typeof window.rewardOnce === 'function') window.rewardOnce('workout', 50, 'Completed daily workout!');
    window.savedFeedback(`Workout logged ✓ ${workoutName} (${caloriesBurned} kcal)`, 'workout');
    renderCalendar();
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.workout = {
    scheduleForDate,
    setWorkoutView,
    setWorkoutSplit,
    toggleWorkoutView,
    toggleExerciseCheck,
    toggleWorkoutComplete,
    markWorkoutComplete,
    setWorkoutCycle,
    openCalendarDayAdjust,
    closeAdjustModal,
    applyDayAdjust,
    getEffectiveWorkoutWeight,
    calculateGymCalories,
    updateWorkoutCaloriePreview,
    renderCalendar,
    renderWorkoutVisualization,
    onCalendarDayClick,
    changeMonth,
    saveWorkout
  };

  // Global backward compatibility
  window.scheduleForDate = scheduleForDate;
  window.setWorkoutView = setWorkoutView;
  window.setWorkoutSplit = setWorkoutSplit;
  window.toggleWorkoutView = toggleWorkoutView;
  window.toggleExerciseCheck = toggleExerciseCheck;
  window.toggleWorkoutComplete = toggleWorkoutComplete;
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
