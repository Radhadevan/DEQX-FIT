/**
 * DEQX FIT - Food Component
 * Water tracking, quick foods, custom food recipes, draft builder, logged meals, and chronological timeline.
 */

(function (window) {
  'use strict';

  /**
   * Add water intake and synchronize across all pages
   */
  const addWater = (v) => {
    const d = window.d;
    if (!d) return;
    const amount = Number(v) || 0;
    d.water = Math.max(0, Number(((d.water || 0) + amount).toFixed(2)));

    // Add to today's timeline
    if (typeof window.addTimelineEvent === 'function') {
      const ml = amount >= 1 ? `${amount}L` : `${Math.round(amount * 1000)}ml`;
      window.addTimelineEvent('water', `Hydration +${ml}`, `Total today: ${d.water}L`, '💧', 0);
    }

    window.save(true);
    if (d.water >= d.waterTarget && typeof window.rewardOnce === 'function') {
      window.rewardOnce('water', 20, 'Hit daily water goal');
    }
    if (typeof window.toast === 'function') {
      window.toast(`+ Added ${v >= 1 ? v + 'L' : Math.round(v * 1000) + 'ml'} water`);
    }
  };

  const smartFill = (v) => {
    const inp = document.getElementById('smartFood') || document.getElementById('smartInput');
    if (inp) {
      inp.value = v;
      inp.focus();
    }
  };

  /**
   * Helper to format food display label
   */
  const formatFoodLabel = (name, quantity, unit) => {
    if (unit === 'g') return `${name} × ${quantity}g`;
    if (unit === 'ml') return `${name} × ${quantity}ml`;
    if (quantity > 1) return `${name} × ${quantity}`;
    return `${name} × 1`;
  };

  /**
   * Direct 1-tap food logging / quantity increment
   * Tap 1 = 1 portion (+macros)
   * Tap 2 = 2 portions
   * Tap 3 = 3 portions
   */
  const addQuickFood = (key) => {
    const d = window.d;
    if (!d) return;
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    const item = quicks.find(q => q.key === key);
    if (!item) return;

    d.foods = d.foods || [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Look for existing food entry for today with this key
    const existingIdx = d.foods.findIndex(x => x.key === key);

    if (existingIdx >= 0) {
      // Increment portion
      const existing = d.foods[existingIdx];
      const step = item.amount;
      existing.quantity = (Number(existing.quantity) || step) + step;

      let factor = 1;
      if (item.unit === 'g' || item.unit === 'ml') {
        factor = existing.quantity / step;
      } else {
        factor = existing.quantity;
      }

      existing.p = Math.round(item.pStep * factor * 10) / 10;
      existing.c = Math.round(item.cStep * factor);
      existing.n = formatFoodLabel(item.name, existing.quantity, item.unit);
      existing.time = timeStr;
      existing.timestamp = now.getTime();

      if (typeof window.addTimelineEvent === 'function') {
        window.addTimelineEvent('food', `${item.name} (${item.unit === 'g' ? existing.quantity + 'g' : existing.quantity})`, `+${existing.p}g P · ${existing.c} kcal`, item.icon, 0);
      }
    } else {
      // Add first portion
      const newEntry = {
        id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        key: item.key,
        name: item.name,
        quantity: item.amount,
        unit: item.unit,
        p: Math.round(item.pStep * 10) / 10,
        c: Math.round(item.cStep),
        n: formatFoodLabel(item.name, item.amount, item.unit),
        time: timeStr,
        timestamp: now.getTime(),
        cost: 0
      };
      d.foods.push(newEntry);

      if (typeof window.addTimelineEvent === 'function') {
        window.addTimelineEvent('food', `${item.name} (${item.unit === 'g' ? item.amount + 'g' : item.amount})`, `+${newEntry.p}g P · ${newEntry.c} kcal`, item.icon, 0);
      }
    }

    // Save central state, update UI immediately across all pages, queue cloud sync
    window.save(true);
    if (typeof window.toast === 'function') {
      const cur = d.foods.find(x => x.key === key);
      window.toast(`Logged ${cur?.n || item.name} (+${cur?.p}g P)`);
    }
  };

  /**
   * Decrease portion of a quick food or remove if at minimum
   */
  const stepDownFood = (key) => {
    const d = window.d;
    if (!d || !d.foods) return;
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    const item = quicks.find(q => q.key === key);
    const existingIdx = d.foods.findIndex(x => x.key === key);
    if (existingIdx === -1) return;

    const existing = d.foods[existingIdx];
    const step = item ? item.amount : 1;

    if (existing.quantity > step) {
      existing.quantity -= step;
      const factor = (item && (item.unit === 'g' || item.unit === 'ml'))
        ? (existing.quantity / step)
        : existing.quantity;
      existing.p = Math.round((item ? item.pStep : (existing.p / (existing.quantity + step))) * factor * 10) / 10;
      existing.c = Math.round((item ? item.cStep : (existing.c / (existing.quantity + step))) * factor);
      existing.n = formatFoodLabel(item ? item.name : existing.name, existing.quantity, item ? item.unit : existing.unit);
    } else {
      d.foods.splice(existingIdx, 1);
    }

    window.save(true);
  };

  /**
   * Render Quick Food Grid buttons with active count badges and minus controls
   */
  const renderQuickFoodGrid = () => {
    const container = document.getElementById('quickFoodGrid');
    if (!container) return;
    const d = window.d;
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    const foods = d?.foods || [];

    container.innerHTML = quicks.map(item => {
      const activeEntry = foods.find(x => x.key === item.key);
      const isLogged = !!activeEntry;
      let badgeLabel = '';
      if (isLogged) {
        badgeLabel = (item.unit === 'g' || item.unit === 'ml')
          ? `${activeEntry.quantity}${item.unit}`
          : `${activeEntry.quantity}`;
      }

      return `
        <button type="button" class="quickFoodBtn ${isLogged ? 'inDraft' : ''}" data-food-key="${item.key}" title="Tap to add ${item.portion} to today's food">
          <span class="qfIcon">${item.icon}</span>
          <div class="qfInfo">
            <b>${item.name}</b>
            <small>${item.portion}</small>
          </div>
          ${badgeLabel ? `<span class="qfBadge">${badgeLabel}</span>` : ''}
          ${isLogged ? `<span class="qfMinus" onclick="event.stopPropagation(); window.stepDownFood('${item.key}')" title="Subtract one portion">−</span>` : ''}
        </button>
      `;
    }).join('');
  };

  /**
   * Render Selected Meal card (review active meal items)
   */
  const renderFoodDraft = () => {
    const list = document.getElementById('foodDraftList');
    const status = document.getElementById('draftStatus');
    const total = document.getElementById('draftTotal');
    if (!list) return;

    const d = window.d;
    const foods = d?.foods || [];

    if (status) {
      status.textContent = `${foods.length} item${foods.length === 1 ? '' : 's'}`;
    }

    if (!foods.length) {
      list.innerHTML = '<p class="muted" style="font-size:12px;margin:8px 0">No meal items selected yet. Tap any food above to log.</p>';
      if (total) total.textContent = 'Nothing selected';
      return;
    }

    const totP = foods.reduce((a, x) => a + (Number(x.p) || 0), 0);
    const totC = foods.reduce((a, x) => a + (Number(x.c) || 0), 0);

    if (total) {
      total.innerHTML = `<b>${totP.toFixed(1)}g</b> protein · <b>${Math.round(totC)}</b> kcal`;
    }

    list.innerHTML = foods.map((item, idx) => {
      const name = item.n || item.name || item.key;
      const p = Number(item.p || 0).toFixed(1);
      const c = Math.round(Number(item.c || 0));

      return `
        <div class="draftRow" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px">
          <div class="draftInfo" style="display:flex;flex-direction:column">
            <span class="draftName" style="font-weight:700;font-size:13px;color:#fff">${window.esc(name)}</span>
            <span class="draftMacros" style="font-size:11px;color:var(--lime,#b8f53a)">${p}g P · ${c} kcal</span>
          </div>
          <div class="draftActions" style="display:flex;gap:6px">
            <button type="button" class="draftBtn dec" onclick="window.stepDownFoodByIndex(${idx})" style="padding:3px 9px;background:#232b1f;color:var(--lime,#b8f53a);border:1px solid rgba(184,245,58,0.3);border-radius:6px;cursor:pointer;font-weight:bold" title="Decrease portion">−</button>
            <button type="button" class="draftBtn del" onclick="window.removeFood(${idx})" style="padding:3px 9px;background:#39201f;color:#ff9e9e;border:1px solid rgba(255,80,80,0.25);border-radius:6px;cursor:pointer" title="Remove item">✕</button>
          </div>
        </div>
      `;
    }).join('');
  };

  const stepDownFoodByIndex = (idx) => {
    const d = window.d;
    if (!d || !d.foods || !d.foods[idx]) return;
    const item = d.foods[idx];
    if (item.key) {
      stepDownFood(item.key);
    } else {
      removeFood(idx);
    }
  };

  const clearFoodDraft = () => {
    const d = window.d;
    if (!d) return;
    if (!d.foods || !d.foods.length) return;
    if (!confirm("Clear today's logged food items?")) return;
    d.foods = [];
    window.save(true);
    if (typeof window.toast === 'function') window.toast('Cleared today meals');
  };

  const commitFoodDraft = () => {
    // Foods are already saved in central state, so commit confirms and provides immediate feedback
    const d = window.d;
    if (!d || !d.foods || !d.foods.length) {
      if (typeof window.toast === 'function') window.toast('No foods selected yet');
      return;
    }
    const totP = d.foods.reduce((a, x) => a + (Number(x.p) || 0), 0);
    window.save(true);
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Meal confirmed ✓ (+${totP.toFixed(1)}g P)`, 'food');
    }
  };

  /**
   * Render Today's Food chronological timeline in #foodList
   * Section 6 requirement:
   * Show entries chronologically:
   * 08:15 Egg × 2 +12.6g protein +156 kcal
   * 13:10 Chicken 100g +27g protein +165 kcal
   * 20:00 Oats 50g +6.5g protein +190 kcal
   */
  const renderFoodList = () => {
    const listEl = document.getElementById('foodList');
    const totalEl = document.getElementById('foodTotal');
    if (!listEl) return;
    const d = window.d;
    const foods = d?.foods || [];

    if (!foods.length) {
      listEl.innerHTML = '<p class="muted" style="font-size:12px;margin:8px 0">No food logged yet today.</p>';
      if (totalEl) totalEl.textContent = '0g P · 0 kcal';
      return;
    }

    const totP = foods.reduce((a, x) => a + (Number(x.p) || 0), 0);
    const totC = foods.reduce((a, x) => a + (Number(x.c) || 0), 0);
    if (totalEl) {
      totalEl.textContent = `${totP.toFixed(1)}g P · ${Math.round(totC)} kcal`;
    }

    listEl.innerHTML = foods.map((f, i) => {
      const timeStr = f.time || '--:--';
      const costText = f.cost ? ` · ₹${f.cost}` : '';
      return `
        <div class="foodItemRow" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:8px;background:rgba(18,24,16,0.85);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:11px;font-weight:700;color:#7a8a72;background:rgba(255,255,255,0.05);padding:3px 7px;border-radius:6px">${timeStr}</span>
            <div>
              <b style="font-size:13px;color:#ffffff;display:block">${window.esc(f.n || f.name || 'Food')}</b>
              <small style="font-size:11.5px;color:var(--lime,#b8f53a);font-weight:600">+${Number(f.p || 0).toFixed(1)}g protein · +${Math.round(f.c || 0)} kcal${costText}</small>
            </div>
          </div>
          <button type="button" onclick="window.removeFood(${i})" style="background:rgba(255,80,80,0.12);color:#ff9e9e;border:1px solid rgba(255,80,80,0.25);border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer" title="Delete food entry">✕</button>
        </div>
      `;
    }).join('');
  };

  /**
   * Remove a food entry by index and immediately recalculate all central values
   */
  const removeFood = (i) => {
    const d = window.d;
    if (!d || !d.foods || !d.foods[i]) return;
    const removed = d.foods.splice(i, 1)[0];
    window.save(true);
    renderFoodDraft();
    renderFoodList();
    renderQuickFoodGrid();
    if (typeof window.toast === 'function') {
      window.toast(`Removed ${removed.n || 'item'}`);
    }
  };

  /**
   * Save a newly created custom food recipe (Section 5)
   */
  const saveCustomFood = () => {
    const d = window.d;
    if (!d) return;
    const nameEl = document.getElementById('customFoodName');
    const protEl = document.getElementById('customFoodProtein');
    const calEl = document.getElementById('customFoodCalories');
    const unitEl = document.getElementById('customFoodUnit');
    const amtEl = document.getElementById('customFoodAmount');
    if (!nameEl || !protEl || !calEl) return;

    const name = nameEl.value.trim();
    const protein = parseFloat(protEl.value);
    const calories = parseFloat(calEl.value);
    const unit = unitEl?.value || 'count';
    const amountPerTap = parseFloat(amtEl?.value) || 1;

    if (!name || isNaN(protein) || isNaN(calories) || protein < 0 || calories < 0) {
      if (typeof window.toast === 'function') window.toast('Please enter a valid recipe name and positive macros.');
      return;
    }

    d.customFoods = d.customFoods || [];
    const id = 'custom_' + Date.now();
    const newCustom = {
      id,
      name,
      protein: Math.round(protein * 10) / 10,
      calories: Math.round(calories),
      unit,
      amountPerTap
    };
    d.customFoods.push(newCustom);

    window.save(true);

    nameEl.value = '';
    protEl.value = '';
    calEl.value = '';
    renderCustomFoods();
    if (typeof window.toast === 'function') window.toast(`Saved custom food: ${name}`);
  };

  /**
   * Add a custom food into today's meal
   */
  const addCustomFood = (id) => {
    const d = window.d;
    const item = d?.customFoods?.find(x => x.id === id);
    if (!item) return;

    d.foods = d.foods || [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const existing = d.foods.find(x => x.key === id);

    if (existing) {
      existing.quantity = (Number(existing.quantity) || 1) + (Number(item.amountPerTap) || 1);
      existing.p = Math.round(existing.quantity * item.protein * 10) / 10;
      existing.c = Math.round(existing.quantity * item.calories);
      existing.n = `${item.name} × ${existing.quantity}`;
      existing.time = timeStr;
    } else {
      d.foods.push({
        id: 'cf_' + Date.now(),
        key: item.id,
        name: item.name,
        quantity: item.amountPerTap || 1,
        unit: item.unit || 'count',
        p: Number(item.protein) || 0,
        c: Number(item.calories) || 0,
        n: `${item.name} × ${item.amountPerTap || 1}`,
        time: timeStr,
        timestamp: now.getTime()
      });
    }

    if (typeof window.addTimelineEvent === 'function') {
      window.addTimelineEvent('food', `${item.name}`, `+${item.protein}g P · ${item.calories} kcal`, '🥗', 0);
    }

    window.save(true);
    renderFoodDraft();
    renderFoodList();
    if (typeof window.toast === 'function') window.toast(`+ Added ${item.name}`);
  };

  const removeCustomFood = (id) => {
    const d = window.d;
    if (!d || !d.customFoods) return;
    d.customFoods = d.customFoods.filter(x => x.id !== id);
    window.save(true);
    renderCustomFoods();
  };

  const renderCustomFoods = () => {
    const container = document.getElementById('customFoodsList') || document.getElementById('customFoodList');
    if (!container) return;
    const d = window.d;
    if (!d || !d.customFoods || !d.customFoods.length) {
      container.innerHTML = '<p class="muted" style="font-size:12px;margin:4px 0">No custom foods saved yet.</p>';
      return;
    }
    container.innerHTML = d.customFoods.map(x => `
      <div class="customFoodItem" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px">
        <div>
          <b style="font-size:13px;color:#fff">${window.esc(x.name)}</b>
          <div style="font-size:11px;color:var(--lime,#b8f53a)">${x.protein}g P · ${x.calories} kcal <span style="color:#7a8a72">(${x.amountPerTap || 1} ${x.unit || 'serving'})</span></div>
        </div>
        <div class="customFoodActions" style="display:flex;gap:6px">
          <button type="button" class="btnSmall" onclick="window.addCustomFood('${x.id}')" style="padding:4px 9px;background:#232b1f;color:var(--lime,#b8f53a);border:1px solid rgba(184,245,58,0.3);border-radius:6px;cursor:pointer;font-size:11px">+ Add</button>
          <button type="button" class="btnDelSmall" onclick="window.removeCustomFood('${x.id}')" style="padding:4px 9px;background:#39201f;color:#ff9e9e;border:1px solid rgba(255,80,80,0.25);border-radius:6px;cursor:pointer;font-size:11px">✕</button>
        </div>
      </div>
    `).join('');
  };

  /**
   * Smart Add input parser (e.g. "2 eggs, 3 appam, 100g chicken")
   */
  const smartAdd = () => {
    const d = window.d;
    if (!d) return;
    const input = document.getElementById('smartFood') || document.getElementById('smartInput');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    const parts = text.split(',');
    const db = (window.DEQX?.data?.foods?.DB) || window.DB || {};
    const quicks = (window.DEQX?.data?.foods?.QUICK_FOODS) || window.QUICK_FOODS || [];
    let addedNames = [];

    parts.forEach(part => {
      const pText = part.trim();
      if (!pText) return;

      const match = pText.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml|count)?\s*(.+)$/i) ||
                    pText.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*(?:g|ml|count)?$/i);

      let qty = 1;
      let rawName = pText.toLowerCase();

      if (match) {
        if (!isNaN(parseFloat(match[1]))) {
          qty = parseFloat(match[1]);
          rawName = match[2].trim().toLowerCase();
        } else if (!isNaN(parseFloat(match[2]))) {
          qty = parseFloat(match[2]);
          rawName = match[1].trim().toLowerCase();
        }
      }

      let foundQuick = quicks.find(q => rawName.includes(q.key) || q.name.toLowerCase().includes(rawName));
      let foundDbKey = null;

      if (!foundQuick) {
        for (const [k, v] of Object.entries(db)) {
          if (k === rawName || v.a.some(alias => rawName.includes(alias))) {
            foundDbKey = k;
            foundQuick = quicks.find(q => q.key === k);
            break;
          }
        }
      }

      if (foundQuick) {
        let p = 0, c = 0;
        if (foundQuick.unit === 'g' || foundQuick.unit === 'ml') {
          const factor = qty / foundQuick.amount;
          p = Math.round(foundQuick.pStep * factor * 10) / 10;
          c = Math.round(foundQuick.cStep * factor);
        } else {
          p = Math.round(foundQuick.pStep * qty * 10) / 10;
          c = Math.round(foundQuick.cStep * qty);
        }

        d.foods.push({
          id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          key: foundQuick.key,
          name: foundQuick.name,
          quantity: qty,
          unit: foundQuick.unit,
          p,
          c,
          n: formatFoodLabel(foundQuick.name, qty, foundQuick.unit),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          timestamp: Date.now()
        });
        addedNames.push(`${qty} ${foundQuick.name}`);
      } else {
        d.foods.push({
          id: 'f_' + Date.now(),
          key: 'custom',
          name: pText,
          quantity: qty,
          unit: 'portion',
          p: 0,
          c: 0,
          n: pText,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          timestamp: Date.now()
        });
        addedNames.push(pText);
      }
    });

    window.save(true);
    input.value = '';
    renderFoodDraft();
    renderFoodList();
    renderQuickFoodGrid();
    if (typeof window.savedFeedback === 'function') {
      window.savedFeedback(`Logged ${addedNames.join(', ')}`, 'food');
    }
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
    renderFoodList();
    renderFoodDraft();
    if (typeof window.toast === 'function') window.toast('Food entry updated');
  };

  // Delegated food button listener
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
    addQuickFood,
    stepDownFood,
    stepDownFoodByIndex,
    renderFoodDraft,
    clearFoodDraft,
    commitFoodDraft,
    renderQuickFoodGrid,
    renderFoodList,
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
  window.addQuickFood = addQuickFood;
  window.stepDownFood = stepDownFood;
  window.stepDownFoodByIndex = stepDownFoodByIndex;
  window.renderFoodDraft = renderFoodDraft;
  window.clearFoodDraft = clearFoodDraft;
  window.commitFoodDraft = commitFoodDraft;
  window.renderQuickFoodGrid = renderQuickFoodGrid;
  window.renderFoodList = renderFoodList;
  window.saveCustomFood = saveCustomFood;
  window.addCustomFood = addCustomFood;
  window.removeCustomFood = removeCustomFood;
  window.renderCustomFoods = renderCustomFoods;
  window.smartAdd = smartAdd;
  window.saveFoodEdit = saveFoodEdit;
  window.removeFood = removeFood;

})(window);
