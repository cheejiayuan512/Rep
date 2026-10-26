/**
 * Detect a workout CSV (Hevy, Strong, Jefit, FitNotes) and parse it into the
 * same finished-session shape Hevy already uses. Name matching and custom
 * exercise creation stay in one place. Column names follow public exports;
 * tweak parsers when real sample files land.
 */
import {
  cleanWorkoutTitle,
  displayNameForCustom,
  guessEquipment,
  guessMuscleGroup,
  mapSetType,
  matchHevyExercise,
  parseCsv,
  parseHevyCsv,
  parseOptionalNumber,
  parseOptionalRpe,
  type HevyImportExercise,
  type HevyImportExerciseRef,
  type HevyImportSet,
  type HevyImportWorkout,
  type HevyParseResult,
} from './hevy-import';
import { displayToKg } from './units';
import type { WeightUnit } from './types';

export type LogExportKind = 'hevy' | 'strong' | 'jefit' | 'fitnotes';

export const LOG_EXPORT_LABEL: Record<LogExportKind, string> = {
  fitnotes: 'FitNotes',
  hevy: 'Hevy',
  jefit: 'Jefit',
  strong: 'Strong',
};

export interface LogParseResult extends HevyParseResult {
  source: LogExportKind;
}

export function parseLogCsv(csvText: string, library: HevyImportExerciseRef[]): LogParseResult {
  const source = detectLogExport(csvText);
  if (source === 'hevy') {
    return { ...parseHevyCsv(csvText, library), source };
  }
  if (source === 'strong') {
    return { ...parseStrongCsv(csvText, library), source };
  }
  if (source === 'jefit') {
    return { ...parseJefitCsv(csvText, library), source };
  }
  return { ...parseFitNotesCsv(csvText, library), source };
}

export function detectLogExport(csvText: string): LogExportKind {
  const header = headerCells(csvText);
  if (header.length === 0) {
    throw new Error('The file is empty.');
  }
  if (hasAll(header, ['exercise_title', 'start_time'])) {
    return 'hevy';
  }
  if (hasAny(header, ['weight (kgs)', 'weight (lbs)', 'weight (kg)', 'weight (lb)']) && hasAll(header, ['exercise', 'date'])) {
    return 'fitnotes';
  }
  if (hasAll(header, ['exercise name', 'set order']) && (hasAny(header, ['workout notes', 'seconds', 'weight unit']) || hasAll(header, ['workout name', 'date']))) {
    return 'strong';
  }
  if (hasAny(header, ['exercise name', 'exercise']) && hasAny(header, ['date', 'day']) && hasAny(header, ['reps', 'repetitions'])) {
    return 'jefit';
  }
  throw new Error('This does not look like a Hevy, Strong, Jefit, or FitNotes export. Export a workout CSV from one of those apps, then try again.');
}

function headerCells(csvText: string): string[] {
  const line = csvText.split(/\r?\n/).find((row) => row.trim() !== '') ?? '';
  const parsed = parseCsv(line)[0] ?? [];
  return parsed.map((cell) => normalizeHeader(cell));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasAll(header: string[], names: string[]): boolean {
  return names.every((name) => header.includes(name));
}

function hasAny(header: string[], names: string[]): boolean {
  return names.some((name) => header.includes(name));
}

function columnMap(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((name, index) => {
    if (!map.has(name)) {
      map.set(name, index);
    }
  });
  return map;
}

function cell(row: string[], columns: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const index = columns.get(name);
    if (index != null) {
      return (row[index] ?? '').trim();
    }
  }
  return '';
}

function parseStrongCsv(csvText: string, library: HevyImportExerciseRef[]): HevyParseResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('The Strong file is empty.');
  }
  const header = rows[0].map(normalizeHeader);
  const columns = columnMap(header);
  if (columns.get('exercise name') == null || columns.get('date') == null) {
    throw new Error('This does not look like a Strong workout export. Export workouts as CSV from Strong, then try again.');
  }

  return parseSetRows(
    rows.slice(1),
    (row) => ({
      date: cell(row, columns, 'date'),
      duration: cell(row, columns, 'duration'),
      exercise: cell(row, columns, 'exercise name'),
      notes: cell(row, columns, 'notes'),
      reps: cell(row, columns, 'reps'),
      rpe: cell(row, columns, 'rpe'),
      setOrder: cell(row, columns, 'set order'),
      weight: cell(row, columns, 'weight'),
      weightUnit: cell(row, columns, 'weight unit'),
      workoutName: cell(row, columns, 'workout name'),
      workoutNotes: cell(row, columns, 'workout notes'),
    }),
    library,
    { defaultName: 'Workout', skipDistanceOnly: true },
  );
}

function parseJefitCsv(csvText: string, library: HevyImportExerciseRef[]): HevyParseResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('The Jefit file is empty.');
  }
  const header = rows[0].map(normalizeHeader);
  const columns = columnMap(header);
  if (columns.get('exercise name') == null && columns.get('exercise') == null) {
    throw new Error('This does not look like a Jefit workout export. Export a CSV from Jefit, then try again.');
  }

  return parseSetRows(
    rows.slice(1),
    (row) => ({
      date: cell(row, columns, 'date', 'day', 'workout date'),
      duration: cell(row, columns, 'duration', 'time'),
      exercise: cell(row, columns, 'exercise name', 'exercise'),
      notes: cell(row, columns, 'notes', 'note', 'comment'),
      reps: cell(row, columns, 'reps', 'repetitions'),
      rpe: cell(row, columns, 'rpe'),
      setOrder: cell(row, columns, 'set order', 'set', 'set #', 'set number'),
      weight: cell(row, columns, 'weight', 'weight (lbs)', 'weight (kgs)', 'weight (lb)', 'weight (kg)'),
      weightUnit: cell(row, columns, 'weight unit', 'unit'),
      workoutName: cell(row, columns, 'workout name', 'workout'),
      workoutNotes: '',
    }),
    library,
    { defaultName: 'Jefit workout', skipDistanceOnly: true },
  );
}

function parseFitNotesCsv(csvText: string, library: HevyImportExerciseRef[]): HevyParseResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('The FitNotes file is empty.');
  }
  const header = rows[0].map(normalizeHeader);
  const columns = columnMap(header);
  const kgColumn = header.includes('weight (kgs)') || header.includes('weight (kg)');
  const lbColumn = header.includes('weight (lbs)') || header.includes('weight (lb)');
  if (columns.get('exercise') == null || columns.get('date') == null || (!kgColumn && !lbColumn && columns.get('weight') == null)) {
    throw new Error('This does not look like a FitNotes export. Export the log as CSV from FitNotes, then try again.');
  }

  return parseSetRows(
    rows.slice(1),
    (row) => ({
      date: cell(row, columns, 'date'),
      duration: cell(row, columns, 'time'),
      exercise: cell(row, columns, 'exercise'),
      notes: cell(row, columns, 'comment', 'notes'),
      reps: cell(row, columns, 'reps'),
      rpe: '',
      setOrder: '',
      weight: cell(row, columns, 'weight (kgs)', 'weight (kg)', 'weight (lbs)', 'weight (lb)', 'weight'),
      weightUnit: kgColumn ? 'kg' : lbColumn ? 'lb' : cell(row, columns, 'weight unit'),
      workoutName: '',
      workoutNotes: '',
    }),
    library,
    { defaultName: 'FitNotes', skipDistanceOnly: true },
  );
}

interface MappedRow {
  date: string;
  duration: string;
  exercise: string;
  notes: string;
  reps: string;
  rpe: string;
  setOrder: string;
  weight: string;
  weightUnit: string;
  workoutName: string;
  workoutNotes: string;
}

function parseSetRows(
  rows: string[][],
  read: (row: string[]) => MappedRow,
  library: HevyImportExerciseRef[],
  options: { defaultName: string; skipDistanceOnly: boolean },
): HevyParseResult {
  const unknownSetTypes = new Set<string>();
  let skippedCardioRows = 0;
  const groups = new Map<string, { startedAt: number; finishedAt: number; name: string; description: string; rows: MappedRow[] }>();

  for (const raw of rows) {
    if (!raw.some((cell) => cell.trim() !== '')) {
      continue;
    }
    const row = read(raw);
    if (!row.exercise || !row.date) {
      continue;
    }
    const startedAt = parseFlexibleDate(row.date);
    if (startedAt == null) {
      continue;
    }
    const durationMs = parseDurationMs(row.duration);
    const finishedAt = startedAt + (durationMs ?? 45 * 60 * 1000);
    const name = row.workoutName.trim() ? cleanWorkoutTitle(row.workoutName) : options.defaultName;
    const key = `${name}\0${startedAt}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
      if (finishedAt > existing.finishedAt) {
        existing.finishedAt = finishedAt;
      }
    } else {
      groups.set(key, { description: row.workoutNotes.trim(), finishedAt, name, rows: [row], startedAt });
    }
  }

  const workouts: HevyImportWorkout[] = [];
  for (const group of groups.values()) {
    const exerciseOrder: string[] = [];
    const byExercise = new Map<string, MappedRow[]>();
    for (const row of group.rows) {
      const existing = byExercise.get(row.exercise);
      if (existing) {
        existing.push(row);
      } else {
        byExercise.set(row.exercise, [row]);
        exerciseOrder.push(row.exercise);
      }
    }

    const exercises: HevyImportExercise[] = [];
    exerciseOrder.forEach((title, position) => {
      const setRows = byExercise.get(title) ?? [];
      const notes = (setRows.find((row) => row.notes.trim() !== '')?.notes ?? '').slice(0, 500);
      const sets: HevyImportSet[] = [];
      for (const row of setRows) {
        const setType = mapImportedSetType(row.setOrder);
        if (setType == null) {
          if (row.setOrder.trim()) {
            unknownSetTypes.add(row.setOrder.trim().toLowerCase());
          }
          continue;
        }
        const reps = parseOptionalNumber(row.reps);
        const weightKg = parseImportedWeight(row.weight, row.weightUnit);
        if (options.skipDistanceOnly && reps == null && weightKg == null) {
          skippedCardioRows += 1;
          continue;
        }
        sets.push({
          completed: true,
          position: sets.length,
          reps,
          rpe: parseOptionalRpe(row.rpe),
          setType,
          weightKg,
        });
      }
      if (sets.length === 0) {
        return;
      }
      const match = matchHevyExercise(title, library);
      exercises.push({
        createCustom: match.exerciseId
          ? null
          : {
              equipment: guessEquipment(title),
              muscleGroup: guessMuscleGroup(title),
              name: displayNameForCustom(title),
            },
        matchedExerciseId: match.exerciseId,
        name: match.exerciseId ? match.name : displayNameForCustom(title),
        notes,
        position,
        sets,
      });
    });
    if (exercises.length === 0) {
      continue;
    }
    workouts.push({
      description: group.description,
      exercises,
      finishedAt: group.finishedAt,
      name: group.name,
      startedAt: group.startedAt,
    });
  }

  workouts.sort((left, right) => right.startedAt - left.startedAt);
  return { skippedCardioRows, unknownSetTypes: [...unknownSetTypes].sort(), workouts };
}

function mapImportedSetType(setOrder: string): 'normal' | 'warmup' | null {
  const mapped = mapSetType(setOrder);
  if (mapped != null) {
    return mapped;
  }
  const normalized = setOrder.trim().toLowerCase();
  if (normalized === '' || /^\d+$/.test(normalized)) {
    return 'normal';
  }
  if (normalized === 'w' || normalized.startsWith('w')) {
    return 'warmup';
  }
  return null;
}

function parseImportedWeight(value: string, unitText: string): number | null {
  const amount = parseOptionalNumber(value);
  if (amount == null) {
    return null;
  }
  const unit = parseWeightUnit(unitText);
  return Math.round(displayToKg(amount, unit) * 100) / 100;
}

function parseWeightUnit(value: string): WeightUnit {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'lb' || normalized === 'lbs' || normalized === 'pound' || normalized === 'pounds') {
    return 'lb';
  }
  return 'kg';
}

export function parseFlexibleDate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    const hour = iso[4] ? Number(iso[4]) : 12;
    const minute = iso[5] ? Number(iso[5]) : 0;
    const second = iso[6] ? Number(iso[6]) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (us) {
    const month = Number(us[1]) - 1;
    const day = Number(us[2]);
    const year = Number(us[3]);
    let hour = us[4] ? Number(us[4]) : 12;
    const minute = us[5] ? Number(us[5]) : 0;
    const second = us[6] ? Number(us[6]) : 0;
    const meridem = us[7]?.toUpperCase();
    if (meridem === 'PM' && hour < 12) {
      hour += 12;
    }
    if (meridem === 'AM' && hour === 12) {
      hour = 0;
    }
    return new Date(year, month, day, hour, minute, second).getTime();
  }
  const fallback = Date.parse(trimmed);
  return Number.isFinite(fallback) ? fallback : null;
}

function parseDurationMs(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const hours = trimmed.match(/(\d+)\s*h/);
  const minutes = trimmed.match(/(\d+)\s*m/);
  const seconds = trimmed.match(/(\d+)\s*s/);
  if (hours || minutes || seconds) {
    return ((hours ? Number(hours[1]) : 0) * 3600 + (minutes ? Number(minutes[1]) : 0) * 60 + (seconds ? Number(seconds[1]) : 0)) * 1000;
  }
  const asNumber = parseOptionalNumber(trimmed);
  if (asNumber != null && asNumber > 0) {
    return asNumber < 24 ? asNumber * 3600 * 1000 : asNumber * 1000;
  }
  return null;
}
