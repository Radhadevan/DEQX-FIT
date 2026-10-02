/**
 * DEQX FIT - Workout Routines & Split Cycles Database
 * Config-driven schedule and anatomical muscle visualizer mapping.
 */

(function (window) {
  'use strict';

  const WORKOUT_SPLITS = [
    'Chest + Triceps',
    'Back + Biceps',
    'Shoulders + Forearms',
    'Leg Day',
    'Rest'
  ];

  const WEEKLY_SCHEDULE = {
    0: 'Rest',                   // Sunday
    1: 'Chest + Triceps',        // Monday
    2: 'Back + Biceps',          // Tuesday
    3: 'Shoulders + Forearms',   // Wednesday
    4: 'Leg Day',                // Thursday
    5: 'Chest + Triceps',        // Friday
    6: 'Rest'                    // Saturday
  };

  const WORKOUT_ROUTINES_DATA = {
    'Back + Biceps': {
      split: 'Back + Biceps',
      badgeTag: 'BACK & BICEPS',
      title: 'Back + Biceps',
      subtitle: "This is today's scheduled workout. Complete it to earn +50 XP.",
      defaultView: 'back',
      views: {
        back: {
          id: 'back',
          label: 'Back',
          image: 'assets/workout-back.png',
          ctaText: 'Start Back Workout',
          exerciseHeader: 'EXERCISES (BACK ONLY)',
          targetMuscle: {
            name: 'Latissimus Dorsi',
            role: 'Primary Target',
            icon: 'assets/target-lat.png'
          },
          exercises: [
            { id: 'b1', name: 'Pull Up', setsReps: '3 sets · 6–10 reps', thumb: 'assets/pull-up.png' },
            { id: 'b2', name: 'Lat Pulldown', setsReps: '3 sets · 8–12 reps', thumb: 'assets/lat-pulldown.png' },
            { id: 'b3', name: 'Seated Cable Row', setsReps: '3 sets · 8–12 reps', thumb: 'assets/seated-cable-row.png' },
            { id: 'b4', name: 'Single Arm Dumbbell Row', setsReps: '3 sets · 8–12 reps', thumb: 'assets/dumbbell-row.png' },
            { id: 'b5', name: 'Face Pull', setsReps: '3 sets · 12–15 reps', thumb: 'assets/face-pull.png' }
          ]
        },
        biceps: {
          id: 'biceps',
          label: 'Biceps',
          altLabel: 'Front',
          image: 'assets/workout-biceps.png',
          ctaText: 'Start Biceps Workout',
          exerciseHeader: 'EXERCISES (BICEPS ONLY)',
          targetMuscle: {
            name: 'Biceps Brachii',
            role: 'Primary Target',
            icon: 'assets/target-biceps.png'
          },
          exercises: [
            { id: 'bi1', name: 'Barbell Bicep Curl', setsReps: '3 sets · 8–12 reps', thumb: 'assets/barbell-curl.png' },
            { id: 'bi2', name: 'Dumbbell Bicep Curl', setsReps: '3 sets · 8–12 reps', thumb: 'assets/dumbbell-curl.png' },
            { id: 'bi3', name: 'Hammer Curl', setsReps: '3 sets · 8–12 reps', thumb: 'assets/hammer-curl.png' },
            { id: 'bi4', name: 'Preacher Curl', setsReps: '3 sets · 10–12 reps', thumb: 'assets/preacher-curl.png' },
            { id: 'bi5', name: 'Concentration Curl', setsReps: '3 sets · 10–12 reps', thumb: 'assets/concentration-curl.png' }
          ]
        }
      }
    },

    'Chest + Triceps': {
      split: 'Chest + Triceps',
      badgeTag: 'CHEST & TRICEPS',
      title: 'Chest + Triceps',
      subtitle: "This is today's scheduled workout. Complete it to earn +50 XP.",
      defaultView: 'chest',
      views: {
        chest: {
          id: 'chest',
          label: 'Chest',
          altLabel: 'Front',
          image: 'assets/workout-chest.jpg',
          ctaText: 'Start Chest Workout',
          exerciseHeader: 'EXERCISES (CHEST ONLY)',
          targetMuscle: {
            name: 'Pectoralis Major',
            role: 'Primary Target',
            icon: 'assets/target-lat.png'
          },
          exercises: [
            { id: 'c1', name: 'Barbell Bench Press', setsReps: '4 sets · 6–8 reps', thumb: 'assets/pull-up.png' },
            { id: 'c2', name: 'Incline Dumbbell Press', setsReps: '3 sets · 8–10 reps', thumb: 'assets/lat-pulldown.png' },
            { id: 'c3', name: 'Incline Dumbbell Flyes', setsReps: '3 sets · 10–12 reps', thumb: 'assets/seated-cable-row.png' },
            { id: 'c4', name: 'Cable Chest Crossover', setsReps: '3 sets · 12–15 reps', thumb: 'assets/dumbbell-row.png' },
            { id: 'c5', name: 'Bodyweight Chest Dips', setsReps: '3 sets · 10–15 reps', thumb: 'assets/face-pull.png' }
          ]
        },
        triceps: {
          id: 'triceps',
          label: 'Triceps',
          altLabel: 'Back',
          image: 'assets/workout-chest.jpg',
          ctaText: 'Start Triceps Workout',
          exerciseHeader: 'EXERCISES (TRICEPS ONLY)',
          targetMuscle: {
            name: 'Triceps Brachii',
            role: 'Elbow Extension',
            icon: 'assets/target-biceps.png'
          },
          exercises: [
            { id: 't1', name: 'Cable Rope Pushdown', setsReps: '4 sets · 10–12 reps', thumb: 'assets/barbell-curl.png' },
            { id: 't2', name: 'Skull Crushers (EZ Bar)', setsReps: '3 sets · 8–10 reps', thumb: 'assets/dumbbell-curl.png' },
            { id: 't3', name: 'Overhead Dumbbell Tricep Extension', setsReps: '3 sets · 10–12 reps', thumb: 'assets/hammer-curl.png' },
            { id: 't4', name: 'Close-Grip Push-Ups', setsReps: '3 sets · Failure', thumb: 'assets/preacher-curl.png' },
            { id: 't5', name: 'Single Arm Cable Kickback', setsReps: '3 sets · 12–15 reps', thumb: 'assets/concentration-curl.png' }
          ]
        }
      }
    },

    'Shoulders + Forearms': {
      split: 'Shoulders + Forearms',
      badgeTag: 'SHOULDERS & FOREARMS',
      title: 'Shoulders + Forearms',
      subtitle: "This is today's scheduled workout. Complete it to earn +50 XP.",
      defaultView: 'shoulders',
      views: {
        shoulders: {
          id: 'shoulders',
          label: 'Shoulders',
          image: 'assets/workout-shoulders.jpg',
          ctaText: 'Start Shoulder Workout',
          exerciseHeader: 'EXERCISES (DELTOIDS ONLY)',
          targetMuscle: {
            name: 'Deltoids & Trapezius',
            role: 'Primary Target',
            icon: 'assets/target-lat.png'
          },
          exercises: [
            { id: 's1', name: 'Overhead Barbell Press (OHP)', setsReps: '4 sets · 6–8 reps', thumb: 'assets/pull-up.png' },
            { id: 's2', name: 'Dumbbell Lateral Raise', setsReps: '4 sets · 12–15 reps', thumb: 'assets/lat-pulldown.png' },
            { id: 's3', name: 'Dumbbell Arnold Press', setsReps: '3 sets · 8–10 reps', thumb: 'assets/seated-cable-row.png' },
            { id: 's4', name: 'Rear Delt Reverse Flyes', setsReps: '4 sets · 12–15 reps', thumb: 'assets/dumbbell-row.png' },
            { id: 's5', name: 'Cable Face Pulls', setsReps: '3 sets · 15 reps', thumb: 'assets/face-pull.png' }
          ]
        },
        forearms: {
          id: 'forearms',
          label: 'Forearms',
          image: 'assets/workout-shoulders.jpg',
          ctaText: 'Start Forearms Workout',
          exerciseHeader: 'EXERCISES (FOREARMS ONLY)',
          targetMuscle: {
            name: 'Brachioradialis & Wrist Flexors',
            role: 'Grip & Arm Balance',
            icon: 'assets/target-biceps.png'
          },
          exercises: [
            { id: 'f1', name: 'Barbell Wrist Curls', setsReps: '4 sets · 15–20 reps', thumb: 'assets/barbell-curl.png' },
            { id: 'f2', name: 'Reverse Barbell Curl', setsReps: '3 sets · 10–12 reps', thumb: 'assets/dumbbell-curl.png' },
            { id: 'f3', name: 'Farmer’s Walk Carry', setsReps: '3 sets · 45 secs', thumb: 'assets/hammer-curl.png' },
            { id: 'f4', name: 'Plate Pinch Hold', setsReps: '3 sets · Max time', thumb: 'assets/preacher-curl.png' },
            { id: 'f5', name: 'Dead Hang Grip', setsReps: '3 sets · Max hold', thumb: 'assets/concentration-curl.png' }
          ]
        }
      }
    },

    'Leg Day': {
      split: 'Leg Day',
      badgeTag: 'LEG DAY',
      title: 'Leg Day',
      subtitle: "This is today's scheduled workout. Complete it to earn +50 XP.",
      defaultView: 'quads',
      views: {
        quads: {
          id: 'quads',
          label: 'Quads',
          image: 'assets/workout-legs.jpg',
          ctaText: 'Start Leg Workout',
          exerciseHeader: 'EXERCISES (LOWER BODY)',
          targetMuscle: {
            name: 'Quadriceps & Gluteus',
            role: 'Primary Compound Target',
            icon: 'assets/target-lat.png'
          },
          exercises: [
            { id: 'l1', name: 'Barbell Back Squat', setsReps: '4 sets · 6–8 reps', thumb: 'assets/pull-up.png' },
            { id: 'l2', name: 'Leg Press (Heavy)', setsReps: '3 sets · 10–12 reps', thumb: 'assets/lat-pulldown.png' },
            { id: 'l3', name: 'Bulgarian Split Squat', setsReps: '3 sets · 8–10 reps', thumb: 'assets/seated-cable-row.png' },
            { id: 'l4', name: 'Leg Extensions', setsReps: '3 sets · 12–15 reps', thumb: 'assets/dumbbell-row.png' },
            { id: 'l5', name: 'Standing Calf Raise', setsReps: '4 sets · 15–20 reps', thumb: 'assets/face-pull.png' }
          ]
        },
        hamstrings: {
          id: 'hamstrings',
          label: 'Posterior',
          image: 'assets/workout-legs.jpg',
          ctaText: 'Start Hamstring Workout',
          exerciseHeader: 'EXERCISES (HAMSTRINGS & GLUTES)',
          targetMuscle: {
            name: 'Hamstrings & Posterior Chain',
            role: 'Hip Hinge & Knee Flexion',
            icon: 'assets/target-biceps.png'
          },
          exercises: [
            { id: 'h1', name: 'Romanian Deadlift (RDL)', setsReps: '4 sets · 8–10 reps', thumb: 'assets/pull-up.png' },
            { id: 'h2', name: 'Lying Leg Curl', setsReps: '4 sets · 10–12 reps', thumb: 'assets/lat-pulldown.png' },
            { id: 'h3', name: 'Barbell Hip Thrust', setsReps: '3 sets · 10–12 reps', thumb: 'assets/seated-cable-row.png' },
            { id: 'h4', name: 'Seated Leg Curl', setsReps: '3 sets · 12–15 reps', thumb: 'assets/dumbbell-row.png' },
            { id: 'h5', name: 'Seated Calf Raise', setsReps: '4 sets · 15–20 reps', thumb: 'assets/face-pull.png' }
          ]
        }
      }
    },

    'Rest': {
      split: 'Rest',
      badgeTag: 'REST & RECOVERY',
      title: 'Rest Day',
      subtitle: 'Rest and recover. Saturday and Sunday do not count as workout days.',
      defaultView: 'recovery',
      views: {
        recovery: {
          id: 'recovery',
          label: 'Rest',
          image: 'assets/workout-rest.jpg',
          ctaText: 'Log Recovery Day',
          exerciseHeader: 'RECOVERY PROTOCOL',
          targetMuscle: {
            name: 'Full Body Recovery',
            role: 'CNS Decompression & Tissue Repair',
            icon: 'assets/target-lat.png'
          },
          exercises: [
            { id: 'r1', name: 'Zone 1 Light Walking', setsReps: '20–30 mins · Casual Pace', thumb: 'assets/pull-up.png' },
            { id: 'r2', name: 'Full Body Mobility & Foam Roll', setsReps: '15 mins · Hip & Thoracic Focus', thumb: 'assets/lat-pulldown.png' },
            { id: 'r3', name: 'Hydration Target (3.0L Water)', setsReps: 'Full Day · Electrolyte Support', thumb: 'assets/seated-cable-row.png' },
            { id: 'r4', name: 'Target 8+ Hours Sleep', setsReps: 'Restorative Sleep Cycle', thumb: 'assets/face-pull.png' }
          ]
        }
      }
    }
  };

  const getRoutineForSplit = (splitName) => {
    return WORKOUT_ROUTINES_DATA[splitName] || WORKOUT_ROUTINES_DATA['Back + Biceps'];
  };

  const getScheduleForDay = (dayIndex) => {
    return WEEKLY_SCHEDULE[dayIndex] || 'Rest';
  };

  window.DEQX = window.DEQX || {};
  window.DEQX.data = window.DEQX.data || {};
  window.DEQX.data.routines = {
    WORKOUT_SPLITS,
    WEEKLY_SCHEDULE,
    WORKOUT_ROUTINES_DATA,
    getRoutineForSplit,
    getScheduleForDay
  };

  // Global backward compatibility
  window.WORKOUT_SPLITS = WORKOUT_SPLITS;
  window.WEEKLY_SCHEDULE = WEEKLY_SCHEDULE;
  window.WORKOUT_ROUTINES_DATA = WORKOUT_ROUTINES_DATA;
  window.getRoutineForSplit = getRoutineForSplit;
  window.getScheduleForDay = getScheduleForDay;

})(window);
