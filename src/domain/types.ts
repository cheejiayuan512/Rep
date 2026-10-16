/**
 * The shapes of the data, with no behavior. A screen, a save, and a chart
 * all talk about a SetRecord or a WorkoutDetail so they agree on the field names.
 * Weight on a set is kilograms. RPE is optional. Notes hang off the exercise.
 */
export type WeightUnit = 'kg' | 'lb';

export type SetType = 'normal' | 'warmup';

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

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom: boolean;
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

export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  finishedAt: number;
  exerciseNames: string[];
  setCount: number;
  volumeKg: number;
}

export interface ActiveWorkoutSummary {
  id: string;
  name: string;
  startedAt: number;
  exerciseCount: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  position: number;
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
}

export function isMuscleGroup(value: string): value is MuscleGroup {
  return (muscleGroups as readonly string[]).includes(value);
}

export function isEquipment(value: string): value is Equipment {
  return (equipmentTypes as readonly string[]).includes(value);
}

export function isWeightUnit(value: string): value is WeightUnit {
  return value === 'kg' || value === 'lb';
}
