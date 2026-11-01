import { readFileSync } from 'node:fs';

import { loadStoredDocument } from '../src/data/database';
import { readBackupDocument } from '../src/domain/log-backup';

const db = loadStoredDocument(readBackupDocument(readFileSync('./fixtures/Rep-demo-log.json', 'utf8'))).database;

function vol(workoutId: string): number {
  let total = 0;
  for (const exercise of db.workoutExercises.filter((row) => row.workoutId === workoutId)) {
    for (const set of db.sets.filter((row) => row.workoutExerciseId === exercise.id && row.completed && row.setType !== 'warmup')) {
      if (set.weightKg != null && set.reps != null) {
        total += set.weightKg * set.reps;
      }
    }
  }
  return total;
}

const finished = db.workouts.filter((workout) => workout.finishedAt != null).sort((left, right) => (left.finishedAt ?? 0) - (right.finishedAt ?? 0));
const volumes = finished.map((workout) => ({ name: workout.name, vol: Math.round(vol(workout.id)) }));
const last = volumes[volumes.length - 1];
const bestPrev = Math.max(...volumes.slice(0, -1).map((row) => row.vol));
console.log({ last, bestPrev, volumePR: (last?.vol ?? 0) > bestPrev, top: volumes.slice(-4) });
