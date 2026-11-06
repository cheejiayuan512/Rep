/**
 * Builds an impressive demo log as a Rep backup file for App Store screenshots.
 * Run: npx tsx scripts/seed-demo-log.ts
 * Restore: Profile → Settings → Restore backup → fixtures/Rep-demo-log.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { seedExercises } from '../src/data/seed-exercises';
import type { DatabaseShape, StoredRoutineExercise, StoredRoutineSet, StoredSet, StoredWorkoutExercise } from '../src/data/database';
import { encodeBackup } from '../src/domain/log-backup';
import type { CableAttachment, SetType } from '../src/domain/types';

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0); // 1 Nov 2026 noon UTC
const DAY = 24 * 60 * 60 * 1000;
const OUT = resolve(__dirname, '../fixtures/Rep-demo-log.json');

type PlannedSet = {
  setType?: SetType;
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  durationSeconds?: number | null;
  distanceKm?: number | null;
};

type PlannedExercise = {
  exerciseId: string;
  notes?: string;
  restSeconds?: number | null;
  attachment?: CableAttachment | null;
  machineSetup?: string | null;
  sets: PlannedSet[];
  /** When set, groups with the next planned exercise that shares the same id. */
  supersetId?: string | null;
};

type PlannedWorkout = {
  id: string;
  name: string;
  daysAgo: number;
  hour: number;
  durationMin: number;
  routineId?: string | null;
  exercises: PlannedExercise[];
};

function id(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

function working(weightKg: number, reps: number, rpe: number | null = null): PlannedSet {
  return { setType: 'normal', weightKg, reps, rpe };
}

function warmup(weightKg: number, reps: number): PlannedSet {
  return { setType: 'warmup', weightKg, reps, rpe: null };
}

function drop(weightKg: number, reps: number, rpe: number | null = 9): PlannedSet {
  return { setType: 'drop', weightKg, reps, rpe };
}

function failure(weightKg: number, reps: number): PlannedSet {
  return { setType: 'failure', weightKg, reps, rpe: 10 };
}

function cardio(durationSeconds: number, distanceKm: number): PlannedSet {
  return { setType: 'normal', weightKg: null, reps: null, durationSeconds, distanceKm, rpe: null };
}

/** Progressive load helper: week 0 light → later weeks heavier. */
function load(base: number, week: number, step = 2.5): number {
  return Math.round((base + week * step) * 4) / 4;
}

function buildWorkouts(): PlannedWorkout[] {
  const workouts: PlannedWorkout[] = [];
  let n = 1;

  // 10 weeks of push / pull / legs, ending ~9 days ago so recent specialty sessions stay newest.
  for (let week = 0; week <= 9; week += 1) {
    const pushDay = 76 - week * 7;
    const pullDay = 74 - week * 7;
    const legsDay = 72 - week * 7;

    workouts.push({
      id: id('w', n++),
      name: 'Push',
      daysAgo: pushDay,
      hour: 18,
      durationMin: 62 + (week % 3) * 4,
      routineId: 'routine-push',
      exercises: [
        {
          exerciseId: 'barbell-bench-press',
          notes: week >= 8 ? 'Paused first rep' : '',
          restSeconds: 180,
          sets: [
            warmup(load(40, week, 0), 8),
            warmup(load(60, week, 1.25), 5),
            working(load(80, week), 8, 7),
            working(load(80, week), 8, 7.5),
            working(load(80, week), 7, 8),
            ...(week >= 9 ? [drop(load(60, week, 0), 10)] : []),
          ],
        },
        {
          exerciseId: 'incline-dumbbell-press',
          restSeconds: 120,
          sets: [working(load(28, week, 1), 10, 7), working(load(28, week, 1), 10, 8), working(load(28, week, 1), 9, 8.5)],
        },
        {
          exerciseId: 'cable-fly',
          attachment: 'Single handle',
          machineSetup: 'Life Fitness',
          restSeconds: 90,
          sets: [working(load(12.5, week, 1.25), 12, 7), working(load(12.5, week, 1.25), 12, 8), working(load(15, week, 1.25), 10, 8.5)],
        },
        {
          exerciseId: 'overhead-press',
          restSeconds: 150,
          sets: [
            warmup(load(30, week, 0), 6),
            working(load(50, week, 1.25), 8, 7.5),
            working(load(50, week, 1.25), 7, 8),
            working(load(50, week, 1.25), 6, 8.5),
          ],
        },
        {
          exerciseId: 'lateral-raise',
          restSeconds: 60,
          sets: [working(load(10, week, 0.5), 15, 7), working(load(10, week, 0.5), 14, 8), failure(load(8, week, 0), 12)],
        },
        {
          exerciseId: 'triceps-pushdown',
          attachment: 'Rope',
          machineSetup: 'Precor',
          restSeconds: 75,
          sets: [working(load(25, week, 1.25), 12, 7), working(load(25, week, 1.25), 11, 8), drop(load(17.5, week, 0), 12)],
        },
      ],
    });

    workouts.push({
      id: id('w', n++),
      name: 'Pull',
      daysAgo: pullDay,
      hour: 17,
      durationMin: 58 + (week % 2) * 5,
      routineId: 'routine-pull',
      exercises: [
        {
          exerciseId: 'deadlift',
          notes: week === 10 ? 'Belt on top set' : '',
          restSeconds: 210,
          sets: [
            warmup(load(60, week, 0), 5),
            warmup(load(90, week, 2.5), 3),
            working(load(120, week, 2.5), 5, 7.5),
            working(load(120, week, 2.5), 5, 8),
            working(load(120, week, 2.5), 4, 8.5),
          ],
        },
        {
          exerciseId: 'pull-up',
          restSeconds: 120,
          sets: [working(0, 8 + Math.min(week, 4), 8), working(0, 7 + Math.min(week, 3), 8.5), working(0, 6 + Math.min(week, 2), 9)],
        },
        {
          exerciseId: 'barbell-row',
          restSeconds: 120,
          sets: [working(load(70, week, 2.5), 8, 7), working(load(70, week, 2.5), 8, 8), working(load(70, week, 2.5), 7, 8.5)],
        },
        {
          exerciseId: 'lat-pulldown',
          attachment: 'Lat bar',
          machineSetup: 'Life Fitness',
          restSeconds: 90,
          sets: [working(load(55, week, 2.5), 10, 7), working(load(55, week, 2.5), 10, 8), working(load(55, week, 2.5), 9, 8.5)],
        },
        {
          exerciseId: 'face-pull',
          attachment: 'Rope',
          machineSetup: 'Life Fitness',
          restSeconds: 60,
          sets: [working(load(20, week, 1.25), 15, 7), working(load(20, week, 1.25), 15, 7.5), working(load(22.5, week, 1.25), 12, 8)],
        },
        {
          exerciseId: 'cable-curl',
          attachment: 'Straight bar',
          machineSetup: 'Precor',
          restSeconds: 75,
          sets: [working(load(22.5, week, 1.25), 12, 7), working(load(22.5, week, 1.25), 11, 8), drop(load(15, week, 0), 14)],
        },
      ],
    });

    workouts.push({
      id: id('w', n++),
      name: 'Legs',
      daysAgo: legsDay,
      hour: 10,
      durationMin: 70 + (week % 3) * 3,
      routineId: 'routine-legs',
      exercises: [
        {
          exerciseId: 'back-squat',
          notes: week >= 7 ? 'Depth to parallel' : '',
          restSeconds: 180,
          sets: [
            warmup(load(40, week, 0), 8),
            warmup(load(70, week, 2.5), 5),
            working(load(100, week, 2.5), 6, 7.5),
            working(load(100, week, 2.5), 6, 8),
            working(load(100, week, 2.5), 5, 8.5),
          ],
        },
        {
          exerciseId: 'romanian-deadlift',
          restSeconds: 150,
          sets: [working(load(80, week, 2.5), 8, 7), working(load(80, week, 2.5), 8, 8), working(load(80, week, 2.5), 7, 8.5)],
        },
        {
          exerciseId: 'leg-press',
          machineSetup: 'Hammer Strength',
          restSeconds: 120,
          sets: [working(load(160, week, 5), 12, 7), working(load(160, week, 5), 11, 8), working(load(160, week, 5), 10, 8.5)],
        },
        {
          exerciseId: 'bulgarian-split-squat',
          restSeconds: 90,
          sets: [working(load(20, week, 1), 10, 7.5), working(load(20, week, 1), 10, 8), working(load(20, week, 1), 9, 8.5)],
        },
        {
          exerciseId: 'hip-thrust',
          restSeconds: 90,
          sets: [working(load(90, week, 2.5), 10, 7), working(load(90, week, 2.5), 10, 8), working(load(90, week, 2.5), 9, 8.5)],
        },
      ],
    });
  }

  // Extra variety near the end of the log.
  workouts.push({
    id: id('w', n++),
    name: 'Upper',
    daysAgo: 4,
    hour: 19,
    durationMin: 55,
    exercises: [
      {
        exerciseId: 'dumbbell-shoulder-press',
        restSeconds: 120,
        sets: [working(28, 10, 7), working(28, 9, 8), working(26, 10, 8.5)],
      },
      {
        exerciseId: 'cable-crossover',
        attachment: 'Single handle',
        machineSetup: 'Life Fitness',
        restSeconds: 75,
        sets: [working(15, 12, 7), working(15, 12, 8), working(17.5, 10, 8.5)],
      },
      {
        exerciseId: 'cable-fly',
        attachment: 'Rope',
        machineSetup: 'Life Fitness',
        notes: 'High to low with rope',
        restSeconds: 75,
        sets: [working(20, 12, 7), working(20, 11, 8), working(22.5, 10, 8.5)],
      },
      {
        exerciseId: 'chin-up',
        restSeconds: 120,
        sets: [working(0, 8, 8), working(0, 7, 8.5), working(0, 6, 9)],
      },
      {
        exerciseId: 'incline-dumbbell-curl',
        restSeconds: 75,
        sets: [working(14, 12, 7), working(14, 11, 8), drop(10, 12)],
      },
      {
        exerciseId: 'overhead-cable-extension',
        attachment: 'Rope',
        machineSetup: 'Precor',
        restSeconds: 75,
        sets: [working(22.5, 12, 7), working(22.5, 11, 8), working(25, 10, 8.5)],
      },
    ],
  });

  workouts.push({
    id: id('w', n++),
    name: 'Conditioning',
    daysAgo: 3,
    hour: 7,
    durationMin: 40,
    exercises: [
      {
        exerciseId: 'running',
        notes: 'Easy aerobic',
        restSeconds: null,
        sets: [cardio(28 * 60, 5.2)],
      },
      {
        exerciseId: 'rowing',
        restSeconds: null,
        sets: [cardio(12 * 60, 2.4)],
      },
    ],
  });

  // Volume PR session: heaviest total working volume in the log.
  workouts.push({
    id: id('w', n++),
    name: 'Evening Chest and Back',
    daysAgo: 1,
    hour: 18,
    durationMin: 88,
    exercises: [
      {
        exerciseId: 'barbell-bench-press',
        notes: 'Felt strong — paused doubles',
        restSeconds: 180,
        sets: [warmup(40, 8), warmup(70, 5), working(105, 5, 7.5), working(105, 5, 8), working(105, 5, 8.5), working(95, 8, 8), working(85, 10, 8)],
      },
      {
        exerciseId: 'barbell-row',
        restSeconds: 150,
        sets: [working(100, 8, 7.5), working(100, 8, 8), working(100, 8, 8.5), working(90, 10, 8), working(80, 12, 8)],
      },
      {
        exerciseId: 'incline-barbell-bench-press',
        restSeconds: 150,
        sets: [working(75, 8, 7), working(75, 8, 8), working(75, 8, 8.5), working(65, 10, 8)],
      },
      {
        exerciseId: 'lat-pulldown',
        attachment: 'Lat bar',
        machineSetup: 'Life Fitness',
        restSeconds: 90,
        sets: [working(75, 10, 7), working(75, 10, 8), working(75, 10, 8.5), working(65, 12, 8)],
      },
      {
        exerciseId: 'leg-press',
        machineSetup: 'Hammer Strength',
        notes: 'Finisher for volume',
        restSeconds: 120,
        sets: [working(200, 12, 7), working(200, 12, 8), working(200, 12, 8.5), working(180, 15, 8)],
      },
      {
        exerciseId: 'cable-fly',
        attachment: 'Single handle',
        machineSetup: 'Life Fitness',
        restSeconds: 75,
        sets: [working(20, 12, 7), working(20, 12, 8), working(22.5, 10, 8.5)],
      },
      {
        exerciseId: 'face-pull',
        attachment: 'Rope',
        machineSetup: 'Life Fitness',
        restSeconds: 60,
        sets: [working(25, 15, 7), working(25, 15, 8), working(27.5, 12, 8.5)],
      },
      {
        exerciseId: 'cable-curl',
        attachment: 'Straight bar',
        machineSetup: 'Precor',
        restSeconds: 60,
        sets: [working(30, 12, 7), working(30, 11, 8), drop(20, 14)],
      },
      {
        exerciseId: 'triceps-pushdown',
        attachment: 'Rope',
        machineSetup: 'Precor',
        restSeconds: 60,
        sets: [working(32.5, 12, 7), working(32.5, 11, 8), drop(22.5, 15)],
      },
    ],
  });

  // In-progress session for the active-workout / widget screenshots.
  workouts.push({
    id: id('w', n++),
    name: 'Push',
    daysAgo: 0,
    hour: 18,
    durationMin: 35,
    routineId: 'routine-push',
    exercises: [
      {
        exerciseId: 'barbell-bench-press',
        notes: 'Paused reps',
        restSeconds: 180,
        sets: [warmup(40, 8), warmup(70, 5), working(110, 6, 7.5), working(110, 6, null), working(110, 6, null)],
      },
      {
        exerciseId: 'incline-dumbbell-press',
        restSeconds: 120,
        sets: [working(30, 10, null), working(30, 10, null), working(30, 10, null)],
      },
      {
        exerciseId: 'cable-fly',
        attachment: 'Single handle',
        machineSetup: 'Life Fitness',
        restSeconds: 90,
        sets: [working(15, 12, null), working(15, 12, null), working(15, 12, null)],
      },
      {
        exerciseId: 'overhead-press',
        restSeconds: 150,
        sets: [warmup(30, 6), working(55, 6, null), working(55, 6, null), working(55, 6, null)],
      },
      {
        exerciseId: 'lateral-raise',
        restSeconds: 60,
        sets: [working(12, 15, null), working(12, 15, null), working(12, 15, null)],
      },
      {
        exerciseId: 'triceps-pushdown',
        attachment: 'Rope',
        machineSetup: 'Precor',
        restSeconds: 75,
        sets: [working(27.5, 12, null), working(27.5, 12, null), working(27.5, 12, null)],
      },
    ],
  });

  return workouts;
}

function addRoutine(db: DatabaseShape, routineId: string, name: string, createdAt: number, plan: PlannedExercise[]): void {
  db.routines.push({ id: routineId, name, createdAt, updatedAt: createdAt });
  plan.forEach((exercise, position) => {
    const routineExerciseId = `${routineId}-ex-${position}`;
    const row: StoredRoutineExercise = {
      attachment: exercise.attachment ?? null,
      exerciseId: exercise.exerciseId,
      id: routineExerciseId,
      machineSetup: exercise.machineSetup ?? null,
      position,
      routineId,
      supersetId: exercise.supersetId ?? null,
      updatedAt: createdAt,
    };
    db.routineExercises.push(row);
    exercise.sets.forEach((set, setPosition) => {
      const routineSet: StoredRoutineSet = {
        distanceKm: set.distanceKm ?? null,
        durationSeconds: set.durationSeconds ?? null,
        id: `${routineExerciseId}-set-${setPosition}`,
        position: setPosition,
        reps: set.reps ?? null,
        routineExerciseId,
        setType: set.setType ?? 'normal',
        updatedAt: createdAt,
        weightKg: set.weightKg ?? null,
      };
      db.routineSets.push(routineSet);
    });
  });
}

function materializeWorkout(db: DatabaseShape, plan: PlannedWorkout, finished: boolean): void {
  const startedAt = NOW - plan.daysAgo * DAY + plan.hour * 60 * 60 * 1000;
  const finishedAt = finished ? startedAt + plan.durationMin * 60 * 1000 : null;
  db.workouts.push({
    finishedAt,
    id: plan.id,
    name: plan.name,
    routineId: plan.routineId ?? null,
    startedAt,
    updatedAt: finishedAt ?? startedAt,
  });

  plan.exercises.forEach((exercise, position) => {
    const workoutExerciseId = `${plan.id}-ex-${position}`;
    const row: StoredWorkoutExercise = {
      attachment: exercise.attachment ?? null,
      exerciseId: exercise.exerciseId,
      id: workoutExerciseId,
      machineSetup: exercise.machineSetup ?? null,
      notes: exercise.notes ?? '',
      position,
      restSeconds: exercise.restSeconds === undefined ? null : exercise.restSeconds,
      supersetId: exercise.supersetId ?? null,
      updatedAt: startedAt,
      workoutId: plan.id,
    };
    db.workoutExercises.push(row);

    exercise.sets.forEach((set, setPosition) => {
      const isCardio = set.durationSeconds != null || set.distanceKm != null;
      const completed = finished ? true : setPosition === 0 && position === 0 ? true : setPosition <= 1 && position === 0;
      const stored: StoredSet = {
        completed: finished ? true : Boolean(completed && !isCardio ? setPosition < 3 && position === 0 : false),
        distanceKm: set.distanceKm ?? null,
        durationSeconds: set.durationSeconds ?? null,
        id: `${workoutExerciseId}-set-${setPosition}`,
        position: setPosition,
        reps: set.reps ?? null,
        rpe: finished ? (set.rpe ?? null) : setPosition === 0 && position === 0 ? 7.5 : null,
        setType: set.setType ?? 'normal',
        updatedAt: startedAt,
        weightKg: set.weightKg ?? null,
        workoutExerciseId,
      };
      // In-progress: first working set checked on bench only (after warmups).
      if (!finished) {
        const isWarmup = (set.setType ?? 'normal') === 'warmup';
        stored.completed = position === 0 && !isWarmup && setPosition === 2;
        stored.rpe = stored.completed ? 7.5 : null;
      }
      db.sets.push(stored);
    });
  });
}

function buildDatabase(): DatabaseShape {
  const stamp = NOW - 80 * DAY;
  const db: DatabaseShape = {
    deletions: [],
    deviceId: 'demo-device-rep-screenshots',
    exercises: seedExercises.map((exercise) => ({
      attachment: exercise.attachment ?? null,
      equipment: exercise.equipment,
      id: exercise.id,
      isCustom: false,
      machineSetup:
        exercise.equipment === 'Cable' || exercise.equipment === 'Machine'
          ? exercise.id === 'leg-press'
            ? 'Hammer Strength'
            : exercise.id.includes('tricep') || exercise.id.includes('curl') || exercise.id === 'overhead-cable-extension'
              ? 'Precor'
              : 'Life Fitness'
          : null,
      muscleGroup: exercise.muscleGroup,
      name: exercise.name,
      updatedAt: stamp,
    })),
    routineExercises: [],
    routineSets: [],
    routines: [],
    schemaVersion: 2,
    sets: [],
    settings: {
      ageYears: 29,
      bodyweightKg: 82,
      seenWhatsNewId: 'demo',
      settingsUpdatedAt: {
        ageYears: stamp,
        bodyweightKg: stamp,
        seenWhatsNewId: stamp,
        sex: stamp,
        showRpe: stamp,
        tutorialSeen: stamp,
        warmupRestMultiplier: stamp,
        weightUnit: stamp,
      },
      sex: 'male',
      showRpe: true,
      tutorialSeen: true,
      warmupRestMultiplier: 0.5,
      weightUnit: 'kg',
    },
    workoutExercises: [],
    workouts: [],
  };

  const planned = buildWorkouts();
  const pushPlan = planned.find((workout) => workout.name === 'Push' && workout.daysAgo === 0)?.exercises ?? [];
  const pullPlan = [...planned].reverse().find((workout) => workout.name === 'Pull')?.exercises ?? [];
  const legsPlan = [...planned].reverse().find((workout) => workout.name === 'Legs')?.exercises ?? [];

  addRoutine(db, 'routine-push', 'Push Day', stamp, pushPlan);
  addRoutine(db, 'routine-pull', 'Pull Day', stamp + DAY, pullPlan);
  addRoutine(db, 'routine-legs', 'Legs Day', stamp + 2 * DAY, legsPlan);

  planned.forEach((workout, index) => {
    materializeWorkout(db, workout, index < planned.length - 1);
  });

  return db;
}

const database = buildDatabase();
const file = encodeBackup(database, NOW);
writeFileSync(OUT, file);
const finished = database.workouts.filter((workout) => workout.finishedAt != null).length;
console.log(`Wrote ${OUT}`);
console.log(`${finished} finished workouts, 1 in progress, ${database.routines.length} routines, ${database.sets.length} sets`);
