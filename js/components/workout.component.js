/**
 * DEQX FIT - Workout Component
 * High-performance, modular component for workout schedule, muscle visualizer,
 * progress tracking, interactive checklists, set/rep/weight logging, PR system,
 * and fitness history calendar.
 */

(function (window) {
  'use strict';

  let calendarCursor = new Date();
  let activeSplit = null;
  let activeViewKey = null;
  let viewingIso = null;

  /**
   * Determine the scheduled workout routine for a given date.
   * Canonical Weekly Schedule (Section 8):
   * Monday: Chest + Triceps
   * Tuesday: Back + Biceps
   * Wednesday: Shoulders + Forearms
   * Thursday: Leg Day
   * Friday: Chest + Triceps
   * Saturday: Rest
   * Sunday: Rest
   */
  const scheduleForDate = (date) => {
    const targetIso = window.isoDate(date);
    const d = window.d;

    // Check direct user override if explicitly set
    if (d && d.workoutOverrides && d.workoutOverrides[targetIso]) {
      return d.workoutOverrides[targetIso];
    }

    const dow = date.getDay(); // 0 is Sunday, 6 is Saturday
    const weeklyMap = {
      0: 'Rest',
      1: 'Chest + Triceps',
      2: 'Back + Biceps',
      3: 'Shoulders + Forearms',
      4: 'Leg Day',
      5: 'Chest + Triceps',
      6: 'Rest'
    };

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
   * Log an exercise set (Section 9: sets, reps, weight, PR auto-detection)
   */
  const logExerciseSet = (exerciseId, exerciseName) => {
    const d = window.d;
    if (!d) return;
    const todayIso = viewingIso || window.today();

    const wInput = document.getElementById(`setWeight_${exerciseId}`);
    const rInput = document.getElementById(`setReps_${exerciseId}`);
    if (!wInput || !rInput) return;

    const weight = parseFloat(wInput.value);
    const reps = parseInt(rInput.value, 10);

    if (isNaN(weight) || weight <= 0 || isNaN(reps) || reps <= 0) {
      if (typeof window.toast === 'function') window.toast('Please enter valid weight and reps');
      return;
    }

    d.workoutSets = d.workoutSets || {};
    d.workoutSets[todayIso] = d.workoutSets[todayIso] || {};
    d.workoutSets[todayIso][exerciseId] = d.workoutSets[todayIso][exerciseId] || [];

    const setNum = d.workoutSets[todayIso][exerciseId].length + 1;
    d.workoutSets[todayIso][exerciseId].push({
      set: setNum,
      weight,
      reps,
      completed: true,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });

    // Mark exercise completed in checklist
    d.workoutChecklist = d.workoutChecklist || {};
    d.workoutChecklist[todayIso] = d.workoutChecklist[todayIso] || {};
    d.workoutChecklist[todayIso][exerciseId] = true;

    // Detect Personal Record (Section 10)
    d.personalRecords = d.personalRecords || {};
    const prevPR = d.personalRecords[exerciseId];
    const isNewPR = !prevPR || (weight > prevPR.weight) || (weight === prevPR.weight && reps > prevPR.reps);

    if (isNewPR) {
      d.personalRecords[exerciseId] = {
        weight,
        reps,
        date: todayIso,
        exerciseName: exerciseName || exerciseId
      };
      if (typeof window.addXP === 'function') {
        window.addXP(100, `New PR: ${exerciseName} ${weight}kg × ${reps}`);
      }
      showPrNotification(exerciseName, weight, reps);
    } else {
      if (typeof window.toast === 'function') {
        window.toast(`Logged Set ${setNum}: ${weight}kg × ${reps}`);
      }
    }

    // Save previous best for "LAST TIME" lookup
    d.exerciseHistory = d.exerciseHistory || {};
    d.exerciseHistory[exerciseId] = {
      weight,
      reps,
      date: todayIso
    };

    window.save(true);
    renderWorkoutProgressAndChecklist();
  };

  /**
   * Subtle, premium Personal Record achievement banner (Section 10)
   */
  const showPrNotification = (name, weight, reps) => {
    let prBanner = document.getElementById('prBannerOverlay');
    if (!prBanner) {
      prBanner = document.createElement('div');
      prBanner.id = 'prBannerOverlay';
      prBanner.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: rgba(14, 20, 12, 0.95);
        border: 1.5px solid var(--lime, #b8f53a);
        box-shadow: 0 10px 30px rgba(0,0,0,0.85), 0 0 20px rgba(184,245,58,0.25);
        padding: 14px 20px;
        border-radius: 14px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 14px;
        opacity: 0;
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;
      document.body.appendChild(prBanner);
    }

    prBanner.innerHTML = `
      <div style="font-size:26px;line-height:1">🏆</div>
      <div>
        <div style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.1em">NEW PERSONAL RECORD</div>
        <div style="font-size:14px;font-weight:700;color:#fff">${window.esc(name)} · ${weight}kg × ${reps}</div>
        <div style="font-size:11px;color:#a3b29d;margin-top:2px">+100 XP Earned</div>
      </div>
    `;

    prBanner.style.opacity = '1';
    prBanner.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      prBanner.style.opacity = '0';
      prBanner.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 3800);
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

    // 5. Render Progress & Exercise Checklist
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

    const pctEl = document.getElementById('workoutProgressPercent');
    if (pctEl) pctEl.textContent = `${pct}%`;

    const circleFill = document.getElementById('workoutProgressFillCircle');
    if (circleFill) {
      const circumference = 2 * Math.PI * 26;
      const offset = circumference - (pct / 100) * circumference;
      circleFill.style.strokeDashoffset = offset;
    }

    const countEl = document.getElementById('workoutProgressCount');
    if (countEl) countEl.innerHTML = `${doneCount} / ${totalCount} <span>exercises</span>`;

    const barFill = document.getElementById('workoutProgressBarFill');
    if (barFill) barFill.style.width = `${pct}%`;

    const exHeader = document.getElementById('workoutExercisesTitle');
    if (exHeader) {
      exHeader.textContent = currentView.exerciseHeader || `EXERCISES (${(currentView.label || 'ROUTINE').toUpperCase()})`;
    }

    // Render Exercise List with Real Tracking (Sets, Reps, Weights, LAST TIME)
    const listEl = document.getElementById('workoutExerciseList');
    if (listEl) {
      let listHtml = '';
      exercises.forEach((ex, idx) => {
        const isChecked = !!checklistMap[ex.id] || isWorkoutLogged;
        const loggedSets = (d?.workoutSets && d.workoutSets[todayIso] && d.workoutSets[todayIso][ex.id]) || [];
        const lastRecord = (d?.exerciseHistory && d.exerciseHistory[ex.id]) || (d?.personalRecords && d.personalRecords[ex.id]);
        const lastTimeStr = lastRecord ? `${lastRecord.weight}kg × ${lastRecord.reps}` : null;
        const prRecord = d?.personalRecords && d.personalRecords[ex.id];

        listHtml += `
          <div class="workoutExerciseItem ${isChecked ? 'checked' : ''}" style="display:flex;flex-direction:column;gap:8px;padding:12px;margin-bottom:10px;background:rgba(18,24,16,0.85);border:1px solid rgba(255,255,255,0.06);border-radius:14px">
            <div style="display:flex;align-items:center;width:100%;cursor:pointer" onclick="DEQX.components.workout.toggleExerciseCheck('${ex.id}')">
              <img src="${ex.thumb || 'assets/pull-up.png'}" alt="${window.esc(ex.name)}" class="workoutExerciseThumb" loading="lazy" style="width:42px;height:42px;border-radius:8px;object-fit:cover;margin-right:10px">
              <div class="workoutExerciseNum" style="font-size:12px;font-weight:700;color:var(--lime,#b8f53a);margin-right:10px">${idx + 1}</div>
              <div class="workoutExerciseDetails" style="flex:1">
                <div class="workoutExerciseName" style="font-weight:700;font-size:13.5px;color:#fff">${window.esc(ex.name)}</div>
                <div class="workoutExerciseSets" style="font-size:11.5px;color:#92a28c">${window.esc(ex.setsReps || '3 sets · 8–12 reps')}</div>
              </div>
              <button type="button" class="workoutCheckBtn" aria-label="Toggle ${window.esc(ex.name)}"></button>
            </div>

            <!-- LAST TIME & PR DISPLAY -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:rgba(0,0,0,0.25);border-radius:8px;font-size:11px">
              <span style="color:#7a8a72;font-weight:600">LAST TIME: <b style="color:#ffffff">${lastTimeStr || 'None yet'}</b></span>
              ${prRecord ? `<span style="color:var(--lime,#b8f53a);font-weight:700">🏆 PR: ${prRecord.weight}kg × ${prRecord.reps}</span>` : ''}
            </div>

            <!-- LOGGED SETS FOR TODAY -->
            ${loggedSets.length ? `
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin:2px 0">
                ${loggedSets.map(s => `
                  <span style="background:rgba(184,245,58,0.12);border:1px solid rgba(184,245,58,0.3);color:var(--lime,#b8f53a);padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600">
                    Set ${s.set}: <b>${s.weight}kg × ${s.reps}</b>
                  </span>
                `).join('')}
              </div>
            ` : ''}

            <!-- INLINE SET LOGGER -->
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px" onclick="event.stopPropagation()">
              <span style="font-size:11px;color:#889980;min-width:38px;font-weight:600">Set ${loggedSets.length + 1}:</span>
              <input type="number" step="0.5" id="setWeight_${ex.id}" placeholder="kg" style="width:64px;padding:5px 7px;font-size:12px;background:#0d120c;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;text-align:center" value="${loggedSets.length ? loggedSets[loggedSets.length - 1].weight : (lastRecord?.weight || '')}">
              <span style="color:#667760;font-size:11px">×</span>
              <input type="number" step="1" id="setReps_${ex.id}" placeholder="reps" style="width:58px;padding:5px 7px;font-size:12px;background:#0d120c;border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;text-align:center" value="${loggedSets.length ? loggedSets[loggedSets.length - 1].reps : (lastRecord?.reps || 8)}">
              <button type="button" onclick="DEQX.components.workout.logExerciseSet('${ex.id}', '${window.esc(ex.name)}')" style="padding:5px 12px;background:#24301f;border:1px solid var(--lime,#b8f53a);color:var(--lime,#b8f53a);border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">+ Set</button>
            </div>
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
      if (typeof window.toast === 'function') {
        window.toast("Today's workout is already completed! Awesome discipline. 💪");
      }
      return;
    }

    // Mark all exercises checked
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
    const caloriesBurned = calculateGymCalories(duration, weightUsed, 'moderate');

    d.workout = `${splitName} (Completed · 45m · ${caloriesBurned} kcal)`;
    d.workoutHistory[todayIso] = {
      completed: true,
      workout: splitName,
      duration: duration,
      intensity: 'moderate',
      calories: caloriesBurned,
      weightUsed: weightUsed,
      timestamp: Date.now()
    };

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('workout', `🏋️ Workout Completed`, `${splitName} · +50 XP`, '🏋️', 0);
    }

    window.save(true);

    if (typeof window.rewardOnce === 'function') {
      window.rewardOnce('workout', 50, 'Completed daily workout');
    }
    if (typeof window.updateStreak === 'function') {
      window.updateStreak();
    }
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Workout Completed! +50 XP earned 🔥`, 'workout');
    }

    renderWorkoutProgressAndChecklist();
    renderCalendar();
  };

  const toggleWorkoutComplete = () => {
    const todayIso = viewingIso || window.today();
    const d = window.d;
    const isDone = !!(d?.workoutHistory && d.workoutHistory[todayIso]?.completed);

    if (isDone) {
      if (confirm('Unmark workout as completed for this day?')) {
        if (d.workoutHistory && d.workoutHistory[todayIso]) {
          d.workoutHistory[todayIso].completed = false;
        }
        window.save(true);
        renderWorkoutProgressAndChecklist();
        renderCalendar();
      }
    } else {
      markWorkoutComplete(true);
    }
  };

  /**
   * Fitness Calendar Rendering with Day Details
   */
  const renderCalendar = () => {
    const gridEl = document.getElementById('calendarGrid');
    const monthEl = document.getElementById('calendarMonth');
    if (!gridEl) return;

    const d = window.d;
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();

    if (monthEl) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      monthEl.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = window.today();

    let gridHtml = `
      <div class="calendarDayHeader">Su</div>
      <div class="calendarDayHeader">Mo</div>
      <div class="calendarDayHeader">Tu</div>
      <div class="calendarDayHeader">We</div>
      <div class="calendarDayHeader">Th</div>
      <div class="calendarDayHeader">Fr</div>
      <div class="calendarDayHeader">Sa</div>
    `;

    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += '<div class="calendarDay empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const iso = window.isoDate(dayDate);
      const schedule = scheduleForDate(dayDate);
      const isRest = schedule === 'Rest';
      const isToday = (iso === todayIso);
      const isSelected = (iso === viewingIso);

      const isCompleted = !!(d?.workoutHistory && d.workoutHistory[iso]?.completed);
      const dayRecord = d?.dailyRecords && d.dailyRecords[iso];
      const hasFood = dayRecord?.protein > 0 || (d?.foods && isToday && d.foods.length > 0);

      let classes = ['calendarDay'];
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');
      if (isCompleted) classes.push('completed');
      if (isRest) classes.push('rest');

      gridHtml += `
        <div class="${classes.join(' ')}" onclick="DEQX.components.workout.onCalendarDayClick('${iso}')" role="button" tabindex="0" title="${iso}: ${schedule}">
          <span class="dayNum">${day}</span>
          <span class="calStatusIcon">${isCompleted ? '✓' : isRest ? '😴' : '•'}</span>
          ${hasFood ? '<span class="calFoodDot" style="width:3px;height:3px;background:var(--lime,#b8f53a);border-radius:50%;position:absolute;bottom:3px;right:3px"></span>' : ''}
        </div>
      `;
    }

    gridEl.innerHTML = gridHtml;

    // Mission status bar
    const now = new Date();
    const activeIso = viewingIso || todayIso;
    const activeSchedule = scheduleForDate(new Date(activeIso + 'T00:00:00'));
    const isDone = !!(d?.workoutHistory && d.workoutHistory[activeIso]?.completed);
    const dayLabel = activeIso === todayIso ? 'Today' : activeIso;

    const missionEl = document.getElementById('calendarTodayMission');
    if (missionEl) {
      missionEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            ${activeSchedule === 'Rest'
              ? '<span class="restBadge">😴 <b>' + dayLabel + ' is a rest day.</b> Active recovery keeps your streak intact.</span>'
              : isDone
              ? '✅ <b>' + dayLabel + ': ' + window.esc(activeSchedule) + ' completed.</b>'
              : '🔥 <b>' + dayLabel + ':</b> ' + window.esc(activeSchedule) + ' · Complete it to earn <b>+50 XP</b>.'}
          </div>
          <div style="display:flex;gap:6px">
            <button type="button" class="calEditBtn" onclick="DEQX.components.workout.openDayOverviewModal('${activeIso}')" title="View Full Day Summary" style="padding:5px 9px;font-size:11px">
              📊 Day Overview
            </button>
            <button type="button" class="calEditBtn" onclick="DEQX.components.workout.openCalendarDayAdjust('${activeIso}')" title="Edit Workout Schedule for ${dayLabel}">
              ✏️ Edit
            </button>
          </div>
        </div>
      `;
    }

    if (!activeSplit) activeSplit = scheduleForDate(now);
    renderWorkoutVisualization();
    updateWorkoutCaloriePreview();
  };

  /**
   * Calendar Day Click -> Display day summary & select workout
   */
  const onCalendarDayClick = (iso) => {
    const dateObj = new Date(iso + 'T00:00:00');
    viewingIso = iso;
    activeSplit = scheduleForDate(dateObj);
    activeViewKey = null;
    renderWorkoutVisualization();
    renderCalendar();
    openDayOverviewModal(iso);
  };

  /**
   * Open Fitness History Day Overview Modal (Section 13)
   * Displays: Date, Weight, Protein, Water, Calories, Burned, Workout, Budget, Daily Score
   */
  const openDayOverviewModal = (iso) => {
    const d = window.d;
    const dateObj = new Date(iso + 'T00:00:00');
    const sch = scheduleForDate(dateObj);
    const rec = (d?.dailyRecords && d.dailyRecords[iso]) || {};
    const isToday = iso === window.today();

    const p = isToday ? (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0) : (rec.protein || 0);
    const c = isToday ? (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0) : (rec.calories || 0);
    const w = isToday ? (d.water || 0) : (rec.water || 0);
    const burn = isToday ? ((window.v9 && window.v9.burned) || 0) : (rec.burned || 0);
    const weight = isToday ? (d.weight || '--') : (rec.weight || '--');
    const spent = isToday ? (d.spent || 0) : (rec.spent || 0);
    const done = !!(d?.workoutHistory && d.workoutHistory[iso]?.completed);

    const score = isToday
      ? (typeof window.calculateCurrentDailyPercent === 'function' ? window.calculateCurrentDailyPercent() : 0)
      : (rec.dailyCompletion || (done ? 80 : 40));

    let modal = document.getElementById('dayFitnessModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dayFitnessModal';
      modal.className = 'levelOverlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
      document.body.appendChild(modal);
    }

    const dateFormatted = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    modal.innerHTML = `
      <div class="levelUpBox" style="text-align:left;max-width:390px;padding:24px 20px;border:1px solid rgba(214,255,50,0.3);background:#111710;box-shadow:0 14px 44px rgba(0,0,0,0.9)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">FITNESS CALENDAR OVERVIEW</span>
            <h2 style="font-size:18px;margin:2px 0 0;color:#ffffff">${dateFormatted}</h2>
          </div>
          <button type="button" onclick="document.getElementById('dayFitnessModal').classList.remove('show')" style="padding:4px 9px;background:#20281e;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer">✕</button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;margin-bottom:14px;background:rgba(184,245,58,0.06);border:1px solid rgba(184,245,58,0.2);border-radius:12px">
          <div>
            <div style="font-size:11px;color:#92a28c">Daily Score</div>
            <div style="font-size:22px;font-weight:800;color:var(--lime,#b8f53a);line-height:1.1">${score}%</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#92a28c">Workout</div>
            <div style="font-size:13px;font-weight:700;color:#fff">${window.esc(sch)} ${done ? '✓' : (sch === 'Rest' ? '😴' : '—')}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Weight</span>
            <b style="display:block;font-size:15px;color:#fff">${weight} kg</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Protein</span>
            <b style="display:block;font-size:15px;color:var(--lime,#b8f53a)">${Math.round(p * 10) / 10}g</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Hydration</span>
            <b style="display:block;font-size:15px;color:#fff">${w} L</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Calories</span>
            <b style="display:block;font-size:15px;color:#fff">${Math.round(c)} kcal</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Burned</span>
            <b style="display:block;font-size:15px;color:#fff">${burn} kcal</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:11px;color:#7a8a72">Spending</span>
            <b style="display:block;font-size:15px;color:#fff">₹${spent}</b>
          </div>
        </div>

        <button type="button" class="primary" onclick="document.getElementById('dayFitnessModal').classList.remove('show')" style="width:100%">Close</button>
      </div>
    `;

    modal.classList.add('show');
  };

  const changeMonth = (delta) => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
    renderCalendar();
  };

  const setWorkoutCycle = (split, targetDateIso) => {
    const d = window.d;
    if (!d) return;
    d.workoutOverrides = d.workoutOverrides || {};
    d.workoutOverrides[targetDateIso] = split;
    window.save(true);
    viewingIso = targetDateIso;
    activeSplit = split;
    activeViewKey = null;
    renderWorkoutVisualization();
    renderCalendar();
    if (typeof window.toast === 'function') {
      window.toast(`Routine updated: ${split} for ${targetDateIso} ✓`);
    }
  };

  const openCalendarDayAdjust = (iso) => {
    const modal = document.getElementById('adjustWorkoutModal') || document.getElementById('adjustModal');
    if (!modal) return;
    const targetIso = iso || viewingIso || window.isoDate(new Date());
    const sch = scheduleForDate(new Date(targetIso + 'T00:00:00'));
    const title = document.getElementById('adjustModalTitle');
    if (title) title.textContent = `Edit Workout Routine (${targetIso})`;
    const sub = document.getElementById('adjustModalSubtitle');
    if (sub) sub.innerHTML = `Currently scheduled: <b style="color:var(--lime,#b8f53a)">${sch}</b>.<br>Select a routine for this date:`;
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
    const key = String(intensityKey || 'moderate').toLowerCase();
    const metMap = {
      easy: 3.5,
      light: 3.5,
      low: 3.5,
      moderate: 5.5,
      medium: 5.5,
      standard: 5.5,
      hard: 7.5,
      high: 7.5,
      vigorous: 7.5
    };
    const met = metMap[key] || 5.5;
    const calPerMin = (met * 3.5 * weight) / 200;
    return Math.round(calPerMin * mins);
  };

  const updateWorkoutCaloriePreview = () => {
    const previewEl = document.getElementById('workoutCaloriePreview');
    if (!previewEl) return;
    const rawMins = document.getElementById('workoutMinutes')?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const mins = Math.min(1440, Math.max(1, parsedMins || 60));
    const intensity = document.getElementById('workoutIntensity')?.value || 'moderate';
    const weight = getEffectiveWorkoutWeight();
    const kcal = calculateGymCalories(mins, weight, intensity);

    const valEl = document.getElementById('workoutCalorieValue');
    if (valEl) valEl.textContent = kcal;

    const formulaEl = document.getElementById('workoutCalorieFormula');
    if (formulaEl) {
      const intKey = String(intensity).toLowerCase();
      const intensityLabel = (intKey === 'easy' || intKey === 'light') ? 'Easy' : (intKey === 'hard') ? 'Hard' : 'Moderate';
      const metMap = { easy: 3.5, light: 3.5, moderate: 5.5, hard: 7.5 };
      const metVal = metMap[intKey] || 5.5;
      formulaEl.textContent = `${window.formatDurationLabel(mins)} · ${intensityLabel} (MET ${metVal})`;
    }
  };

  const saveWorkout = () => {
    const d = window.d;
    if (!d) return;
    const select = document.getElementById('workoutSelect');
    const intensitySel = document.getElementById('workoutIntensity');
    const minutesInput = document.getElementById('workoutMinutes');
    const weightInput = document.getElementById('workoutWeight');

    let workoutName = (select && select.value) ? select.value : (activeSplit || 'Standard Workout');

    const rawMins = minutesInput?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const duration = Math.min(1440, Math.max(1, parsedMins || 60));
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
      weightUsed: weightUsed,
      timestamp: Date.now()
    };

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('workout', `🏋️ Workout Session`, `${workoutName} (${caloriesBurned} kcal)`, '🏋️', 0);
    }

    window.save(true);
    if (typeof window.updateStreak === 'function') window.updateStreak();
    if (typeof window.rewardOnce === 'function') window.rewardOnce('workout', 50, 'Completed daily workout!');
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback('Workout saved ✓', 'workout');
    }
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
    logExerciseSet,
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
    openDayOverviewModal,
    changeMonth,
    saveWorkout
  };

  // Global backward compatibility
  window.scheduleForDate = scheduleForDate;
  window.setWorkoutView = setWorkoutView;
  window.setWorkoutSplit = setWorkoutSplit;
  window.toggleWorkoutView = toggleWorkoutView;
  window.toggleExerciseCheck = toggleExerciseCheck;
  window.logExerciseSet = logExerciseSet;
  window.toggleWorkoutComplete = toggleWorkoutComplete;
  window.setWorkoutCycle = setWorkoutCycle;
  window.openCalendarDayAdjust = openCalendarDayAdjust;
  window.closeAdjustModal = closeAdjustModal;
  window.applyDayAdjust = applyDayAdjust;
  window.getEffectiveWorkoutWeight = getEffectiveWorkoutWeight;
  window.calculateGymCalories = calculateGymCalories;
  window.updateWorkoutCaloriePreview = updateWorkoutCaloriePreview;
  window.renderCalendar = renderCalendar;
  window.openDayOverviewModal = openDayOverviewModal;
  window.changeMonth = changeMonth;
  window.saveWorkout = saveWorkout;

})(window);
