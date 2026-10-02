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

    // 1. Check if user explicitly specified minutes unit (e.g. "45 min", "30 mins", "15m")
    const hasHourUnit = /(h|hr|hrs|hour|hours)/i.test(str);
    const hasMinUnit = /(m|min|mins|minute|minutes)/i.test(str);

    if (hasMinUnit && !hasHourUnit) {
      const mMatch = str.match(/(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/i);
      return mMatch ? Math.round(parseFloat(mMatch[1])) : 0;
    }

    // 2. Explicit hours or combined (e.g. "1 hr", "2h 30m", "1.5 hours")
    if (hasHourUnit) {
      let totalMinutes = 0;
      const hMatch = str.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/i);
      if (hMatch) totalMinutes += Math.round(parseFloat(hMatch[1]) * 60);
      const mMatch = str.match(/(\d+(\.\d+)?)\s*(m|min|mins|minute|minutes)/i);
      if (mMatch) totalMinutes += Math.round(parseFloat(mMatch[1]));
      return totalMinutes;
    }

    // 3. Plain numeric input (1, 2, 3, 4, 5, 6, and >6):
    // All interpreted as hours (e.g. 1 -> 60 min, 3 -> 180 min, 6 -> 360 min, 7 -> 420 min)
    const numOnly = parseFloat(str);
    if (!isNaN(numOnly) && numOnly > 0) {
      return Math.round(numOnly * 60);
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
    const hasMinUnit = /(m|min|mins|minute|minutes)/i.test(val);
    const hasHourUnit = /(h|hr|hrs|hour|hours)/i.test(val);

    if (hasMinUnit && !hasHourUnit) {
      const mins = parseDurationToMinutes(val);
      unitEl.textContent = `${mins} MIN`;
      unitEl.className = 'unitBadge show minutes';
    } else if (hasHourUnit || (isPlainNum && !isNaN(num) && num > 0)) {
      const hours = hasHourUnit ? (parseDurationToMinutes(val) / 60) : num;
      const formattedHours = Number(hours.toFixed(2)).toString();
      unitEl.textContent = `${formattedHours} ${formattedHours === '1' ? 'HOUR' : 'HOURS'}`;
      unitEl.className = 'unitBadge show hours';
    } else {
      const mins = parseDurationToMinutes(val);
      if (mins > 0) {
        const hours = Number((mins / 60).toFixed(2)).toString();
        unitEl.textContent = `${hours} ${hours === '1' ? 'HOUR' : 'HOURS'}`;
        unitEl.className = 'unitBadge show hours';
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
