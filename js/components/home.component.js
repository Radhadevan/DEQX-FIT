/**
 * DEQX FIT - Home Component
 * Daily completion ring, spending ring, overview cards, streak indicators.
 */

(function (window) {
  'use strict';

  const updateDailyAnalytics = () => {
    const d = window.d;
    if (!d) return;
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
    const daily = Math.round((pp + wp + cp + bp + gp) / 5);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    set('todayDate', window.todayLabel());
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

    const pb = document.getElementById('proteinBar');
    if (pb) pb.style.width = pp + '%';
    const wb = document.getElementById('waterBar');
    if (wb) wb.style.width = wp + '%';
    const cb = document.getElementById('calorieBar');
    if (cb) cb.style.width = cp + '%';
    const bb = document.getElementById('calorieBurnBarHome');
    if (bb) bb.style.width = bp + '%';

    const streakVal = window.computeAndUpdateStreak(daily);
    set('todayStreakCount', streakVal);
    set('streakHome', streakVal);
    const sUnit = streakVal === 1 ? 'day' : 'days';
    set('streakHomeUnit', sUnit);

    window.renderWeeklyRhythm(daily);
  };

  const renderHome = () => {
    const d = window.d;
    if (!d) return;

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const styleProp = (id, prop, val) => { const e = document.getElementById(id); if (e) e.style.setProperty(prop, val); };

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

    // Level Information
    const li = window.levelInfo();
    set('levelBadge', 'LV ' + li.level);
    set('levelView', li.level);
    set('rankName', li.rank);
    set('xpView', li.within);
    set('xpNextView', li.next);

    updateDailyAnalytics();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.home = {
    render: renderHome,
    updateDailyAnalytics
  };

  // Global backward compatibility
  window.renderHome = renderHome;
  window.updateDailyAnalytics = updateDailyAnalytics;

})(window);
