/**
 * The shapes of the data, with no behavior. A screen, a save, and a chart
 * all talk about a SetRecord or a WorkoutDetail so they agree on the field names.
 * Weight on a set is kilograms. RPE is optional. Notes hang off the exercise.
 */
export type WeightUnit = 'kg' | 'lb';

export type SetType = 'normal' | 'warmup';

/** Only used to pick a strength-standards table. */
export type BodySex = 'male' | 'female';

export function isBodySex(value: unknown): value is BodySex {
  return value === 'male' || value === 'female';
}

/** Bodyweight and sex for strength levels. Both optional. */
export interface BodyProfile {
  bodyweightKg: number | null;
  sex: BodySex | null;
}

export type ChartMetric = 'oneRepMax' | 'topSet' | 'volume';

export const muscleGroups = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Full body',
] as const;

export type MuscleGroup = (typeof muscleGroups)[number];

export const equipmentTypes = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Other',
] as const;

export type Equipment = (typeof equipmentTypes)[number];

/** What clips onto the cable. Only cable exercises carry one. */
export const cableAttachments = ['Rope', 'Straight bar', 'V-bar', 'Lat bar', 'EZ bar', 'Single handle', 'D-handles', 'Ankle strap'] as const;

export type CableAttachment = (typeof cableAttachments)[number];

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
  /** The attachment a new workout starts with. Null for none or for non-cable exercises. */
  attachment: CableAttachment | null;
  /** The stack a new workout starts with. Null when unknown or for free weights. */
  machineSetup: string | null;
}

export interface SetRecord {
  id: string;
  position: number;
  setType: SetType;
  /** Kilograms. Convert to the display unit only at the input and label. */
  weightKg: number | null;
  reps: number | null;
  /** Optional effort from 0 to 10. Null means the lifter left RPE blank. */
  rpe: number | null;
  completed: boolean;
}

export interface PreviousSet {
  weightKg: number | null;
  reps: number | null;
  setType: SetType;
  /** Set when this previous row came from a machine or cable. Null means Unknown brand. */
  machineSetup?: string | null;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  position: number;
  /** Free text for this exercise in this workout, not for each set. */
  notes: string;
  /** Rest after each set of this exercise. Null uses the exercise's default from src/domain/rest.ts. */
  restSeconds: number | null;
  /** The cable attachment used in this workout. */
  attachment: CableAttachment | null;
  /** The stack used in this workout. Null when unknown or for free weights. */
  machineSetup: string | null;
  sets: SetRecord[];
  previousSets: PreviousSet[];
}

export interface WorkoutDetail {
  id: string;
  name: string;
  routineId: string | null;
  startedAt: number;
  finishedAt: number | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutSummaryExercise {
  name: string;
  /** Working sets: completed, not warmups. */
  sets: number;
  /** The set with the highest estimated 1RM, or the most reps when everything was bodyweight. */
  best: { weightKg: number; reps: number } | null;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number;
  exerciseNames: string[];
  exercises: WorkoutSummaryExercise[];
  setCount: number;
  volumeKg: number;
  /** Sets in this workout that beat an earlier estimated 1RM. */
  recordCount: number;
}

export interface ActiveWorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  exerciseCount: number;
}

/** A planned set: weight in kilograms and reps, both optional. */
export interface RoutineSet {
  id: string;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  position: number;
  /** The stack this plan is for. Null when unknown or for free weights. */
  machineSetup: string | null;
  sets: RoutineSet[];
  /** The latest finished session of this exercise, for the Previous column. */
  previousSets: PreviousSet[];
}

export interface RoutineDetail {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface RoutineSummary {
  id: string;
  name: string;
  exerciseNames: string[];
}

export interface TrainedExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  lastPerformedAt: number;
}

export interface LoggedSet {
  workoutId: string;
  exerciseId: string;
  position: number;
  performedAt: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  /** The stack this set was logged on. Null when unknown or for free weights. */
  machineSetup: string | null;
  /** Present when the stored set had RPE. Older history may omit it. */
  rpe?: number | null;
}

export function isMuscleGroup(value: string): value is MuscleGroup {
  return (muscleGroups as readonly string[]).includes(value);
}

export function isEquipment(value: string): value is Equipment {
  return (equipmentTypes as readonly string[]).includes(value);
}

export function isCableAttachment(value: unknown): value is CableAttachment {
  return typeof value === 'string' && (cableAttachments as readonly string[]).includes(value);
}

/** Common stack brands. A typed name is also allowed. */
export const machineBrands = ['Precor', 'Life Fitness', 'Hammer Strength', 'Generic'] as const;

/** Machine and cable stacks differ by brand; free weights do not. */
export function usesMachineSetup(equipment: Equipment): boolean {
  return equipment === 'Machine' || equipment === 'Cable';
}

const MACHINE_SETUP_MAX = 40;

/** Trimmed brand or custom name, or null when the stack is unknown. */
export function normalizeMachineSetup(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return null;
  }
  return trimmed.length > MACHINE_SETUP_MAX ? trimmed.slice(0, MACHINE_SETUP_MAX).trim() : trimmed;
}

export function sameMachineSetup(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? null) === (right ?? null);
}

export function formatMachineSetup(value: string | null | undefined): string {
  return value ?? 'Unknown brand';
}

/** Custom stack names already used, not including the built-in brands. */
export function extraMachineSetups(values: Array<string | null | undefined>): string[] {
  const brands = new Set<string>(machineBrands);
  const seen = new Set<string>();
  const extras: string[] = [];
  for (const value of values) {
    if (!value || brands.has(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    extras.push(value);
  }
  return extras;
}

export function isWeightUnit(value: string): value is WeightUnit {
  return value === 'kg' || value === 'lb';
}
