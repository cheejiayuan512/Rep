/**
 * The built-in exercise library. Ids are stable slugs like "barbell-bench-press"
 * so a workout saved today still points at the same exercise tomorrow.
 * Custom exercises the user creates are stored separately and are not listed here.
 */
import type { Equipment, MuscleGroup } from '../domain/types';

export interface SeedExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}

export const seedExercises: SeedExercise[] = [
  { id: 'barbell-bench-press', name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'decline-barbell-bench-press', name: 'Decline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable' },
  { id: 'machine-chest-press', name: 'Machine Chest Press', muscleGroup: 'Chest', equipment: 'Machine' },
  { id: 'push-up', name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dip', name: 'Dip', muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'pull-up', name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'chin-up', name: 'Chin-Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'chest-supported-row', name: 'Chest-Supported Row', muscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'straight-arm-pulldown', name: 'Straight-Arm Pulldown', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'Back', equipment: 'Cable' },
  { id: 'overhead-press', name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Cable' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'upright-row', name: 'Upright Row', muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'Biceps', equipment: 'Cable' },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscleGroup: 'Triceps', equipment: 'Cable' },
  { id: 'overhead-triceps-extension', name: 'Overhead Triceps Extension', muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'close-grip-bench-press', name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'dumbbell-kickback', name: 'Dumbbell Kickback', muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'back-squat', name: 'Back Squat', muscleGroup: 'Quads', equipment: 'Barbell' },
  { id: 'front-squat', name: 'Front Squat', muscleGroup: 'Quads', equipment: 'Barbell' },
  { id: 'goblet-squat', name: 'Goblet Squat', muscleGroup: 'Quads', equipment: 'Dumbbell' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Quads', equipment: 'Machine' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Quads', equipment: 'Dumbbell' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscleGroup: 'Quads', equipment: 'Dumbbell' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Quads', equipment: 'Machine' },
  { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'Quads', equipment: 'Machine' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', equipment: 'Barbell' },
  { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Hamstrings', equipment: 'Dumbbell' },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', equipment: 'Machine' },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'Hamstrings', equipment: 'Machine' },
  { id: 'good-morning', name: 'Good Morning', muscleGroup: 'Hamstrings', equipment: 'Barbell' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscleGroup: 'Glutes', equipment: 'Barbell' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'Glutes', equipment: 'Bodyweight' },
  { id: 'cable-pull-through', name: 'Cable Pull-Through', muscleGroup: 'Glutes', equipment: 'Cable' },
  { id: 'hip-abduction', name: 'Hip Abduction', muscleGroup: 'Glutes', equipment: 'Machine' },
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'Calves', equipment: 'Machine' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', equipment: 'Cable' },
  { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'Core', equipment: 'Other' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'power-clean', name: 'Power Clean', muscleGroup: 'Full body', equipment: 'Barbell' },
  { id: 'push-press', name: 'Push Press', muscleGroup: 'Full body', equipment: 'Barbell' },
  { id: 'thruster', name: 'Thruster', muscleGroup: 'Full body', equipment: 'Barbell' },
];
