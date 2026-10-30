/**
 * A workout left named "Workout" gets a title when it is finished:
 * the time of day it started, and the muscles that were trained.
 */

export const DEFAULT_WORKOUT_NAME = 'Workout';

export function isDefaultWorkoutName(name: string): boolean {
  return name.trim() === '' || name.trim() === DEFAULT_WORKOUT_NAME;
}

export function timeOfDayLabel(timestamp: number): 'Morning' | 'Afternoon' | 'Evening' | 'Night' {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) {
    return 'Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Evening';
  }
  return 'Night';
}

/** "Evening Chest and Back", or "Morning Full body" when four or more muscles were trained. */
export function suggestWorkoutName(startedAt: number, muscleGroups: readonly string[]): string {
  const when = timeOfDayLabel(startedAt);
  const parts: string[] = [];
  for (const group of muscleGroups) {
    const name = group.trim();
    if (name && !parts.includes(name)) {
      parts.push(name);
    }
  }
  if (parts.length === 0) {
    return `${when} workout`;
  }
  if (parts.length >= 4) {
    return `${when} Full body`;
  }
  if (parts.length === 1) {
    return `${when} ${parts[0]}`;
  }
  if (parts.length === 2) {
    return `${when} ${parts[0]} and ${parts[1]}`;
  }
  return `${when} ${parts[0]}, ${parts[1]}, and ${parts[2]}`;
}
