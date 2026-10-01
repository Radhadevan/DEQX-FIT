/**
 * DEQX FIT - Activities Database & Presets
 */

(function (window) {
  'use strict';

  const ACTIVITIES = [
    { id: 'Badminton', label: 'BADMINTON', sub: 'Cardio', icon: '🏸' },
    { id: 'Cricket', label: 'CRICKET', sub: 'Sport', icon: '🏏' }
  ];

  window.DEQX = window.DEQX || {};
  window.DEQX.data = window.DEQX.data || {};
  window.DEQX.data.activities = { ACTIVITIES };

  // Global backward compatibility
  window.ACTIVITIES = ACTIVITIES;

})(window);
