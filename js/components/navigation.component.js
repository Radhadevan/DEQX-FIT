/**
 * DEQX FIT - Navigation Component
 * Capsule bottom bar, expandable dock, swipe gestures, keyboard arrows.
 */

(function (window) {
  'use strict';

  const TAB_META = {
    home: { icon: '⌂', label: 'Home' },
    food: { icon: '🍽', label: 'Food' },
    activity: { icon: '⚡', label: 'Activity' },
    workout: { icon: '🏋', label: 'Workout' },
    budget: { icon: '₹', label: 'Budget' },
    profile: { icon: '◉', label: 'Profile' }
  };

  const swipeOrder = ['home', 'food', 'activity', 'workout', 'budget', 'profile'];
  let navDockTimer = null;
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

  const toggleNavDock = () => {
    const dock = document.getElementById('navDock');
    if (dock && dock.classList.contains('show')) {
      collapseNavDock();
    } else {
      expandNavDock();
    }
  };

  const expandNavDock = () => {
    const dock = document.getElementById('navDock');
    const backdrop = document.getElementById('navDockBackdrop');
    const capsule = document.getElementById('navCapsule');
    if (dock) dock.classList.add('show');
    if (backdrop) backdrop.classList.add('show');
    if (capsule) capsule.classList.add('expanded');
    clearTimeout(navDockTimer);
    navDockTimer = setTimeout(() => {
      collapseNavDock();
    }, 4500);
  };

  const collapseNavDock = () => {
    const dock = document.getElementById('navDock');
    const backdrop = document.getElementById('navDockBackdrop');
    const capsule = document.getElementById('navCapsule');
    if (dock) dock.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
    if (capsule) capsule.classList.remove('expanded');
    clearTimeout(navDockTimer);
  };

  const selectNavTab = (tabId) => {
    show(tabId);
    setTimeout(() => {
      collapseNavDock();
    }, 140);
  };

  const show = (id, direction) => {
    document.querySelectorAll('.section').forEach(x => x.classList.remove('active', 'motion-left', 'motion-right'));
    const sec = document.getElementById(id);
    if (sec) {
      sec.classList.add('active');
      if (direction) sec.classList.add(direction === 'left' ? 'motion-left' : 'motion-right');
    }

    // Update navigation dock active state
    document.querySelectorAll('.navDockItem').forEach(x => x.classList.remove('active'));
    document.getElementById('n-' + id)?.classList.add('active');

    // Update capsule current section title and icon
    const meta = TAB_META[id] || { icon: '⌂', label: 'Home' };
    const iconEl = document.getElementById('capsuleIcon');
    const labelEl = document.getElementById('capsuleLabel');
    if (iconEl) iconEl.textContent = meta.icon;
    if (labelEl) labelEl.textContent = meta.label;

    // Update 7-dot indicator track
    document.querySelectorAll('.navDot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-tab') === id);
    });

    if (id === 'profile' && typeof window.fillProfile === 'function') window.fillProfile();
    if (id === 'workout' && typeof window.renderCalendar === 'function') window.renderCalendar();
    if (typeof window.render === 'function') window.render();
    if (typeof window.updateSpendRing === 'function') window.updateSpendRing();
  };

  // Setup touch & gesture listeners
  const initGestures = () => {
    document.addEventListener('touchstart', e => {
      if (!e.touches[0]) return;
      const target = e.target;
      if (target.closest('input, textarea, select, .modalBox, .targetMapBox, .levelUpBox, .calendarTrack')) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      if (!t) return;
      const target = e.target;
      if (target.closest('input, textarea, select, .modalBox, .targetMapBox, .levelUpBox, .onboardBox, .calendarTrack')) return;

      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      // Swipe up on bottom capsule opens dock
      if (target.closest('#navCapsule') && dy < -30 && Math.abs(dy) > Math.abs(dx)) {
        expandNavDock();
        return;
      }

      // Swipe down on nav dock closes it
      if (target.closest('#navDock') && dy > 40 && Math.abs(dy) > Math.abs(dx)) {
        collapseNavDock();
        return;
      }

      // Horizontal swipe between sections
      if (dt > 700 || Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      const active = document.querySelector('.section.active');
      if (!active) return;
      const i = swipeOrder.indexOf(active.id);
      if (i === -1) return;
      const ni = i + (dx < 0 ? 1 : -1);
      if (ni < 0 || ni >= swipeOrder.length) return;
      show(swipeOrder[ni], dx < 0 ? 'left' : 'right');
    }, { passive: true });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (typeof window.closeOnboardingModal === 'function') window.closeOnboardingModal();
        if (typeof window.closeTargetMapModal === 'function') window.closeTargetMapModal();
        if (typeof window.closeAdjustModal === 'function') window.closeAdjustModal();
        if (typeof window.closeLevelOverlay === 'function') window.closeLevelOverlay();
        if (typeof window.closeLevelUp === 'function') window.closeLevelUp();
        collapseNavDock();
        return;
      }

      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const active = document.querySelector('.section.active');
          if (active) {
            const i = swipeOrder.indexOf(active.id);
            if (i !== -1) {
              const ni = i + (e.key === 'ArrowRight' ? 1 : -1);
              if (ni >= 0 && ni < swipeOrder.length) {
                e.preventDefault();
                show(swipeOrder[ni], e.key === 'ArrowRight' ? 'left' : 'right');
              }
            }
          }
        }
      }
    });
  };

  initGestures();

  window.DEQX = window.DEQX || {};
  window.DEQX.components = window.DEQX.components || {};
  window.DEQX.components.navigation = {
    TAB_META,
    swipeOrder,
    toggleNavDock,
    expandNavDock,
    collapseNavDock,
    selectNavTab,
    show
  };

  // Global backward compatibility
  window.TAB_META = TAB_META;
  window.swipeOrder = swipeOrder;
  window.toggleNavDock = toggleNavDock;
  window.expandNavDock = expandNavDock;
  window.collapseNavDock = collapseNavDock;
  window.selectNavTab = selectNavTab;
  window.show = show;

})(window);
