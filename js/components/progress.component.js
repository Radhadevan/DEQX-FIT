/**
 * DEQX FIT - Progress Component
 * Multi-day trend analytics (7/30/90 days), functional weight journey,
 * macro habit charts, workout consistency, and spending trends.
 */

(function (window) {
  'use strict';

  let activeRangeDays = 7;

  const setProgressRange = (days) => {
    activeRangeDays = Number(days) || 7;
    renderProgress();
  };

  /**
   * Log Weight from Progress page and synchronize everywhere
   */
  const logProgressWeight = () => {
    const current = window.d?.weight || 97;
    const input = prompt(`Enter current body weight (kg):`, current);
    if (!input) return;
    const val = parseFloat(input);
    if (isNaN(val) || val <= 20 || val >= 300) {
      if (typeof window.toast === 'function') window.toast('Please enter a valid weight between 20kg and 300kg');
      return;
    }

    const d = window.d;
    if (!d) return;
    d.weight = val;
    d.history = d.history || [];
    const t = window.today ? window.today() : new Date().toISOString().slice(0, 10);
    const ex = d.history.find(x => x.date === t);
    if (ex) {
      ex.weight = val;
    } else {
      d.history.push({ date: t, weight: val });
      d.history = d.history.slice(-90);
    }

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('weight', `Weight Logged`, `${val} kg`, '⚖️', 0);
    }

    window.save(true);
    renderProgress();
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Weight logged: ${val} kg ✓`, 'progress');
    }
  };

  /**
   * Helper to build SVG bar chart
   */
  const renderBarChart = (data, targetVal, unit, color = 'var(--lime, #b8f53a)') => {
    if (!data.length) return '<p class="muted" style="font-size:12px;text-align:center">No data available</p>';

    const width = 320;
    const height = 110;
    const padX = 14;
    const padY = 16;
    const maxVal = Math.max(...data.map(d => d.value), targetVal || 1, 10);
    const colWidth = (width - padX * 2) / data.length;
    const barWidth = Math.max(4, Math.min(18, colWidth * 0.55));

    // Target reference line
    const targetY = targetVal ? height - padY - (targetVal / maxVal) * (height - padY * 2) : null;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;overflow:visible">`;

    if (targetY !== null && targetY > 5 && targetY < height - 5) {
      svg += `
        <line x1="${padX}" y1="${targetY}" x2="${width - padX}" y2="${targetY}" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3,3" stroke-width="1"/>
        <text x="${width - padX + 2}" y="${targetY + 3}" fill="#7a8a72" font-size="8.5" font-weight="600" text-anchor="start">${targetVal}${unit}</text>
      `;
    }

    data.forEach((d, i) => {
      const cx = padX + i * colWidth + colWidth / 2;
      const barHeight = Math.max(3, (d.value / maxVal) * (height - padY * 2));
      const y = height - padY - barHeight;

      svg += `
        <rect x="${cx - barWidth / 2}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${d.isToday ? 'var(--lime, #b8f53a)' : color}" opacity="${d.value > 0 ? (d.isToday ? 1 : 0.82) : 0.25}">
          <title>${d.label}: ${d.value} ${unit}</title>
        </rect>
        <text x="${cx}" y="${height - 3}" fill="#6b7965" font-size="8" font-weight="600" text-anchor="middle">${d.label.slice(0, 3)}</text>
      `;
    });

    svg += '</svg>';
    return svg;
  };

  /**
   * Helper to build SVG line/area chart for weight trend
   */
  const renderWeightLineChart = (data, goalVal) => {
    if (data.length < 2) {
      return '<p class="muted" style="font-size:12px;text-align:center;padding:12px 0">Log at least 2 weight entries to view trend line.</p>';
    }

    const width = 320;
    const height = 120;
    const padX = 20;
    const padY = 20;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values, goalVal || values[0]) - 1;
    const maxVal = Math.max(...values, goalVal || values[0]) + 1;
    const range = Math.max(0.1, maxVal - minVal);

    const getX = (i) => padX + (i / (data.length - 1)) * (width - padX * 2);
    const getY = (v) => height - padY - ((v - minVal) / range) * (height - padY * 2);

    let pathD = `M ${getX(0)} ${getY(data[0].value)}`;
    let areaD = `M ${getX(0)} ${height - padY} L ${getX(0)} ${getY(data[0].value)}`;

    for (let i = 1; i < data.length; i++) {
      pathD += ` L ${getX(i)} ${getY(data[i].value)}`;
      areaD += ` L ${getX(i)} ${getY(data[i].value)}`;
    }
    areaD += ` L ${getX(data.length - 1)} ${height - padY} Z`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;overflow:visible">`;

    // Goal reference line
    if (goalVal && goalVal >= minVal && goalVal <= maxVal) {
      const gY = getY(goalVal);
      svg += `
        <line x1="${padX}" y1="${gY}" x2="${width - padX}" y2="${gY}" stroke="rgba(184,245,58,0.3)" stroke-dasharray="3,3" stroke-width="1"/>
        <text x="${width - padX + 2}" y="${gY + 3}" fill="var(--lime,#b8f53a)" font-size="8.5" font-weight="700">Goal ${goalVal}kg</text>
      `;
    }

    // Gradient fill
    svg += `
      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--lime, #b8f53a)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--lime, #b8f53a)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#weightGrad)"/>
      <path d="${pathD}" fill="none" stroke="var(--lime, #b8f53a)" stroke-width="2.2" stroke-linecap="round"/>
    `;

    // Dots for points
    data.forEach((d, i) => {
      const cx = getX(i);
      const cy = getY(d.value);
      svg += `
        <circle cx="${cx}" cy="${cy}" r="3.5" fill="#111710" stroke="var(--lime, #b8f53a)" stroke-width="1.8">
          <title>${d.date}: ${d.value} kg</title>
        </circle>
        ${i === 0 || i === data.length - 1 ? `<text x="${cx}" y="${height - 4}" fill="#7a8a72" font-size="8" font-weight="600" text-anchor="middle">${d.date.slice(5)}</text>` : ''}
      `;
    });

    svg += '</svg>';
    return svg;
  };

  /**
   * Main Progress View Renderer
   */
  const renderProgress = () => {
    const container = document.getElementById('progressContainer');
    if (!container) return;

    const d = window.d;
    if (!d) return;

    const days = activeRangeDays;
    const now = new Date();
    const todayIso = window.today ? window.today() : now.toISOString().slice(0, 10);

    // 1. Gather historical sequence of days
    const sequence = [];
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const iso = window.isoDate ? window.isoDate(dt) : dt.toISOString().slice(0, 10);
      const rec = (d.dailyRecords && d.dailyRecords[iso]) || {};
      const isToday = (iso === todayIso);

      const p = isToday ? (d.foods || []).reduce((a, x) => a + (Number(x.p) || 0), 0) : (rec.protein || 0);
      const c = isToday ? (d.foods || []).reduce((a, x) => a + (Number(x.c) || 0), 0) : (rec.calories || 0);
      const w = isToday ? (Number(d.water) || 0) : (rec.water || 0);
      const burn = isToday ? ((window.v9 && Number(window.v9.burned)) || 0) : (rec.burned || 0);
      const spent = isToday ? (Number(d.spent) || 0) : (rec.spent || 0);
      const workoutDone = !!(d.workoutHistory && d.workoutHistory[iso]?.completed);

      sequence.push({
        date: iso,
        label: dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        protein: Math.round(p * 10) / 10,
        calories: Math.round(c),
        water: Number(w.toFixed(2)),
        burned: Math.round(burn),
        spent: Math.round(spent),
        workoutDone,
        isToday
      });
    }

    // 2. Weight Journey Data (Section 12)
    const history = (d.history || []).slice(-days);
    const weightData = history.map(h => ({
      date: h.date,
      value: Number(h.weight)
    }));

    const startW = Number(d.startWeight) || (history.length ? Number(history[0].weight) : null) || Number(d.weight) || 97;
    const curW = Number(d.weight) || startW;
    const goalW = Number(d.goalWeight) || 75;
    const totalLost = (startW - curW).toFixed(1);
    const remaining = (curW - goalW).toFixed(1);

    // Weekly average weight
    const last7Weights = (d.history || []).slice(-7).map(x => Number(x.weight)).filter(x => !isNaN(x) && x > 0);
    const weeklyAvgWeight = last7Weights.length
      ? (last7Weights.reduce((a, b) => a + b, 0) / last7Weights.length).toFixed(1)
      : curW.toFixed(1);

    // Render HTML Structure
    container.innerHTML = `
      <!-- TIME FILTER BUTTONS (Section 11) -->
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px">
        <button type="button" class="btnSmall ${days === 7 ? 'active' : ''}" onclick="window.setProgressRange(7)" style="padding:6px 14px;font-size:11px;font-weight:700;border-radius:20px;background:${days === 7 ? 'var(--lime,#b8f53a)' : 'rgba(255,255,255,0.06)'};color:${days === 7 ? '#10170e' : '#fff'};border:none;cursor:pointer">7 DAYS</button>
        <button type="button" class="btnSmall ${days === 30 ? 'active' : ''}" onclick="window.setProgressRange(30)" style="padding:6px 14px;font-size:11px;font-weight:700;border-radius:20px;background:${days === 30 ? 'var(--lime,#b8f53a)' : 'rgba(255,255,255,0.06)'};color:${days === 30 ? '#10170e' : '#fff'};border:none;cursor:pointer">30 DAYS</button>
        <button type="button" class="btnSmall ${days === 90 ? 'active' : ''}" onclick="window.setProgressRange(90)" style="padding:6px 14px;font-size:11px;font-weight:700;border-radius:20px;background:${days === 90 ? 'var(--lime,#b8f53a)' : 'rgba(255,255,255,0.06)'};color:${days === 90 ? '#10170e' : '#fff'};border:none;cursor:pointer">90 DAYS</button>
      </div>

      <!-- WEIGHT JOURNEY CARD (Section 12) -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">WEIGHT JOURNEY</span>
            <h2 style="font-size:18px;margin:2px 0 0;color:#fff">${curW} kg <small style="font-size:12px;color:#7a8a72;font-weight:500">current</small></h2>
          </div>
          <button type="button" onclick="window.logProgressWeight()" style="padding:6px 12px;background:#232d1e;color:var(--lime,#b8f53a);border:1px solid var(--lime,#b8f53a);border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer">+ Log weight</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-bottom:14px;text-align:center">
          <div style="background:rgba(255,255,255,0.03);padding:8px 4px;border-radius:8px">
            <span style="font-size:10px;color:#7a8a72">Start</span>
            <b style="display:block;font-size:12.5px;color:#fff">${startW} kg</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px 4px;border-radius:8px">
            <span style="font-size:10px;color:#7a8a72">Goal</span>
            <b style="display:block;font-size:12.5px;color:#fff">${goalW} kg</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px 4px;border-radius:8px">
            <span style="font-size:10px;color:#7a8a72">Lost</span>
            <b style="display:block;font-size:12.5px;color:var(--lime,#b8f53a)">${Number(totalLost) > 0 ? '-' + totalLost : totalLost} kg</b>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px 4px;border-radius:8px">
            <span style="font-size:10px;color:#7a8a72">7d Avg</span>
            <b style="display:block;font-size:12.5px;color:#fff">${weeklyAvgWeight} kg</b>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.25);border-radius:12px;padding:12px 8px">
          ${renderWeightLineChart(weightData, goalW)}
        </div>
      </div>

      <!-- PROTEIN TREND (Section 11) -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">NUTRITION TREND</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Daily Protein</h2>
          </div>
          <span style="font-size:11.5px;color:#8fa287;font-weight:600">Target: ${d.proteinTarget || 150}g</span>
        </div>
        ${renderBarChart(sequence.map(s => ({ label: s.label, value: s.protein, isToday: s.isToday })), d.proteinTarget || 150, 'g')}
      </div>

      <!-- CALORIES CONSUMED TREND -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">ENERGY INTAKE</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Daily Calories</h2>
          </div>
          <span style="font-size:11.5px;color:#8fa287;font-weight:600">Target: ${d.calorieTarget || 2200} kcal</span>
        </div>
        ${renderBarChart(sequence.map(s => ({ label: s.label, value: s.calories, isToday: s.isToday })), d.calorieTarget || 2200, ' kcal')}
      </div>

      <!-- HYDRATION TREND -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">HYDRATION</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Water Intake</h2>
          </div>
          <span style="font-size:11.5px;color:#8fa287;font-weight:600">Target: ${d.waterTarget || 3}L</span>
        </div>
        ${renderBarChart(sequence.map(s => ({ label: s.label, value: s.water, isToday: s.isToday })), d.waterTarget || 3, 'L')}
      </div>

      <!-- CALORIES BURNED TREND -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">ACTIVITY BURN</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Calories Burned</h2>
          </div>
          <span style="font-size:11.5px;color:#8fa287;font-weight:600">Target: 500 kcal</span>
        </div>
        ${renderBarChart(sequence.map(s => ({ label: s.label, value: s.burned, isToday: s.isToday })), 500, ' kcal')}
      </div>

      <!-- WORKOUT CONSISTENCY -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">DISCIPLINE</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Workout Consistency</h2>
          </div>
          <span style="font-size:11.5px;color:var(--lime,#b8f53a);font-weight:700">${sequence.filter(s => s.workoutDone).length} / ${sequence.length} days</span>
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding:6px 0">
          ${sequence.map(s => `
            <div style="flex:1;min-width:32px;text-align:center;padding:8px 4px;background:${s.workoutDone ? 'rgba(184,245,58,0.14)' : 'rgba(255,255,255,0.03)'};border:1px solid ${s.workoutDone ? 'var(--lime,#b8f53a)' : 'rgba(255,255,255,0.06)'};border-radius:8px">
              <span style="display:block;font-size:9.5px;color:#7a8a72">${s.label.slice(0, 3)}</span>
              <span style="display:block;font-size:14px;margin-top:2px">${s.workoutDone ? '✓' : '•'}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- SPENDING TREND (Section 11) -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font-size:10px;font-weight:800;color:var(--lime,#b8f53a);letter-spacing:0.08em">BUDGET MANAGEMENT</span>
            <h2 style="font-size:16px;margin:2px 0 0;color:#fff">Daily Spending</h2>
          </div>
          <span style="font-size:11.5px;color:#8fa287;font-weight:600">Budget: ₹${d.budgetTarget || 250}</span>
        </div>
        ${renderBarChart(sequence.map(s => ({ label: s.label, value: s.spent, isToday: s.isToday })), d.budgetTarget || 250, '₹')}
      </div>
    `;
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.progress = {
    setProgressRange,
    logProgressWeight,
    renderProgress
  };

  // Global backward compatibility
  window.setProgressRange = setProgressRange;
  window.logProgressWeight = logProgressWeight;
  window.renderProgress = renderProgress;

})(window);
