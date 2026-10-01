/**
 * DEQX FIT - Budget Component
 * Daily budget tracking, expense logging, and interactive spending ring.
 */

(function (window) {
  'use strict';

  let previousSpendValue = undefined;

  const updateSpendRing = () => {
    const d = window.d;
    const spent = Number((d && d.spent) || 0);
    const maxLimit = 300;
    const targetLimit = 250;
    const ratio = Math.max(0, Math.min(1, spent / maxLimit));
    const pct = Math.round(ratio * 100);

    const ringEl = document.getElementById('dailySpendRing');
    const textEl = document.getElementById('spendRingText');
    const subEl = document.getElementById('spendRingSub');
    if (!ringEl || !textEl) return;

    textEl.textContent = '₹' + spent;
    ringEl.style.setProperty('--spend-p', pct + '%');

    ringEl.classList.remove('state-safe', 'state-warning', 'state-danger');

    let currentColor = 'var(--lime)';
    let currentSub = 'SPENT';
    let currentState = 'safe';

    if (spent <= targetLimit) {
      ringEl.classList.add('state-safe');
      currentColor = 'var(--lime)';
      currentSub = 'SPENT';
      currentState = 'safe';
    } else if (spent < maxLimit) {
      ringEl.classList.add('state-warning');
      currentColor = '#ff9f24';
      currentSub = 'WARNING';
      currentState = 'warning';
    } else {
      ringEl.classList.add('state-danger');
      currentColor = '#ff4d4d';
      currentSub = 'OVER LIMIT';
      currentState = 'danger';
    }

    ringEl.style.setProperty('--spend-color', currentColor);
    if (subEl) {
      subEl.textContent = currentSub;
      subEl.style.color = currentColor;
    }

    if (previousSpendValue !== undefined && spent !== previousSpendValue) {
      if (previousSpendValue <= targetLimit && spent > targetLimit && spent < maxLimit) {
        ringEl.classList.remove('ring-crossed-warning');
        void ringEl.offsetWidth;
        ringEl.classList.add('ring-crossed-warning');
        window.toast('⚠️ Budget Warning: Spending crossed ₹250 threshold!');
      } else if (previousSpendValue < maxLimit && spent >= maxLimit) {
        ringEl.classList.remove('ring-crossed-danger');
        void ringEl.offsetWidth;
        ringEl.classList.add('ring-crossed-danger');
        window.toast('🚨 Budget Danger: Maximum ₹300 limit exceeded!');
      }
    }

    previousSpendValue = spent;
  };

  const saveSpent = () => {
    const d = window.d;
    if (!d) return;
    const inp = document.getElementById('spent');
    const v = parseFloat(inp?.value);
    d.spent = isNaN(v) ? 0 : Math.max(0, v);
    window.save(true);
    updateSpendRing();
    window.savedFeedback(`Spending saved: ₹${d.spent}`, 'budget');
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.budget = {
    updateSpendRing,
    saveSpent
  };

  // Global backward compatibility
  window.updateSpendRing = updateSpendRing;
  window.saveSpent = saveSpent;

})(window);
