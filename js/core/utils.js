/**
 * DEQX FIT - Core Utilities
 * Formatting, date helpers, sanitization, toasts, duration parsers.
 */

(function (window) {
  'use strict';

  const isoDate = (date) => {
    const y = date.getFullYear(),
      m = String(date.getMonth() + 1).padStart(2, '0'),
      day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = () => isoDate(new Date());

  const todayLabel = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();

  const getDaysDifference = (isoDate1, isoDate2) => {
    if (!isoDate1 || !isoDate2) return 0;
    const [y1, m1, d1] = isoDate1.split('-').map(Number);
    const [y2, m2, d2] = isoDate2.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    const diffTime = Math.abs(dt2.getTime() - dt1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const esc = (v) => {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  };

  const toast = (msg) => {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('show'), 2600);
  };

  const savedFeedback = (message, sectionId, resetFn) => {
    toast(message);
    if (sectionId) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.add('saved-flash');
        setTimeout(() => section.classList.remove('saved-flash'), 600);
      }
    }
    if (typeof resetFn === 'function') resetFn();
  };

  const parseDurationToMinutes = (input) => {
    if (input === null || input === undefined || input === '') return 0;
    const str = String(input).trim();
    if (!str) return 0;

    // 1. Explicit units (e.g. "1 hr", "45 min", "2h 30m", "1.5 hours")
    let totalMinutes = 0;
    let matchedUnit = false;
    const hourRegex = /(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/i;
    const minRegex = /(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/i;

    const hMatch = str.match(hourRegex);
    if (hMatch) {
      totalMinutes += Math.round(parseFloat(hMatch[1]) * 60);
      matchedUnit = true;
    }
    const mMatch = str.match(minRegex);
    if (mMatch) {
      totalMinutes += Math.round(parseFloat(mMatch[1]));
      matchedUnit = true;
    }
    if (matchedUnit) return totalMinutes;

    // 2. Plain numeric input without unit:
    // 1, 2, 3, 4, 5 (or any number <= 5) automatically represents HOURS
    // More than 5 automatically represents MINUTES
    const numOnly = parseFloat(str);
    if (!isNaN(numOnly) && numOnly > 0) {
      if (numOnly <= 5) {
        return Math.round(numOnly * 60); // 1..5 = hours
      } else {
        return Math.round(numOnly); // > 5 = minutes
      }
    }
    return 0;
  };

  const formatDurationLabel = (minutes) => {
    const mins = Math.max(0, Math.round(Number(minutes) || 0));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const updateBarUnit = (inputEl, unitElId) => {
    if (!inputEl) return;
    const unitEl = document.getElementById(unitElId);
    if (!unitEl) return;
    const val = inputEl.value.trim();
    if (!val) {
      unitEl.classList.remove('show');
      return;
    }

    const num = parseFloat(val);
    const isPlainNum = /^\d+(\.\d+)?$/.test(val);
    const hasHourUnit = /(h|hr|hrs|hour|hours)/i.test(val);
    const hasMinUnit = /(m|min|mins|minute|minutes)/i.test(val);

    if (hasHourUnit || (isPlainNum && !isNaN(num) && num > 0 && num <= 5)) {
      unitEl.textContent = 'hours';
      unitEl.className = 'unitBadge show hours';
    } else if (hasMinUnit || (isPlainNum && !isNaN(num) && num > 5)) {
      unitEl.textContent = 'minutes';
      unitEl.className = 'unitBadge show minutes';
    } else {
      const mins = parseDurationToMinutes(val);
      if (mins >= 60) {
        unitEl.textContent = 'hours';
        unitEl.className = 'unitBadge show hours';
      } else if (mins > 0) {
        unitEl.textContent = 'minutes';
        unitEl.className = 'unitBadge show minutes';
      } else {
        unitEl.classList.remove('show');
      }
    }
  };

  // Expose on window & namespace
  window.DEQX = window.DEQX || {};
  window.DEQX.utils = {
    isoDate,
    today,
    todayLabel,
    getDaysDifference,
    esc,
    toast,
    savedFeedback,
    parseDurationToMinutes,
    formatDurationLabel,
    updateBarUnit
  };

  // Global backwards compatibility
  window.isoDate = isoDate;
  window.today = today;
  window.todayLabel = todayLabel;
  window.getDaysDifference = getDaysDifference;
  window.esc = esc;
  window.toast = toast;
  window.savedFeedback = savedFeedback;
  window.parseDurationToMinutes = parseDurationToMinutes;
  window.formatDurationLabel = formatDurationLabel;
  window.updateBarUnit = updateBarUnit;

})(window);
