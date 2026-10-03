/**
 * DEQX FIT - Home Component
 * Daily completion ring, spending ring, overview cards, streak indicators,
 * synchronized mission card, and chronological daily timeline.
 */

(function (window) {
  'use strict';

  /**
   * Render Today's Chronological Timeline on Home Page (Section 7)
   */
  const renderHomeTimeline = () => {
    const listEl = document.getElementById('homeTimelineList');
    const countEl = document.getElementById('timelineCount');
    if (!listEl) return;

    const d = window.d;
    const events = (d && d.timeline) || [];

    if (countEl) {
      countEl.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
    }

    if (!events.length) {
      listEl.innerHTML = `
        <div style="padding:14px 12px;text-align:center;color:#6b7965;font-size:12px">
          No events logged yet today. Log a meal, water, or workout to start your timeline.
        </div>
      `;
      return;
    }

    // Chronological order
    const sorted = [...events].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    listEl.innerHTML = sorted.map((ev, idx) => {
      const isLast = idx === sorted.length - 1;
      return `
        <div class="timelineItem" style="display:flex;align-items:flex-start;gap:12px;padding:9px 0;position:relative;border-bottom:${isLast ? 'none' : '1px solid rgba(255,255,255,0.05)'}">
          <div style="display:flex;flex-direction:column;align-items:center;min-width:44px">
            <span style="font-size:11px;font-weight:700;color:#7a8a72;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:6px">${ev.time || '--:--'}</span>
          </div>
          <div style="font-size:16px;line-height:1;margin-top:2px">${ev.icon || '•'}</div>
          <div style="flex:1">
            <b style="font-size:13px;color:#fff;display:block;line-height:1.3">${window.esc(ev.title)}</b>
            ${ev.detail ? `<span style="font-size:11.5px;color:var(--lime,#b8f53a);font-weight:600">${window.esc(ev.detail)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  /**
   * Update all Home Daily Analytics & Targets
   */
  const updateDailyAnalytics = () => {
    const d = window.d;
    if (!d) return;

    const p = (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0);
    const c = (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0);
    const burn = (window.v9 && window.v9.burned) || 0;
    const todayIso = window.today();
    const done = !!(d.workoutHistory && d.workoutHistory[todayIso]?.completed);

    // Compute unified 0-100% Daily Score from all 6 pillars
    const daily = (typeof window.calculateCurrentDailyPercent === 'function')
      ? window.calculateCurrentDailyPercent()
      : 0;

    const pct = (v, t) => Math.min(100, Math.round(((Number(v) || 0) / Math.max(1, Number(t) || 1)) * 100));

    const pp = pct(p, d.proteinTarget);
    const wp = pct(d.water, d.waterTarget);
    const cp = pct(c, d.calorieTarget);
    const bp = pct(burn, 500);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    set('todayDate', window.todayLabel());
    set('dailyPercent', daily);
    set('dailyRingText', daily + '%');
    set('dayState', daily >= 100 ? 'COMPLETE' : 'IN PROGRESS');

    const dr = document.getElementById('dailyRing');
    if (dr) dr.style.setProperty('--p', daily + '%');

    set('dailyMessage', daily >= 100
      ? 'All daily targets are complete. Outstanding discipline.'
      : daily === 0
      ? 'Your day starts here. Every logged goal moves the ring forward.'
      : daily < 50
      ? 'Good start. Keep stacking small wins.'
      : 'You are building strong momentum. Finish the day strong.');

    // Guarantee numerical values and progress bars are 100% synchronized
    set('proteinPct', pp + '%');
    set('waterPct', wp + '%');
    set('caloriePct', cp + '%');
    set('burnPctHome', bp + '%');

    set('proteinView', Math.round(p * 10) / 10);
    set('waterView', Number(d.water || 0).toFixed(2).replace(/\.00$/, ''));
    set('calView', Math.round(c));
    set('burnHome', Math.round(burn));

    set('proteinTargetHome', d.proteinTarget || 150);
    set('waterTargetHome', d.waterTarget || 3);
    set('calorieTargetHome', Number(d.calorieTarget || 2200).toLocaleString('en-IN'));

    const pb = document.getElementById('proteinBar');
    if (pb) pb.style.width = pp + '%';
    const wb = document.getElementById('waterBar');
    if (wb) wb.style.width = wp + '%';
    const cb = document.getElementById('calorieBar');
    if (cb) cb.style.width = cp + '%';
    const bb = document.getElementById('calorieBurnBarHome');
    if (bb) bb.style.width = bp + '%';

    // Synchronize Mission Card with Canonical Weekday Workout Schedule (Section 8)
    const now = new Date();
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const curDowName = dayNames[now.getDay()];
    const scheduledWorkout = (typeof window.scheduleForDate === 'function')
      ? window.scheduleForDate(now)
      : 'Workout';

    set('missionDay', `${curDowName} · TODAY`);
    set('missionTitle', scheduledWorkout);

    const isRest = scheduledWorkout === 'Rest';
    const mStatus = document.getElementById('missionStatus');
    const mXp = document.getElementById('missionXp');

    if (mStatus) {
      if (isRest) {
        mStatus.innerHTML = `😴 Active recovery day. Rest and repair muscles.`;
      } else if (done) {
        mStatus.innerHTML = `🎉 <b>${window.esc(scheduledWorkout)}</b> completed! Earned <b>+50 XP</b>.`;
      } else {
        mStatus.innerHTML = `🔥 Complete <b>${window.esc(scheduledWorkout)}</b> to earn <b>+50 XP</b>.`;
      }
    }

    if (mXp) {
      mXp.textContent = isRest ? 'REST DAY' : (done ? 'COMPLETED' : '+50 XP');
    }

    // Streak & Weekly Rhythm
    const streakVal = (typeof window.computeAndUpdateStreak === 'function')
      ? window.computeAndUpdateStreak(daily)
      : 0;
    const sUnit = streakVal === 1 ? 'day' : 'days';

    set('todayStreakCount', streakVal);
    set('streakHome', streakVal);
    set('streakHomeUnit', sUnit);
    set('streakView', streakVal);
    set('streakUnit', sUnit);
    set('activityStreakView', streakVal);
    set('activityStreakUnit', streakVal === 1 ? ' DAY' : ' DAYS');

    const badge = document.getElementById('todayStreakBadge');
    if (badge) {
      const isQualified = daily >= 70 && (isRest || done);
      badge.classList.toggle('qualified', isQualified);
    }

    if (typeof window.renderWeeklyRhythm === 'function') {
      window.renderWeeklyRhythm(daily);
    }

    // Render Timeline on Home
    renderHomeTimeline();
  };

  /**
   * Main Home View Render
   */
  const renderHome = () => {
    const d = window.d;
    if (!d) return;

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const styleProp = (id, prop, val) => { const e = document.getElementById(id); if (e) e.style.setProperty(prop, val); };

    // Weight Journey Metrics (Section 12)
    const hasWeight = !!(d.weight && !isNaN(Number(d.weight)));
    const startW = Number(d.startWeight) || (d.history && d.history.length ? Number(d.history[0].weight) : null) || (hasWeight ? Number(d.weight) : null);
    const curW = hasWeight ? Number(d.weight) : null;
    const goalW = d.goalWeight ? Number(d.goalWeight) : null;

    let gp = 0;
    if (curW && startW && goalW && startW !== goalW) {
      if (startW > goalW) {
        gp = Math.max(0, Math.min(100, ((startW - curW) / Math.max(0.1, startW - goalW)) * 100));
      } else {
        gp = Math.max(0, Math.min(100, ((curW - startW) / Math.max(0.1, goalW - startW)) * 100));
      }
    }

    set('weightHome', curW ? Number(curW).toFixed(1) : '--');
    set('weightHome2', curW ? Number(curW).toFixed(1) : '--');
    set('goalWeightHome', goalW ? Number(goalW).toFixed(0) : '--');
    set('goalWeightHome2', goalW ? Number(goalW).toFixed(0) : '--');

    let remText = '-- kg remaining';
    if (curW && goalW) {
      const diff = (curW - goalW);
      remText = diff > 0
        ? diff.toFixed(1) + ' kg remaining'
        : diff < 0
        ? Math.abs(diff).toFixed(1) + ' kg to gain'
        : 'Goal reached! 🎉';
    }

    set('remaining', remText);
    set('remaining2', remText);
    styleProp('ring', '--p', gp + '%');
    set('ringText', Math.round(gp) + '%');

    const weightBar = document.getElementById('weightJourneyBar') || document.getElementById('weightMiniBar');
    if (weightBar) weightBar.style.width = gp + '%';
    const weightMiniText = document.getElementById('weightMiniText');
    if (weightMiniText) weightMiniText.textContent = `${Math.round(gp)}% toward goal`;

    // Header Greeting
    const heroSub = document.querySelector('.hero .sub');
    if (heroSub) {
      heroSub.textContent = d.name ? (`WELCOME, ${d.name.toUpperCase()} · TRAIN & TRANSFORM`) : 'TRAIN · TRACK · TRANSFORM';
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

    // Power Level Information
    if (typeof window.levelInfo === 'function') {
      const li = window.levelInfo();
      set('levelBadge', 'LV ' + li.level);
      set('levelView', li.level);
      set('levelHome', li.level);
      set('rankName', li.rank);
      set('rankHome', li.rank);
      set('xpView', li.within);
      set('xpHome', li.within);
      set('xpNextView', li.next);
      set('xpNextHome', li.next);

      const xpBar = document.getElementById('xpBarHome');
      if (xpBar) xpBar.style.width = `${li.pct}%`;
    }

    updateDailyAnalytics();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.home = {
    render: renderHome,
    updateDailyAnalytics,
    renderHomeTimeline
  };

  // Global backward compatibility
  window.renderHome = renderHome;
  window.updateDailyAnalytics = updateDailyAnalytics;
  window.renderHomeTimeline = renderHomeTimeline;

})(window);
