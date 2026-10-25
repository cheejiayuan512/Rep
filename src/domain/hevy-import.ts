/**
 * Parse a Hevy workout CSV export into finished Rep workouts.
 * Weight stays kilograms. Warmups stay warmups. Cardio rows without reps are skipped.
 */
import type { Equipment, MuscleGroup, SetType } from './types';
import { equipmentTypes, isEquipment } from './types';

export interface HevyImportExerciseRef {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
}

export interface HevyImportSet {
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface HevyImportExercise {
  name: string;
  notes: string;
  position: number;
  matchedExerciseId: string | null;
  createCustom: { name: string; muscleGroup: MuscleGroup; equipment: Equipment } | null;
  sets: HevyImportSet[];
}

export interface HevyImportWorkout {
  name: string;
  description: string;
  startedAt: number;
  finishedAt: number;
  exercises: HevyImportExercise[];
}

export interface HevyParseResult {
  workouts: HevyImportWorkout[];
  skippedCardioRows: number;
  unknownSetTypes: string[];
}

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const ALIASES: Record<string, string> = {
  'bench press barbell': 'barbell bench press',
  'incline bench press barbell': 'incline barbell bench press',
  'decline bench press barbell': 'decline barbell bench press',
  'squat barbell': 'back squat',
  'bent over row barbell': 'barbell row',
  'overhead press barbell': 'overhead press',
  'romanian deadlift barbell': 'romanian deadlift',
  'leg extension machine': 'leg extension',
  'seated leg curl machine': 'seated leg curl',
  'lateral raise machine': 'lateral raise',
  'hammer curl dumbbell': 'hammer curl',
  'seated incline curl dumbbell': 'incline dumbbell curl',
  'triceps rope pushdown': 'triceps pushdown',
  'chin up': 'chin up',
  'chin up weighted': 'chin up',
  'pull up': 'pull up',
  'pull up weighted': 'pull up',
  'sit up weighted': 'sit up',
  'pec deck fly': 'pec deck',
  'chest fly machine': 'machine fly',
  't bar row': 't bar row',
  'shrug barbell': 'barbell shrug',
  'shrug dumbbell': 'dumbbell shrug',
  'ez bar curl': 'ez bar curl',
  'front raise dumbbell': 'front raise',
  'seated row machine': 'machine row',
  'triceps extension machine': 'machine triceps extension',
  'nordic hamstring curl': 'nordic curl',
  'farmers walk': 'farmer carry',
  'reverse fly single arm cable': 'cable rear delt fly',
};

interface CsvRow {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercise_title: string;
  exercise_notes: string;
  set_index: string;
  set_type: string;
  weight_kg: string;
  reps: string;
  distance_km: string;
  duration_seconds: string;
  rpe: string;
}

export function parseHevyCsv(csvText: string, library: HevyImportExerciseRef[]): HevyParseResult {
  // Hevy dates look like "20 Oct 2026, 18:42". Unquoted exports split on that comma.
  const rows = parseCsv(quoteHevyDates(csvText));
  if (rows.length === 0) {
    throw new Error('The Hevy file is empty.');
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const index = columnIndex(header);
  if (index.title < 0 || index.start_time < 0 || index.exercise_title < 0) {
    throw new Error('This does not look like a Hevy workout export. Export workouts as CSV from Hevy, then try again.');
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));
  const parsedRows = dataRows.map((row) => readRow(row, index));
  const unknownSetTypes = new Set<string>();
  let skippedCardioRows = 0;

  const groups = new Map<string, { meta: CsvRow; rows: CsvRow[] }>();
  for (const row of parsedRows) {
    if (!row.title || !row.start_time || !row.exercise_title) {
      continue;
    }
    const key = `${row.title}\0${row.start_time}\0${row.end_time}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { meta: row, rows: [row] });
    }
  }

  const workouts: HevyImportWorkout[] = [];
  for (const group of groups.values()) {
    const startedAt = parseHevyDate(group.meta.start_time);
    const finishedAt = parseHevyDate(group.meta.end_time) ?? startedAt;
    if (startedAt == null) {
      continue;
    }

    const exerciseOrder: string[] = [];
    const byExercise = new Map<string, CsvRow[]>();
    for (const row of group.rows) {
      const key = row.exercise_title;
      const existing = byExercise.get(key);
      if (existing) {
        existing.push(row);
      } else {
        byExercise.set(key, [row]);
        exerciseOrder.push(key);
      }
    }

    const exercises: HevyImportExercise[] = [];
    exerciseOrder.forEach((exerciseTitle, exercisePosition) => {
      const setRows = [...(byExercise.get(exerciseTitle) ?? [])].sort((left, right) => Number(left.set_index || 0) - Number(right.set_index || 0));
      const notes = (setRows.find((row) => row.exercise_notes.trim() !== '')?.exercise_notes ?? '').slice(0, 500);
      const sets: HevyImportSet[] = [];

      for (const row of setRows) {
        const setType = mapSetType(row.set_type);
        if (setType == null) {
          if (row.set_type.trim()) {
            unknownSetTypes.add(row.set_type.trim().toLowerCase());
          }
          continue;
        }

        const reps = parseOptionalNumber(row.reps);
        const weightKg = parseOptionalNumber(row.weight_kg);
        const duration = parseOptionalNumber(row.duration_seconds);
        const distance = parseOptionalNumber(row.distance_km);
        const isCardio = (duration != null || distance != null) && reps == null && weightKg == null;
        if (isCardio) {
          skippedCardioRows += 1;
          continue;
        }
        if (reps == null && weightKg == null && setType === 'normal') {
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

      const match = matchHevyExercise(exerciseTitle, library);
      exercises.push({
        createCustom: match.exerciseId
          ? null
          : {
              equipment: guessEquipment(exerciseTitle),
              muscleGroup: guessMuscleGroup(exerciseTitle),
              name: displayNameForCustom(exerciseTitle),
            },
        matchedExerciseId: match.exerciseId,
        name: match.exerciseId ? match.name : displayNameForCustom(exerciseTitle),
        notes,
        position: exercisePosition,
        sets,
      });
    });

    if (exercises.length === 0) {
      continue;
    }

    workouts.push({
      description: group.meta.description.trim(),
      exercises,
      finishedAt: finishedAt ?? startedAt,
      name: cleanWorkoutTitle(group.meta.title),
      startedAt,
    });
  }

  workouts.sort((left, right) => right.startedAt - left.startedAt);
  return {
    skippedCardioRows,
    unknownSetTypes: [...unknownSetTypes].sort(),
    workouts,
  };
}

export function matchHevyExercise(hevyTitle: string, library: HevyImportExerciseRef[]): { exerciseId: string | null; name: string } {
  const needle = normalizeExerciseName(hevyTitle);
  const aliased = ALIASES[needle] ?? needle;

  for (const exercise of library) {
    const candidate = normalizeExerciseName(exercise.name);
    if (candidate === aliased || candidate === needle) {
      return { exerciseId: exercise.id, name: exercise.name };
    }
  }

  for (const exercise of library) {
    const candidate = normalizeExerciseName(exercise.name);
    if (candidate.includes(aliased) || aliased.includes(candidate)) {
      return { exerciseId: exercise.id, name: exercise.name };
    }
  }

  return { exerciseId: null, name: displayNameForCustom(hevyTitle) };
}

export function normalizeExerciseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bweighted\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHevyDate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // 20 Oct 2026, 18:42
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const fallback = Date.parse(trimmed);
    return Number.isFinite(fallback) ? fallback : null;
  }

  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  if (month == null || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }
  return new Date(year, month, day, hour, minute, second).getTime();
}

export function quoteHevyDates(text: string): string {
  // Only wrap a date when it is its own unquoted field. Hevy's real export
  // already quotes "20 Oct 2026, 18:42", and quoting it again splits the row.
  return text.replace(
    /(^|[\n,])(\d{1,2}\s+[A-Za-z]+\s+\d{4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)(?=$|[\n,])/g,
    '$1"$2, $3"',
  );
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') {
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function columnIndex(header: string[]) {
  return {
    description: header.indexOf('description'),
    distance_km: header.indexOf('distance_km'),
    duration_seconds: header.indexOf('duration_seconds'),
    end_time: header.indexOf('end_time'),
    exercise_notes: header.indexOf('exercise_notes'),
    exercise_title: header.indexOf('exercise_title'),
    reps: header.indexOf('reps'),
    rpe: header.indexOf('rpe'),
    set_index: header.indexOf('set_index'),
    set_type: header.indexOf('set_type'),
    start_time: header.indexOf('start_time'),
    title: header.indexOf('title'),
    weight_kg: header.indexOf('weight_kg'),
  };
}

function readRow(row: string[], index: ReturnType<typeof columnIndex>): CsvRow {
  const at = (column: number) => (column >= 0 ? (row[column] ?? '').trim() : '');
  return {
    description: at(index.description),
    distance_km: at(index.distance_km),
    duration_seconds: at(index.duration_seconds),
    end_time: at(index.end_time),
    exercise_notes: at(index.exercise_notes).replace(/\\n/g, '\n'),
    exercise_title: at(index.exercise_title),
    reps: at(index.reps),
    rpe: at(index.rpe),
    set_index: at(index.set_index),
    set_type: at(index.set_type),
    start_time: at(index.start_time),
    title: at(index.title),
    weight_kg: at(index.weight_kg),
  };
}

function mapSetType(value: string): SetType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'normal' || normalized === 'failure' || normalized === 'dropset') {
    return 'normal';
  }
  if (normalized === 'warmup' || normalized === 'warm-up' || normalized === 'warm_up') {
    return 'warmup';
  }
  return null;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalRpe(value: string): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed == null || parsed < 0 || parsed > 10) {
    return null;
  }
  return Math.round(parsed * 10) / 10;
}

function cleanWorkoutTitle(title: string): string {
  return title
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Workout';
}

function displayNameForCustom(hevyTitle: string): string {
  return hevyTitle.replace(/\s+/g, ' ').trim();
}

function guessEquipment(hevyTitle: string): Equipment {
  const match = hevyTitle.match(/\(([^)]+)\)\s*$/);
  if (match) {
    const inside = match[1].trim();
    if (inside.toLowerCase() === 'weighted') {
      return 'Bodyweight';
    }
    const titled = inside.charAt(0).toUpperCase() + inside.slice(1).toLowerCase();
    if (isEquipment(titled)) {
      return titled;
    }
    for (const equipment of equipmentTypes) {
      if (inside.toLowerCase() === equipment.toLowerCase()) {
        return equipment;
      }
    }
  }
  const lower = hevyTitle.toLowerCase();
  if (lower.includes('dumbbell')) {
    return 'Dumbbell';
  }
  if (lower.includes('cable')) {
    return 'Cable';
  }
  if (lower.includes('machine')) {
    return 'Machine';
  }
  if (lower.includes('barbell') || lower.includes('deadlift') || lower.includes('squat') || lower.includes('clean')) {
    return 'Barbell';
  }
  if (lower.includes('pull up') || lower.includes('chin up') || lower.includes('sit up') || lower.includes('push up')) {
    return 'Bodyweight';
  }
  return 'Other';
}

function guessMuscleGroup(hevyTitle: string): MuscleGroup {
  const lower = hevyTitle.toLowerCase();
  if (lower.includes('bench') || lower.includes('chest') || lower.includes('fly') || lower.includes('dip')) {
    return 'Chest';
  }
  if (lower.includes('row') || lower.includes('pull') || lower.includes('chin') || lower.includes('lat') || lower.includes('deadlift')) {
    return 'Back';
  }
  if (lower.includes('press') || lower.includes('lateral') || lower.includes('raise') || lower.includes('delt') || lower.includes('overhead')) {
    return 'Shoulders';
  }
  if (lower.includes('curl') && !lower.includes('leg')) {
    return 'Biceps';
  }
  if (lower.includes('tricep') || lower.includes('pushdown') || lower.includes('skull')) {
    return 'Triceps';
  }
  if (lower.includes('squat') || lower.includes('leg extension') || lower.includes('lunge') || lower.includes('leg press')) {
    return 'Quads';
  }
  if (lower.includes('hamstring') || lower.includes('leg curl') || lower.includes('romanian')) {
    return 'Hamstrings';
  }
  if (lower.includes('glute') || lower.includes('hip thrust')) {
    return 'Glutes';
  }
  if (lower.includes('calf')) {
    return 'Calves';
  }
  if (lower.includes('sit up') || lower.includes('crunch') || lower.includes('plank') || lower.includes('core')) {
    return 'Core';
  }
  if (lower.includes('clean') || lower.includes('snatch') || lower.includes('thruster')) {
    return 'Full body';
  }
  return 'Full body';
}
