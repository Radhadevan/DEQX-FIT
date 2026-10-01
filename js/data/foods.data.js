/**
 * DEQX FIT - Foods Database & Presets
 */

(function (window) {
  'use strict';

  const DB = {
    egg: { p: 6.3, c: 78, a: ['egg', 'eggs'] },
    appam: { p: 2, c: 120, a: ['appam', 'appams'] },
    chapathi: { p: 3, c: 110, a: ['chapathi', 'chapati', 'chappathi', 'chappati'] },
    chicken: { p: 27, c: 165, a: ['chicken'] },
    beef: { p: 26, c: 250, a: ['beef'] },
    milk: { p: 8, c: 150, a: ['milk'] },
    oats: { p: 6.5, c: 190, a: ['oats', 'oat'] }
  };

  const QUICK_FOODS = [
    { key: 'egg', name: 'Egg', icon: '🥚', amount: 1, unit: 'count', portion: '1 egg' },
    { key: 'appam', name: 'Appam', icon: '🥞', amount: 1, unit: 'count', portion: '1 appam' },
    { key: 'chicken', name: 'Chicken', icon: '🍗', amount: 50, unit: 'g', portion: '50 g' },
    { key: 'chapathi', name: 'Chapathi', icon: '🫓', amount: 1, unit: 'count', portion: '1 chapathi' },
    { key: 'milk', name: 'Milk', icon: '🥛', amount: 250, unit: 'ml', portion: '250 ml' },
    { key: 'oats', name: 'Oats', icon: '🥣', amount: 50, unit: 'g', portion: '50 g' }
  ];

  window.DEQX = window.DEQX || {};
  window.DEQX.data = window.DEQX.data || {};
  window.DEQX.data.foods = { DB, QUICK_FOODS };

  // Global backward compatibility
  window.DB = DB;
  window.QUICK_FOODS = QUICK_FOODS;

})(window);
