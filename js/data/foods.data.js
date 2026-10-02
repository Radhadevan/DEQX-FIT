/**
 * DEQX FIT - Foods Database & Presets
 */

(function (window) {
  'use strict';

  const DB = {
    egg: { p: 6.3, c: 78, a: ['egg', 'eggs'], baseUnit: 'count', baseQty: 1 },
    appam: { p: 2.0, c: 120, a: ['appam', 'appams'], baseUnit: 'count', baseQty: 1 },
    chapathi: { p: 3.0, c: 110, a: ['chapathi', 'chapati', 'chappathi', 'chappati'], baseUnit: 'count', baseQty: 1 },
    chicken: { p: 13.5, c: 82.5, a: ['chicken'], baseUnit: 'g', baseQty: 50 }, // 50g = 13.5g P, 82.5 kcal; 100g = 27g P, 165 kcal
    milk: { p: 8.0, c: 150, a: ['milk'], baseUnit: 'ml', baseQty: 250 },
    oats: { p: 6.5, c: 190, a: ['oats', 'oat'], baseUnit: 'g', baseQty: 50 } // 50g = 6.5g P, 190 kcal; 100g = 13g P, 380 kcal
  };

  const QUICK_FOODS = [
    { key: 'egg', name: 'Egg', icon: '🥚', amount: 1, unit: 'count', portion: '1 egg', pStep: 6.3, cStep: 78, labelPattern: q => `Egg × ${q}` },
    { key: 'appam', name: 'Appam', icon: '🥞', amount: 1, unit: 'count', portion: '1 appam', pStep: 2.0, cStep: 120, labelPattern: q => `Appam × ${q}` },
    { key: 'chicken', name: 'Chicken', icon: '🍗', amount: 50, unit: 'g', portion: '50 g', pStep: 13.5, cStep: 82.5, labelPattern: q => `Chicken × ${q}g` },
    { key: 'chapathi', name: 'Chapathi', icon: '🫓', amount: 1, unit: 'count', portion: '1 chapathi', pStep: 3.0, cStep: 110, labelPattern: q => `Chapathi × ${q}` },
    { key: 'milk', name: 'Milk', icon: '🥛', amount: 250, unit: 'ml', portion: '250 ml', pStep: 8.0, cStep: 150, labelPattern: q => `Milk × ${q}ml` },
    { key: 'oats', name: 'Oats', icon: '🥣', amount: 50, unit: 'g', portion: '50 g', pStep: 6.5, cStep: 190, labelPattern: q => `Oats × ${q}g` }
  ];

  window.DEQX = window.DEQX || {};
  window.DEQX.data = window.DEQX.data || {};
  window.DEQX.data.foods = { DB, QUICK_FOODS };

  // Global backward compatibility
  window.DB = DB;
  window.QUICK_FOODS = QUICK_FOODS;

})(window);
