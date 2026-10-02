/**
 * DEQX FIT - Budget Component
 * Daily budget tracking, expense logging, food cost integration,
 * weekly summary, and interactive spending ring.
 */

(function (window) {
  'use strict';

  let previousSpendValue = undefined;

  /**
   * Calculate effective today's spending:
   * Manual spending + optional food costs recorded
   */
  const getTodayTotalSpent = () => {
    const d = window.d;
    if (!d) return 0;
    const manualSpent = Number(d.spent) || 0;
    const foodCosts = (d.foods || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    return manualSpent + foodCosts;
  };

  /**
   * Update the spending ring and budget summary displays
   */
  const updateSpendRing = () => {
    const d = window.d;
    const totalSpent = getTodayTotalSpent();
    const budgetTarget = Number((d && d.budgetTarget) || 250);
    const maxLimit = Math.max(budgetTarget * 1.25, 300);

    const ratio = Math.max(0, Math.min(1, totalSpent / maxLimit));
    const pct = Math.round((totalSpent / Math.max(1, budgetTarget)) * 100);

    const ringEl = document.getElementById('dailySpendRing');
    const textEl = document.getElementById('spendRingText');
    const subEl = document.getElementById('spendRingSub');
    if (textEl) textEl.textContent = '₹' + totalSpent;
    if (ringEl) {
      ringEl.style.setProperty('--spend-p', Math.min(100, pct) + '%');
      ringEl.classList.remove('state-safe', 'state-warning', 'state-danger');

      let currentColor = 'var(--lime)';
      let currentSub = 'SPENT';

      if (totalSpent <= budgetTarget) {
        ringEl.classList.add('state-safe');
        currentColor = 'var(--lime)';
        currentSub = 'SPENT';
      } else if (totalSpent < maxLimit) {
        ringEl.classList.add('state-warning');
        currentColor = '#ff9f24';
        currentSub = 'WARNING';
      } else {
        ringEl.classList.add('state-danger');
        currentColor = '#ff4d4d';
        currentSub = 'OVER LIMIT';
      }

      ringEl.style.setProperty('--spend-color', currentColor);
      if (subEl) {
        subEl.textContent = currentSub;
        subEl.style.color = currentColor;
      }
    }

    // Update Budget Page Metrics (Section 14)
    const targetView = document.getElementById('budgetTargetView');
    if (targetView) targetView.textContent = budgetTarget;

    const summaryEl = document.getElementById('budgetDetailedSummary');
    if (summaryEl) {
      const remaining = budgetTarget - totalSpent;
      const remText = remaining >= 0
        ? `<b style="color:var(--lime,#b8f53a)">₹${remaining}</b> remaining`
        : `<b style="color:#ff6b6b">₹${Math.abs(remaining)}</b> over budget`;

      summaryEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:#7a8a72;font-weight:600">TODAY'S SPENDING</div>
            <div style="font-size:22px;font-weight:800;color:#ffffff">₹${totalSpent} <span style="font-size:14px;color:#7a8a72;font-weight:500">/ ₹${budgetTarget}</span></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#7a8a72;font-weight:600">${pct}% SPENT</div>
            <div style="font-size:13px;font-weight:700">${remText}</div>
          </div>
        </div>
      `;
    }

    // Weekly Summary Breakdown (Section 14)
    renderWeeklyBudgetSummary();

    previousSpendValue = totalSpent;
  };

  /**
   * Render weekly summary of spending (Mon, Tue, Wed...) and daily average
   */
  const renderWeeklyBudgetSummary = () => {
    const container = document.getElementById('budgetWeeklySummary');
    if (!container) return;

    const d = window.d;
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysData = [];

    let totalWeekSpent = 0;
    let daysCounted = 0;

    for (let i = 0; i < 7; i++) {
      const offset = i - currentDayOfWeek;
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const iso = window.isoDate(targetDate);
      const isPastOrToday = (i <= currentDayOfWeek);

      let spent = 0;
      if (iso === window.today()) {
        spent = getTodayTotalSpent();
      } else if (d?.dailyRecords && d.dailyRecords[iso]) {
        spent = Number(d.dailyRecords[iso].spent) || 0;
      }

      if (isPastOrToday) {
        totalWeekSpent += spent;
        daysCounted++;
      }

      daysData.push({ day: dayNames[i], spent, isToday: i === currentDayOfWeek });
    }

    const avg = daysCounted > 0 ? Math.round(totalWeekSpent / daysCounted) : 0;

    container.innerHTML = `
      <div style="margin-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;font-weight:700;color:#7a8a72;letter-spacing:0.06em">WEEKLY SUMMARY</span>
          <span style="font-size:12px;color:var(--lime,#b8f53a);font-weight:700">Avg ₹${avg} / day</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:6px;text-align:center">
          ${daysData.map(item => `
            <div style="padding:8px 4px;background:${item.isToday ? 'rgba(184,245,58,0.12)' : 'rgba(255,255,255,0.03)'};border:1px solid ${item.isToday ? 'var(--lime,#b8f53a)' : 'rgba(255,255,255,0.06)'};border-radius:8px">
              <span style="display:block;font-size:10.5px;color:#7a8a72;font-weight:600">${item.day}</span>
              <b style="display:block;font-size:12px;color:#fff;margin-top:2px">₹${item.spent}</b>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  /**
   * Save manual spending
   */
  const saveSpent = () => {
    const d = window.d;
    if (!d) return;
    const inp = document.getElementById('spent');
    const v = parseFloat(inp?.value);
    const amount = isNaN(v) ? 0 : Math.max(0, v);
    d.spent = amount;

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('budget', `Logged Expense`, `₹${amount} today`, '₹', amount);
    }

    window.save(true);
    updateSpendRing();
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Spending saved: ₹${d.spent}`, 'budget');
    }
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.budget = {
    getTodayTotalSpent,
    updateSpendRing,
    renderWeeklyBudgetSummary,
    saveSpent
  };

  // Global backward compatibility
  window.getTodayTotalSpent = getTodayTotalSpent;
  window.updateSpendRing = updateSpendRing;
  window.saveSpent = saveSpent;

})(window);
