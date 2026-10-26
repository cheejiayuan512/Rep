/**
 * Workout history as a Strong CSV. Weight is kilograms, which is what a
 * re-import assumes when the file has no unit column. Rest rows use Strong's
 * "Rest Timer" set order so the same file can be read back.
 */
import type { SetType } from './types';
import { setTypeMark } from './types';

export interface ExportSet {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface ExportExercise {
  name: string;
  notes: string;
  restSeconds: number | null;
  sets: ExportSet[];
}

export interface ExportWorkout {
  name: string;
  startedAt: number;
  finishedAt: number;
  exercises: ExportExercise[];
}

const HEADER = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];

export function workoutsToCsv(workouts: ExportWorkout[]): string {
  const lines = [HEADER.join(',')];
  const ordered = [...workouts].sort((left, right) => left.startedAt - right.startedAt);
  for (const workout of ordered) {
    const date = formatExportDate(workout.startedAt);
    const duration = formatExportDuration(workout.startedAt, workout.finishedAt);
    for (const exercise of workout.exercises) {
      let working = 0;
      let notesUsed = false;
      const logged = exercise.sets.filter((set) => set.completed && ((set.reps ?? 0) > 0 || set.weightKg != null));
      for (const set of logged) {
        if (set.setType !== 'warmup') {
          working += 1;
        }
        const mark = setTypeMark(set.setType);
        const order = mark ?? String(working);
        const exerciseNotes = exercise.notes.trim();
        const noteText = !notesUsed && exerciseNotes.length > 0 ? exerciseNotes : '';
        if (noteText.length > 0) {
          notesUsed = true;
        }
        lines.push(
          row([
            date,
            workout.name,
            duration,
            exercise.name,
            order,
            set.weightKg == null ? '' : set.weightKg.toFixed(1),
            set.reps == null ? '' : String(set.reps),
            '0',
            '0',
            noteText,
            '',
            set.rpe == null ? '' : String(set.rpe),
          ]),
        );
        if (exercise.restSeconds != null && exercise.restSeconds > 0) {
          lines.push(row([date, workout.name, duration, exercise.name, 'Rest Timer', '0', '0', '0', String(exercise.restSeconds), '', '', '']));
        }
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

function row(cells: Array<string | number>): string {
  return cells.map(csvCell).join(',');
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatExportDate(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Strong's duration words: "25s", "45m", "1h 2m". */
export function formatExportDuration(start: number, end: number): string {
  const total = Math.max(0, Math.round((end - start) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
