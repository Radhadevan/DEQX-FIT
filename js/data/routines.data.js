/**
 * DEQX FIT - Workout Routines & Split Cycles Database
 */

(function (window) {
  'use strict';

  const WORKOUT_SPLITS = [
    'Chest + Triceps',
    'Back + Biceps',
    'Shoulders + Forearms',
    'Leg Day'
  ];

  window.DEQX = window.DEQX || {};
  window.DEQX.data = window.DEQX.data || {};
  window.DEQX.data.routines = { WORKOUT_SPLITS };

  // Global backward compatibility
  window.WORKOUT_SPLITS = WORKOUT_SPLITS;

})(window);
