/**
 * DEQX FIT - 3D Anatomical Hologram Muscle Viewer
 * Acid Green Theme Edition (#d6ff32)
 * Interactive 3D Holographic physique visualizer with targeted muscle activation,
 * 3D perspective parallax, dual-sided (front/back) anatomical projection,
 * and live synchronization with Today's Scheduled Workout.
 */

(function () {
  'use strict';

  // App Theme: Signature Acid Green
  const ACID_GREEN = '#d6ff32';

  // Workout Muscle Activation Map (Strictly Theme Color: Acid Green)
  const WORKOUT_MUSCLE_MAP = {
    'Chest + Triceps': {
      primary: ['chest', 'triceps'],
      secondary: ['deltoids-front'],
      defaultView: 'front',
      badgeText: 'CHEST & TRICEPS TARGETED',
      badgeColor: ACID_GREEN,
      tags: [
        { name: 'Pectoralis Major', type: 'primary', view: 'front', key: 'chest' },
        { name: 'Triceps Brachii', type: 'primary', view: 'back', key: 'triceps' },
        { name: 'Anterior Deltoids', type: 'secondary', view: 'front', key: 'deltoids' }
      ],
      markers: {
        front: [
          { top: 25, left: 32, label: 'PECTORALS', sub: 'Primary Target', key: 'chest' },
          { top: 21, left: 74, label: 'FRONT DELTS', sub: 'Secondary', key: 'deltoids' }
        ],
        back: [
          { top: 31, left: 24, label: 'TRICEPS (LONG)', sub: 'Primary Target', key: 'triceps' },
          { top: 31, left: 76, label: 'TRICEPS (LATERAL)', sub: 'Primary Target', key: 'triceps' }
        ]
      },
      summary: 'Primary emphasis on horizontal pressing & elbow extension. Front deltoids act as secondary stabilizers.'
    },

    'Back + Biceps': {
      primary: ['lats', 'traps', 'biceps'],
      secondary: ['deltoids-rear', 'forearms', 'lower-back'],
      defaultView: 'back', // Auto-orient to back view
      badgeText: 'BACK & BICEPS TARGETED',
      badgeColor: ACID_GREEN,
      tags: [
        { name: 'Latissimus Dorsi', type: 'primary', view: 'back', key: 'lats' },
        { name: 'Trapezius & Rhomboids', type: 'primary', view: 'back', key: 'traps' },
        { name: 'Biceps Brachii', type: 'primary', view: 'front', key: 'biceps' },
        { name: 'Forearms & Grip', type: 'secondary', view: 'front', key: 'forearms' }
      ],
      markers: {
        front: [
          { top: 32, left: 23, label: 'BICEPS BRACHII', sub: 'Primary Target', key: 'biceps' },
          { top: 43, left: 76, label: 'FOREARMS', sub: 'Grip Stabilizer', key: 'forearms' }
        ],
        back: [
          { top: 21, left: 50, label: 'TRAPEZIUS', sub: 'Upper Thickness', key: 'traps' },
          { top: 32, left: 28, label: 'LATS (V-TAPER)', sub: 'Primary Width', key: 'lats' }
        ]
      },
      summary: 'Vertical and horizontal pulling. Heavy lats and upper back recruitment with high bicep flexion.'
    },

    'Shoulders + Forearms': {
      primary: ['deltoids', 'deltoids-front', 'deltoids-rear', 'forearms'],
      secondary: ['traps', 'abs'],
      defaultView: 'front',
      badgeText: 'SHOULDERS & ARMS TARGETED',
      badgeColor: ACID_GREEN,
      tags: [
        { name: 'Lateral & Front Delts', type: 'primary', view: 'front', key: 'deltoids' },
        { name: 'Posterior Delts', type: 'primary', view: 'back', key: 'deltoids' },
        { name: 'Brachioradialis & Forearms', type: 'primary', view: 'front', key: 'forearms' },
        { name: 'Upper Trapezius', type: 'secondary', view: 'back', key: 'traps' }
      ],
      markers: {
        front: [
          { top: 21, left: 25, label: 'LATERAL DELTS', sub: '3D Shoulder Cap', key: 'deltoids' },
          { top: 43, left: 76, label: 'FOREARMS', sub: 'Flexors & Extensors', key: 'forearms' }
        ],
        back: [
          { top: 22, left: 26, label: 'REAR DELTS', sub: 'Posterior Cap', key: 'deltoids' },
          { top: 43, left: 22, label: 'EXTENSORS', sub: 'Forearm Density', key: 'forearms' }
        ]
      },
      summary: '3D shoulder hypertrophy targeting anterior, lateral, and posterior deltoid heads, plus intense forearm grip work.'
    },

    'Leg Day': {
      primary: ['quads', 'hamstrings', 'glutes', 'calves'],
      secondary: ['abs', 'lower-back'],
      defaultView: 'front',
      badgeText: 'LOWER BODY CHAIN TARGETED',
      badgeColor: ACID_GREEN,
      tags: [
        { name: 'Quadriceps Femoris', type: 'primary', view: 'front', key: 'quads' },
        { name: 'Hamstrings & Glutes', type: 'primary', view: 'back', key: 'hamstrings' },
        { name: 'Calves (Gastrocnemius)', type: 'primary', view: 'front', key: 'calves' },
        { name: 'Core Stabilizers', type: 'secondary', view: 'front', key: 'abs' }
      ],
      markers: {
        front: [
          { top: 60, left: 34, label: 'QUADRICEPS', sub: 'Vastus & Rectus', key: 'quads' },
          { top: 76, left: 66, label: 'CALVES', sub: 'Gastrocnemius', key: 'calves' }
        ],
        back: [
          { top: 47, left: 40, label: 'GLUTEUS MAXIMUS', sub: 'Posterior Engine', key: 'glutes' },
          { top: 60, left: 65, label: 'HAMSTRINGS', sub: 'Biceps Femoris', key: 'hamstrings' }
        ]
      },
      summary: 'High-energy compound leg session. Quadriceps knee extension paired with posterior hamstring & glute drive.'
    },

    'Rest': {
      primary: [],
      secondary: [],
      defaultView: 'front',
      badgeText: 'SYSTEM IN RECOVERY MODE',
      badgeColor: '#a855f7',
      tags: [
        { name: 'Deep Systemic Recovery', type: 'recovery', view: 'front', key: 'recovery' },
        { name: 'Protein Synthesis Active', type: 'recovery', view: 'front', key: 'recovery' },
        { name: 'CNS Regeneration', type: 'recovery', view: 'back', key: 'recovery' }
      ],
      markers: {
        front: [
          { top: 38, left: 50, label: 'SYSTEM RECOVERY', sub: '100% Muscle Repair', key: 'recovery' }
        ],
        back: [
          { top: 38, left: 50, label: 'REST & RESTORE', sub: 'Tissue Regeneration', key: 'recovery' }
        ]
      },
      summary: 'Rest day. Muscles grow during recovery. Hydrate, hit your protein target, and recharge for tomorrow.'
    }
  };

  // Anatomical details database
  const MUSCLE_DETAILS = {
    chest: {
      name: 'Pectoralis Major & Minor',
      role: 'Primary pushing engine',
      workout: 'Chest + Triceps',
      exercises: 'Flat Barbell Bench, Incline DB Press, Cable Flyes, Chest Dips',
      tip: 'Retract your shoulder blades and flare elbows at ~45° to protect rotator cuffs while maximizing pec stretch.'
    },
    triceps: {
      name: 'Triceps Brachii (3 Heads)',
      role: 'Primary elbow extensor & lock-out',
      workout: 'Chest + Triceps',
      exercises: 'Cable Rope Pushdowns, Skull Crushers, Close-Grip Bench, Overhead DB Extension',
      tip: 'Keep elbows tucked tightly to focus on the long head for maximum upper arm horseshoe thickness.'
    },
    biceps: {
      name: 'Biceps Brachii & Brachialis',
      role: 'Forearm supinator & elbow flexor',
      workout: 'Back + Biceps',
      exercises: 'Standing Barbell Curls, Incline Dumbbell Curls, Hammer Curls, Preacher Curls',
      tip: 'Do not swing your shoulders. Focus on curling with full forearm supination at peak contraction.'
    },
    lats: {
      name: 'Latissimus Dorsi (V-Taper)',
      role: 'Primary back width & upper body pulling',
      workout: 'Back + Biceps',
      exercises: 'Weighted Pull-Ups, Lat Pulldowns, Single-Arm DB Rows, Barbell Bent-Over Rows',
      tip: 'Drive with your elbows rather than pulling with your hands to disengage biceps and isolate back lats.'
    },
    traps: {
      name: 'Trapezius & Rhomboids',
      role: 'Upper back thickness, scapular retraction & neck support',
      workout: 'Back + Biceps / Shoulders',
      exercises: 'Face Pulls, Barbell Shrugs, Chest-Supported Row, Kelso Shrugs',
      tip: 'Pause for 1 full second at top contraction to trigger maximum rhomboid and trap fibers.'
    },
    deltoids: {
      name: 'Deltoid Muscle (Anterior, Lateral, Posterior)',
      role: '3D boulder shoulder width & rotation',
      workout: 'Shoulders + Forearms',
      exercises: 'Standing Overhead Military Press, Dumbbell Lateral Raises, Cable Face Pulls',
      tip: 'For lateral delts, lead with the elbows with pinkies slightly higher than thumbs for rounder caps.'
    },
    forearms: {
      name: 'Brachioradialis & Wrist Flexors/Extensors',
      role: 'Grip lock, wrist stabilization & athletic power',
      workout: 'Shoulders + Forearms',
      exercises: 'Farmer Walks, Reverse Barbell Curls, Behind-Back Wrist Curls, Dead Hangs',
      tip: 'Direct forearm and grip training protects wrists and prevents plateauing on heavy compound deadlifts.'
    },
    quads: {
      name: 'Quadriceps Femoris (4 Heads)',
      role: 'Knee extension, squat drive & athletic jumping',
      workout: 'Leg Day',
      exercises: 'Barbell Back Squats, Leg Press, Bulgarian Split Squats, Leg Extensions',
      tip: 'Achieve full depth below parallel to engage the tear-drop vastus medialis near the knee.'
    },
    hamstrings: {
      name: 'Hamstrings (Biceps Femoris & Semitendinosus)',
      role: 'Knee flexion, hip extension & posterior power',
      workout: 'Leg Day',
      exercises: 'Romanian Deadlifts (RDL), Lying Leg Curls, Glute-Ham Raises, Nordic Curls',
      tip: 'Push your hips back as far as possible in RDLs with a flat back to place deep eccentric tension on hamstrings.'
    },
    glutes: {
      name: 'Gluteus Maximus & Medius',
      role: 'Most powerful hip extensor in the human body',
      workout: 'Leg Day',
      exercises: 'Barbell Hip Thrusts, Deep Goblet Squats, Walking Lunges, Cable Kickbacks',
      tip: 'Squeeze glutes at the top of the hip thrust for a 2-second hold with chin tucked toward chest.'
    },
    calves: {
      name: 'Gastrocnemius & Soleus',
      role: 'Ankle plantar flexion, Achilles spring & sprint drive',
      workout: 'Leg Day',
      exercises: 'Standing Heavy Calf Raises, Seated Calf Raises, Donkey Calf Machine',
      tip: 'Hold the full stretch at the bottom for 2 seconds to eliminate Achilles tendon elastic rebound.'
    },
    abs: {
      name: 'Rectus Abdominis & Obliques',
      role: 'Core stability, intra-abdominal pressure & posture',
      workout: 'Core & Stabilization',
      exercises: 'Hanging Leg Raises, Ab Wheel Rollouts, Cable Woodchops, Weighted Planks',
      tip: 'Exhale all air completely at maximum abdominal contraction to fully activate deep transversus abdominis.'
    },
    recovery: {
      name: 'Full Body Muscular System',
      role: 'Cellular recovery & myofibrillar protein synthesis',
      workout: 'Rest & Recovery Day',
      exercises: 'Light walking, stretching, foam rolling, adequate hydration, sleep',
      tip: 'Muscles do not grow in the gym; they grow while you sleep. Maintain protein intake today!'
    }
  };

  // State
  let currentView = 'front'; // 'front' | 'back'
  let currentSplit = 'Back + Biceps';
  let isCardFlipping = false;

  /**
   * Initialize 3D Hologram
   */
  function initHologram() {
    setupStageInteractions();
    setupDropdownSync();

    // Initial sync with today's scheduled routine
    const sel = document.getElementById('workoutSelect');
    const initialSplit = sel ? sel.value : 'Back + Biceps';
    updateHologram(initialSplit);
  }

  /**
   * Setup 3D perspective mouse / touch parallax on the hologram stage
   */
  function setupStageInteractions() {
    const stage = document.getElementById('holoStage');
    const bodyCard = document.getElementById('holoBodyCard');
    if (!stage || !bodyCard) return;

    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let rafId = null;

    function updateParallax() {
      // Smooth lerp
      currentRotX += (targetRotX - currentRotX) * 0.12;
      currentRotY += (targetRotY - currentRotY) * 0.12;

      const baseFlip = currentView === 'back' ? 180 : 0;
      bodyCard.style.transform = `rotateY(${baseFlip + currentRotY}deg) rotateX(${currentRotX}deg)`;

      if (Math.abs(targetRotX - currentRotX) > 0.05 || Math.abs(targetRotY - currentRotY) > 0.05) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        rafId = null;
      }
    }

    function onPointerMove(e) {
      if (isCardFlipping) return;
      const rect = stage.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const x = (clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

      // Invert Y rotation when looking from behind
      const flipSign = currentView === 'back' ? -1 : 1;
      targetRotY = x * 18 * flipSign;
      targetRotX = -y * 12;

      if (!rafId) rafId = requestAnimationFrame(updateParallax);
    }

    function onPointerLeave() {
      targetRotX = 0;
      targetRotY = 0;
      if (!rafId) rafId = requestAnimationFrame(updateParallax);
    }

    stage.addEventListener('mousemove', onPointerMove, { passive: true });
    stage.addEventListener('mouseleave', onPointerLeave, { passive: true });
    stage.addEventListener('touchmove', onPointerMove, { passive: true });
    stage.addEventListener('touchend', onPointerLeave, { passive: true });
  }

  /**
   * Sync with workout select dropdown
   */
  function setupDropdownSync() {
    const sel = document.getElementById('workoutSelect');
    if (!sel) return;

    sel.addEventListener('change', function () {
      updateHologram(this.value);
    });
  }

  /**
   * Update hologram state and highlights for a given workout
   */
  function updateHologram(splitName) {
    if (!splitName) return;
    currentSplit = splitName;

    // Resolve workout data or fuzzy match
    let data = WORKOUT_MUSCLE_MAP[splitName];
    if (!data) {
      const lower = splitName.toLowerCase();
      if (lower.includes('chest') || lower.includes('tricep') || lower.includes('push')) {
        data = WORKOUT_MUSCLE_MAP['Chest + Triceps'];
      } else if (lower.includes('back') || lower.includes('bicep') || lower.includes('pull')) {
        data = WORKOUT_MUSCLE_MAP['Back + Biceps'];
      } else if (lower.includes('shoulder') || lower.includes('arm') || lower.includes('forearm')) {
        data = WORKOUT_MUSCLE_MAP['Shoulders + Forearms'];
      } else if (lower.includes('leg') || lower.includes('squat')) {
        data = WORKOUT_MUSCLE_MAP['Leg Day'];
      } else if (lower.includes('rest')) {
        data = WORKOUT_MUSCLE_MAP['Rest'];
      } else {
        data = WORKOUT_MUSCLE_MAP['Back + Biceps'];
      }
    }

    // Update Header Badge (Strictly Acid Green)
    const badge = document.getElementById('hologramStatusBadge');
    const badgeText = document.getElementById('hologramBadgeText');
    if (badge && badgeText) {
      badgeText.textContent = data.badgeText;
      const col = data.badgeColor || ACID_GREEN;
      badge.style.borderColor = col;
      badge.style.color = col;
      badge.style.boxShadow = `0 0 14px ${col}44`;
    }

    // Update Top Label
    const topLabel = document.getElementById('holoTargetLabel');
    if (topLabel) topLabel.textContent = splitName.toUpperCase();

    // Auto switch to optimal view
    if (data.defaultView && data.defaultView !== currentView) {
      setHoloView(data.defaultView, true);
    } else {
      updateActiveMuscleHighlights();
      renderHudMarkers();
    }

    // Render Bottom Chips
    renderTargetChips(data);
  }

  /**
   * Set Hologram view: 'front' or 'back'
   */
  function setHoloView(view, autoTriggered = false) {
    if (currentView === view && !autoTriggered) return;
    currentView = view;
    isCardFlipping = true;

    // Update Buttons
    const btnFront = document.getElementById('holoBtnFront');
    const btnBack = document.getElementById('holoBtnBack');
    if (btnFront) btnFront.classList.toggle('active', view === 'front');
    if (btnBack) btnBack.classList.toggle('active', view === 'back');

    // Flip 3D Body Card
    const bodyCard = document.getElementById('holoBodyCard');
    if (bodyCard) {
      bodyCard.classList.toggle('flipped', view === 'back');
      bodyCard.style.transform = view === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)';
    }

    // Re-render HUD markers and active muscle highlights
    setTimeout(() => {
      isCardFlipping = false;
      updateActiveMuscleHighlights();
      renderHudMarkers();
    }, 280);
  }

  /**
   * Toggle between Front and Back
   */
  function toggleHoloView() {
    setHoloView(currentView === 'front' ? 'back' : 'front');
  }

  /**
   * Update active SVG muscle highlighting
   */
  function updateActiveMuscleHighlights() {
    const data = WORKOUT_MUSCLE_MAP[currentSplit] || WORKOUT_MUSCLE_MAP['Back + Biceps'];
    const primaryMuscles = data.primary || [];
    const secondaryMuscles = data.secondary || [];
    const isRest = currentSplit === 'Rest';

    const stage = document.getElementById('holoStage');
    if (stage) {
      stage.classList.toggle('holo-rest-mode', isRest);
    }

    // Query all muscle elements in both front and back SVGs
    const allMuscles = document.querySelectorAll('.holoMuscle');
    allMuscles.forEach(el => {
      const muscleKey = el.getAttribute('data-muscle');
      el.classList.remove('active', 'active-secondary', 'pulse-glow');

      if (isRest) {
        el.classList.add('active-recovery');
      } else {
        el.classList.remove('active-recovery');
        if (primaryMuscles.includes(muscleKey)) {
          el.classList.add('active', 'pulse-glow');
        } else if (secondaryMuscles.includes(muscleKey)) {
          el.classList.add('active-secondary');
        }
      }
    });
  }

  /**
   * Render floating HUD target markers with laser lines
   */
  function renderHudMarkers() {
    const container = document.getElementById('holoHudMarkers');
    if (!container) return;

    const data = WORKOUT_MUSCLE_MAP[currentSplit] || WORKOUT_MUSCLE_MAP['Back + Biceps'];
    const markers = (data.markers && data.markers[currentView]) || [];

    if (!markers.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = markers.map(m => `
      <div class="holoMarker ${m.left > 50 ? 'marker-right' : 'marker-left'}" 
           style="top:${m.top}%; left:${m.left}%;"
           onclick="HologramViewer.showMuscleDetail('${m.key}')"
           role="button" tabindex="0">
        <div class="markerReticle">
          <div class="markerDot"></div>
          <div class="markerRing"></div>
        </div>
        <div class="markerLine"></div>
        <div class="markerBox">
          <div class="markerLabel">${m.label}</div>
          <div class="markerSub">${m.sub}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render Bottom Target Muscle Chips
   */
  function renderTargetChips(data) {
    const container = document.getElementById('holoTargetChips');
    if (!container) return;

    const tags = data.tags || [];
    container.innerHTML = tags.map(t => `
      <button type="button" class="holoChip ${t.type}" onclick="HologramViewer.showMuscleDetail('${t.key}', '${t.view}')">
        <span class="chipDot"></span>
        <b>${t.name}</b>
        <small>${t.type === 'primary' ? 'PRIMARY' : t.type === 'secondary' ? 'SECONDARY' : 'RECOVERY'}</small>
        <span class="chipViewHint">${t.view === 'both' ? '🔄' : t.view === 'back' ? 'REAR' : 'FRONT'}</span>
      </button>
    `).join('');
  }

  /**
   * Show interactive muscle detail modal / popover
   */
  function showMuscleDetail(muscleKey, targetView) {
    if (targetView && targetView !== 'both' && targetView !== currentView) {
      setHoloView(targetView);
    }

    const detail = MUSCLE_DETAILS[muscleKey] || MUSCLE_DETAILS.chest;
    const modal = document.getElementById('holoMuscleDetail');
    if (!modal) return;

    document.getElementById('holoDetailTitle').textContent = detail.name;
    document.getElementById('holoDetailRole').textContent = detail.role;
    document.getElementById('holoDetailExercises').textContent = detail.exercises;
    document.getElementById('holoDetailTip').textContent = detail.tip;
    document.getElementById('holoDetailTag').textContent = detail.workout;

    modal.style.display = 'block';
    modal.classList.add('show');

    // Also pulse the corresponding SVG muscle
    const targetSvgMuscle = document.querySelector(`.holoFace:not([style*="display: none"]) [data-muscle="${muscleKey}"]`);
    if (targetSvgMuscle) {
      targetSvgMuscle.classList.add('target-highlight-pulse');
      setTimeout(() => targetSvgMuscle.classList.remove('target-highlight-pulse'), 1800);
    }
  }

  /**
   * Close muscle detail popover
   */
  function closeHoloDetail() {
    const modal = document.getElementById('holoMuscleDetail');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }

  // Expose Global API
  window.HologramViewer = {
    init: initHologram,
    update: updateHologram,
    setView: setHoloView,
    toggleView: toggleHoloView,
    showMuscleDetail: showMuscleDetail,
    closeDetail: closeHoloDetail
  };

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHologram);
  } else {
    setTimeout(initHologram, 50);
  }

})();
