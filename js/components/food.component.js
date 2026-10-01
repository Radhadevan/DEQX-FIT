/**
 * DEQX FIT - Food Component
 * Water tracking, quick foods, custom food recipes, draft builder, logged meals.
 */

(function (window) {
  'use strict';

  let foodDraft = JSON.parse(localStorage.getItem('deqx_food_draft') || '[]');

  const saveFoodDraft = () => {
    localStorage.setItem('deqx_food_draft', JSON.stringify(foodDraft));
  };

  const addWater = (v) => {
    const d = window.d;
    if (!d) return;
    d.water = Math.max(0, Number(((d.water || 0) + v).toFixed(2)));
    window.save(true);
    if (d.water >= d.waterTarget) {
      window.rewardOnce('water', 20, 'water goal');
    }
  };

  const smartFill = (v) => {
    const inp = document.getElementById('smartInput');
    if (inp) {
      inp.value = v;
      inp.focus();
    }
  };

  const draftItemLabel = (key, qty, servings) => {
    const d = window.d;
    const db = (window.DEQX?.data?.foods?.DB) || window.DB || {};
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    const item = quicks.find(q => q.key === key);
    const custom = d?.customFoods?.find(c => c.id === key);

    if (custom) {
      const s = Number(servings) || 1;
      return `${custom.name} <small>(${s} serving${s > 1 ? 's' : ''})</small>`;
    }
    if (item) {
      const q = Number(qty) || item.amount;
      return `${item.name} <small>(${q} ${item.unit})</small>`;
    }
    return key;
  };

  const addToFoodDraft = (key, quantity, unit, custom) => {
    const db = (window.DEQX?.data?.foods?.DB) || window.DB || {};
    let entry = null;

    if (custom) {
      const servings = Math.max(0.25, Number(quantity) || 1);
      entry = {
        key: custom.id,
        isCustom: true,
        name: custom.name,
        servings: servings,
        quantity: servings,
        unit: 'servings',
        protein: Math.round(Number(custom.protein) * servings * 10) / 10,
        calories: Math.round(Number(custom.calories) * servings)
      };
    } else {
      const def = db[key];
      if (!def) return;
      const q = Math.max(1, Number(quantity) || 1);
      let factor = q;
      if (unit === 'g' || unit === 'ml') {
        factor = q / 100;
      }
      entry = {
        key: key,
        isCustom: false,
        quantity: q,
        unit: unit || 'count',
        protein: Math.round(def.p * factor * 10) / 10,
        calories: Math.round(def.c * factor)
      };
    }

    const existingIdx = foodDraft.findIndex(x => x.key === entry.key);
    if (existingIdx >= 0) {
      if (entry.isCustom) {
        foodDraft[existingIdx].servings = Math.round((foodDraft[existingIdx].servings + entry.servings) * 100) / 100;
        foodDraft[existingIdx].protein = Math.round((foodDraft[existingIdx].protein + entry.protein) * 10) / 10;
        foodDraft[existingIdx].calories = Math.round(foodDraft[existingIdx].calories + entry.calories);
      } else {
        foodDraft[existingIdx].quantity += entry.quantity;
        foodDraft[existingIdx].protein = Math.round((foodDraft[existingIdx].protein + entry.protein) * 10) / 10;
        foodDraft[existingIdx].calories = Math.round(foodDraft[existingIdx].calories + entry.calories);
      }
    } else {
      foodDraft.push(entry);
    }
    saveFoodDraft();
    renderFoodDraft();
    renderQuickFoodGrid();
  };

  const addQuickFood = (key) => {
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    const item = quicks.find(q => q.key === key);
    if (!item) return;
    addToFoodDraft(item.key, item.amount, item.unit, null);
    window.toast(`+ Added ${item.name} to meal draft`);
  };

  const removeQuickFood = (key, all = false) => {
    const idx = foodDraft.findIndex(x => x.key === key);
    if (idx === -1) return;
    if (all) {
      foodDraft.splice(idx, 1);
    } else {
      const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
      const item = quicks.find(q => q.key === key);
      const step = item ? item.amount : 1;
      if (foodDraft[idx].quantity > step) {
        const factor = (foodDraft[idx].quantity - step) / foodDraft[idx].quantity;
        foodDraft[idx].quantity -= step;
        foodDraft[idx].protein = Math.round(foodDraft[idx].protein * factor * 10) / 10;
        foodDraft[idx].calories = Math.round(foodDraft[idx].calories * factor);
      } else {
        foodDraft.splice(idx, 1);
      }
    }
    saveFoodDraft();
    renderFoodDraft();
    renderQuickFoodGrid();
  };

  const renderFoodDraft = () => {
    const wrap = document.getElementById('foodDraftSection');
    const list = document.getElementById('foodDraftList');
    const summary = document.getElementById('foodDraftSummary');
    if (!wrap || !list) return;

    if (!foodDraft.length) {
      wrap.style.display = 'none';
      list.innerHTML = '';
      return;
    }
    wrap.style.display = 'block';

    const totP = foodDraft.reduce((a, x) => a + (Number(x.protein) || 0), 0);
    const totC = foodDraft.reduce((a, x) => a + (Number(x.calories) || 0), 0);
    if (summary) {
      summary.innerHTML = `<b>${totP.toFixed(1)}g</b> protein · <b>${totC}</b> kcal`;
    }

    list.innerHTML = foodDraft.map((item, idx) => {
      const label = draftItemLabel(item.key, item.quantity, item.servings);
      return `<div class="draftRow">
        <div class="draftInfo">
          <span class="draftName">${label}</span>
          <span class="draftMacros">${Number(item.protein).toFixed(1)}g P · ${item.calories} kcal</span>
        </div>
        <div class="draftActions">
          <button type="button" class="draftBtn dec" onclick="removeDraftItem(${idx}, false)" title="Decrease portion">−</button>
          <button type="button" class="draftBtn del" onclick="removeDraftItem(${idx}, true)" title="Remove item">✕</button>
        </div>
      </div>`;
    }).join('');
  };

  const removeDraftItem = (i, all = false) => {
    if (i < 0 || i >= foodDraft.length) return;
    const it = foodDraft[i];
    if (all) {
      foodDraft.splice(i, 1);
    } else {
      if (it.isCustom) {
        if (it.servings > 1) {
          const factor = (it.servings - 1) / it.servings;
          it.servings -= 1;
          it.protein = Math.round(it.protein * factor * 10) / 10;
          it.calories = Math.round(it.calories * factor);
        } else {
          foodDraft.splice(i, 1);
        }
      } else {
        const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
        const itemDef = quicks.find(q => q.key === it.key);
        const step = itemDef ? itemDef.amount : 1;
        if (it.quantity > step) {
          const factor = (it.quantity - step) / it.quantity;
          it.quantity -= step;
          it.protein = Math.round(it.protein * factor * 10) / 10;
          it.calories = Math.round(it.calories * factor);
        } else {
          foodDraft.splice(i, 1);
        }
      }
    }
    saveFoodDraft();
    renderFoodDraft();
    renderQuickFoodGrid();
  };

  const clearFoodDraft = () => {
    foodDraft = [];
    saveFoodDraft();
    renderFoodDraft();
    renderQuickFoodGrid();
    window.toast('Meal draft cleared');
  };

  const commitFoodDraft = () => {
    const d = window.d;
    if (!foodDraft.length || !d) return;
    d.foods = d.foods || [];

    foodDraft.forEach(it => {
      let title = it.isCustom ? it.name : it.key;
      const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
      const q = quicks.find(x => x.key === it.key);
      if (q) title = q.name;
      d.foods.push({
        n: `${title} (${it.isCustom ? it.servings + ' serv' : it.quantity + ' ' + it.unit})`,
        p: Number(it.protein) || 0,
        c: Number(it.calories) || 0
      });
    });

    const totP = foodDraft.reduce((a, x) => a + (Number(x.protein) || 0), 0);
    const count = foodDraft.length;
    foodDraft = [];
    saveFoodDraft();

    window.save(true);
    renderFoodDraft();
    renderQuickFoodGrid();
    window.savedFeedback(`Logged ${count} meal item${count > 1 ? 's' : ''} (+${totP.toFixed(1)}g P)`, 'food');
  };

  const renderQuickFoodGrid = () => {
    const container = document.getElementById('quickFoodGrid');
    if (!container) return;
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];

    container.innerHTML = quicks.map(item => {
      const draft = foodDraft.find(x => x.key === item.key);
      const count = draft ? (item.unit === 'g' || item.unit === 'ml' ? `${draft.quantity}${item.unit}` : draft.quantity) : '';
      return `<button type="button" class="quickFoodBtn ${draft ? 'inDraft' : ''}" data-food-key="${item.key}" title="Tap to add ${item.portion} to draft">
        <span class="qfIcon">${item.icon}</span>
        <div class="qfInfo">
          <b>${item.name}</b>
          <small>${item.portion}</small>
        </div>
        ${count ? `<span class="qfBadge">${count}</span>` : ''}
        ${draft ? `<span class="qfMinus" onclick="event.stopPropagation(); removeQuickFood('${item.key}')" title="Subtract one">−</span>` : ''}
      </button>`;
    }).join('');
  };

  const saveCustomFood = () => {
    const d = window.d;
    if (!d) return;
    const nameEl = document.getElementById('customFoodName');
    const protEl = document.getElementById('customFoodProtein');
    const calEl = document.getElementById('customFoodCalories');
    if (!nameEl || !protEl || !calEl) return;

    const name = nameEl.value.trim();
    const protein = parseFloat(protEl.value);
    const calories = parseFloat(calEl.value);

    if (!name || isNaN(protein) || isNaN(calories) || protein < 0 || calories < 0) {
      window.toast('Please enter a valid recipe name and positive macros.');
      return;
    }

    d.customFoods = d.customFoods || [];
    const id = 'custom_' + Date.now();
    d.customFoods.push({ id, name, protein, calories });
    window.save(true);

    nameEl.value = '';
    protEl.value = '';
    calEl.value = '';
    renderCustomFoods();
    window.toast(`Saved recipe: ${name}`);
  };

  const addCustomFood = (id) => {
    const d = window.d;
    const item = d?.customFoods?.find(x => x.id === id);
    if (!item) return;
    addToFoodDraft(id, 1, 'servings', item);
    window.toast(`+ Added ${item.name} to meal draft`);
  };

  const removeCustomFood = (id) => {
    const d = window.d;
    if (!d || !d.customFoods) return;
    d.customFoods = d.customFoods.filter(x => x.id !== id);
    foodDraft = foodDraft.filter(x => x.key !== id);
    saveFoodDraft();
    window.save(true);
    renderCustomFoods();
    renderFoodDraft();
  };

  const renderCustomFoods = () => {
    const container = document.getElementById('customFoodsList');
    if (!container) return;
    const d = window.d;
    if (!d || !d.customFoods || !d.customFoods.length) {
      container.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">No custom foods saved yet.</p>';
      return;
    }
    container.innerHTML = d.customFoods.map(x => `
      <div class="customFoodItem">
        <div>
          <b>${window.esc(x.name)}</b>
          <small>${x.protein}g P · ${x.calories} kcal</small>
        </div>
        <div class="customFoodActions">
          <button type="button" class="btnSmall" onclick="addCustomFood('${x.id}')">+ Draft</button>
          <button type="button" class="btnDelSmall" onclick="removeCustomFood('${x.id}')">✕</button>
        </div>
      </div>
    `).join('');
  };

  const smartAdd = () => {
    const d = window.d;
    if (!d) return;
    const input = document.getElementById('smartInput');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();

    const parts = text.split(',');
    let totalP = 0, totalC = 0, addedNames = [];

    parts.forEach(part => {
      const match = part.trim().match(/(\d+(?:\.\d+)?)\s*([a-zA-Z\s]+)/);
      if (match) {
        const qty = parseFloat(match[1]);
        const name = match[2].trim().toLowerCase();
        const db = (window.DEQX?.data?.foods?.DB) || window.DB || {};

        let foundKey = null;
        for (const [k, v] of Object.entries(db)) {
          if (k === name || v.a.some(alias => name.includes(alias))) {
            foundKey = k;
            break;
          }
        }

        if (foundKey) {
          const item = db[foundKey];
          let p = item.p * qty;
          let c = item.c * qty;
          if (foundKey === 'chicken' || foundKey === 'beef' || foundKey === 'oats') {
            p = (item.p / 100) * qty;
            c = (item.c / 100) * qty;
          }
          d.foods.push({ n: `${qty} ${foundKey}`, p: Math.round(p * 10) / 10, c: Math.round(c) });
          totalP += p;
          totalC += c;
          addedNames.push(`${qty} ${foundKey}`);
        } else {
          d.foods.push({ n: part.trim(), p: 0, c: 0 });
          addedNames.push(part.trim());
        }
      } else {
        d.foods.push({ n: part.trim(), p: 0, c: 0 });
        addedNames.push(part.trim());
      }
    });

    window.save(true);
    input.value = '';
    window.savedFeedback(`Logged ${addedNames.join(', ')}`, 'food');
  };

  const saveFoodEdit = (i) => {
    const d = window.d;
    if (!d || !d.foods || !d.foods[i]) return;
    const n = document.getElementById('foodName' + i)?.value.trim();
    const p = parseFloat(document.getElementById('foodProtein' + i)?.value);
    const c = parseFloat(document.getElementById('foodCalories' + i)?.value);
    if (n) d.foods[i].n = n;
    if (!isNaN(p)) d.foods[i].p = p;
    if (!isNaN(c)) d.foods[i].c = c;
    window.save(true);
    window.toast('Food entry updated');
  };

  const removeFood = (i) => {
    const d = window.d;
    if (!d || !d.foods || !d.foods[i]) return;
    d.foods.splice(i, 1);
    window.save(true);
    window.toast('Food entry removed');
  };

  // Delegated food-tap handler
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-food-key]');
    if (btn && !e.target.closest('.ctrlBtn') && !e.target.closest('.qfMinus')) {
      e.preventDefault();
      addQuickFood(btn.dataset.foodKey);
    }
  });

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.food = {
    addWater,
    smartFill,
    addToFoodDraft,
    addQuickFood,
    removeQuickFood,
    renderFoodDraft,
    removeDraftItem,
    clearFoodDraft,
    commitFoodDraft,
    renderQuickFoodGrid,
    saveCustomFood,
    addCustomFood,
    removeCustomFood,
    renderCustomFoods,
    smartAdd,
    saveFoodEdit,
    removeFood
  };

  // Global backward compatibility
  window.addWater = addWater;
  window.smartFill = smartFill;
  window.addToFoodDraft = addToFoodDraft;
  window.addQuickFood = addQuickFood;
  window.removeQuickFood = removeQuickFood;
  window.renderFoodDraft = renderFoodDraft;
  window.removeDraftItem = removeDraftItem;
  window.clearFoodDraft = clearFoodDraft;
  window.commitFoodDraft = commitFoodDraft;
  window.renderQuickFoodGrid = renderQuickFoodGrid;
  window.saveCustomFood = saveCustomFood;
  window.addCustomFood = addCustomFood;
  window.removeCustomFood = removeCustomFood;
  window.renderCustomFoods = renderCustomFoods;
  window.smartAdd = smartAdd;
  window.saveFoodEdit = saveFoodEdit;
  window.removeFood = removeFood;

})(window);
