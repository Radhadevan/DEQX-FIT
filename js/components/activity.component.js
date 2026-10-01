/**
 * DEQX FIT - Activity Component
 * Physical activity tracking, custom MET activities, calorie burn calculation.
 */

(function (window) {
  'use strict';

  const renderActivityChoices = () => {
    const container = document.getElementById('activityChoices') || document.getElementById('activityGrid');
    if (!container) return;
    const acts = (window.DEQX?.data?.activities?.ACTIVITIES) || window.ACTIVITIES || [];
    const v9 = window.v9;

    container.innerHTML = acts.map(item => `
      <div class="activityChoice ${(v9 && v9.activity === item.id) ? 'selected' : ''}" data-activity="${item.id}" onclick="selectActivity('${item.id}')">
        <span class="actIcon">${item.icon}</span>
        <b>${item.label}</b>
        <small>${item.sub}</small>
      </div>
    `).join('');
  };

  const selectActivity = (actId) => {
    const v9 = window.v9;
    if (!v9) return;
    v9.activity = (v9.activity === actId) ? null : actId;
    window.saveV9();
    renderV9();
    updateActivityCaloriePreview();
  };

  const calculateActivityCalories = (activityId, mins, weight, intensity) => {
    let met = 7.0;
    let displayName = activityId || 'Activity';
    let isBadminton = false;
    let effectiveMins = mins;

    const acts = (window.DEQX?.data?.activities?.ACTIVITIES) || window.ACTIVITIES || [];
    const baseAct = acts.find(a => a.id === activityId);
    const d = window.d;
    const customAct = d?.customActivities?.find(c => c.id === activityId);

    if (customAct) {
      met = Number(customAct.met) || 6.0;
      displayName = customAct.name || customAct.label;
    } else if (activityId === 'Badminton') {
      isBadminton = true;
      effectiveMins = Math.max(1, Math.round(mins / 2));
      met = intensity === 'low' ? 4.5 : intensity === 'high' ? 7.5 : 6.0;
      displayName = 'Badminton';
    } else if (activityId === 'Cricket') {
      met = intensity === 'low' ? 3.5 : intensity === 'high' ? 6.0 : 4.8;
      displayName = 'Cricket';
    } else {
      met = intensity === 'low' ? 4.0 : intensity === 'high' ? 8.0 : 6.0;
    }

    const intensityMultiplier = intensity === 'low' ? 0.85 : intensity === 'high' ? 1.2 : 1.0;
    const calPerMin = (met * intensityMultiplier * 3.5 * weight) / 200;
    const kcal = Math.round(calPerMin * effectiveMins);

    return { kcal, displayName, isBadminton, effectiveMins, met };
  };

  const updateActivityCaloriePreview = () => {
    const previewEl = document.getElementById('activityCaloriePreview');
    const formulaEl = document.getElementById('activityCalorieFormula');
    const valueEl = document.getElementById('activityCalorieValue');
    const v9 = window.v9;
    const d = window.d;

    if (!v9 || !v9.activity) {
      if (formulaEl) formulaEl.textContent = 'Select an activity above';
      if (valueEl) valueEl.textContent = '--';
      return;
    }

    const rawMins = document.getElementById('activityMinutes')?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const mins = Math.min(600, Math.max(1, parsedMins || 45));
    const intensity = document.getElementById('activityIntensity')?.value || 'moderate';
    const weight = Math.max(40, Math.min(180, Number(d?.weight) || 70));

    const { kcal, displayName, isBadminton, effectiveMins } = calculateActivityCalories(v9.activity, mins, weight, intensity);

    if (valueEl) valueEl.textContent = kcal;
    if (formulaEl) {
      const badmintonNote = isBadminton ? ` (1/2 active: ${window.formatDurationLabel(effectiveMins)})` : '';
      formulaEl.innerHTML = `<b>${window.esc(displayName)}</b> · ${window.formatDurationLabel(mins)}${badmintonNote} · ${intensity}`;
    }
  };

  const calculateActivity = () => {
    const v9 = window.v9;
    const d = window.d;
    if (!v9 || !v9.activity) {
      window.toast('Please select an activity first (Badminton, Cricket or Custom).');
      if (typeof window.show === 'function') window.show('activity');
      return;
    }

    const rawMins = document.getElementById('activityMinutes')?.value;
    const parsedMins = window.parseDurationToMinutes(rawMins);
    const mins = Math.min(600, Math.max(1, parsedMins || 45));
    const intensity = document.getElementById('activityIntensity')?.value || 'moderate';
    const weight = Math.max(40, Math.min(180, Number(d?.weight) || 70));

    const { kcal, displayName, isBadminton, effectiveMins } = calculateActivityCalories(v9.activity, mins, weight, intensity);

    v9.burned = kcal;
    v9.lastActivityDate = window.today();
    window.saveV9();

    const res = document.getElementById('activityResult');
    if (res) {
      res.style.display = 'block';
      const badmintonBadge = isBadminton
        ? `<br><small style="color:#b8f53a">🏸 Badminton calculated on half duration (${window.formatDurationLabel(effectiveMins)} active play factoring rest intervals)</small>`
        : '';
      res.innerHTML = `✅ <b>Saved ✓ ${kcal} kcal</b> · ${window.formatDurationLabel(mins)} ${window.esc(displayName)}${badmintonBadge}<br><small style="color:#a6b69e">${weight} kg · ${intensity} intensity · Shown on Home page</small>`;
    }

    window.earnXP(Math.min(60, Math.round(kcal / 10)), 'activity');
    const minInput = document.getElementById('activityMinutes');
    if (minInput) minInput.value = '45';
    window.updateBarUnit(minInput, 'activityBarUnit');
    document.querySelectorAll('.activityChoice').forEach(x => x.classList.remove('selected'));
    v9.activity = null;
    window.saveV9();

    if (typeof window.render === 'function') window.render();
    renderV9();
    updateActivityCaloriePreview();
    window.toast(`Activity saved ✓ ${kcal} kcal burned on Home!`);
  };

  const saveCustomActivity = () => {
    const d = window.d;
    if (!d) return;
    const nameEl = document.getElementById('customActivityName') || document.getElementById('customActName');
    const catEl = document.getElementById('customActivityCategory');
    const iconEl = document.getElementById('customActivityIcon');
    const metEl = document.getElementById('customActivityMET') || document.getElementById('customActMet');
    if (!nameEl) return;

    const name = nameEl.value.trim();
    const met = parseFloat(metEl?.value) || 7.0;
    const icon = iconEl?.value || '🏃';
    const sub = catEl?.value.trim() || 'Custom';

    if (!name) {
      window.toast('Please enter a name for the custom activity.');
      return;
    }

    d.customActivities = d.customActivities || [];
    const id = 'custom_act_' + Date.now();
    d.customActivities.push({
      id,
      name,
      label: name.toUpperCase(),
      sub,
      icon,
      met
    });
    window.save(true);

    nameEl.value = '';
    if (catEl) catEl.value = '';
    renderCustomActivities();
    window.toast(`Saved custom activity: ${name}`);
  };

  const removeCustomActivity = (id) => {
    const d = window.d;
    if (!d || !d.customActivities) return;
    d.customActivities = d.customActivities.filter(x => x.id !== id);
    const v9 = window.v9;
    if (v9 && v9.activity === id) {
      v9.activity = null;
      window.saveV9();
    }
    window.save(true);
    renderCustomActivities();
    renderV9();
  };

  const renderCustomActivities = () => {
    const container = document.getElementById('customActivityList') || document.getElementById('customActivitiesList');
    if (!container) return;
    const d = window.d;
    if (!d || !d.customActivities || !d.customActivities.length) {
      container.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">No custom activities created yet.</p>';
      return;
    }
    const v9 = window.v9;
    container.innerHTML = d.customActivities.map(x => `
      <div class="activityChoice ${(v9 && v9.activity === x.id) ? 'selected' : ''}" data-activity="${x.id}" onclick="selectActivity('${x.id}')" style="position:relative">
        <span class="actIcon">${x.icon}</span>
        <b>${window.esc(x.name)}</b>
        <small>${window.esc(x.sub)} · MET ${x.met}</small>
        <button type="button" class="btnDelSmall" onclick="event.stopPropagation(); removeCustomActivity('${x.id}')" style="position:absolute; top:6px; right:6px" title="Delete">✕</button>
      </div>
    `).join('');
  };

  const renderV9 = () => {
    const v9 = window.v9;
    if (!v9) return;
    const d = window.d;

    document.querySelectorAll('.activityChoice').forEach(b => b.classList.toggle('selected', b.dataset.activity === v9.activity));
    const summary = document.getElementById('activitySummary');
    if (summary) {
      let actName = v9.activity;
      if (v9.activity && d && d.customActivities) {
        const custom = d.customActivities.find(x => x.id === v9.activity);
        if (custom) actName = custom.name || custom.label;
      }
      summary.textContent = actName ? `${actName} selected` : 'Choose an activity';
    }

    const burn = v9.burned || 0;
    const target = 500;
    const percent = Math.min(100, Math.round((burn / target) * 100));
    const next = v9.level * 100;
    const xpPct = Math.min(100, Math.round((v9.xp / next) * 100));

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
    if (bt) bt.textContent = `${burn} / ${target} kcal`;

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

    if (typeof window.updateDailyAnalytics === 'function') window.updateDailyAnalytics();
    updateActivityCaloriePreview();
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.activity = {
    renderActivityChoices,
    selectActivity,
    calculateActivityCalories,
    updateActivityCaloriePreview,
    calculateActivity,
    saveCustomActivity,
    removeCustomActivity,
    renderCustomActivities,
    renderV9
  };

  // Global backward compatibility
  window.renderActivityChoices = renderActivityChoices;
  window.selectActivity = selectActivity;
  window.calculateActivityCalories = calculateActivityCalories;
  window.updateActivityCaloriePreview = updateActivityCaloriePreview;
  window.calculateActivity = calculateActivity;
  window.saveCustomActivity = saveCustomActivity;
  window.removeCustomActivity = removeCustomActivity;
  window.renderCustomActivities = renderCustomActivities;
  window.renderV9 = renderV9;

})(window);
