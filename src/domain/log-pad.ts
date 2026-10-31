/**
 * Keystrokes for the logging pad. Weight and reps take digits.
 * RPE is a half-step scale. The pad asks these functions what the box should say next.
 */
import { backspaceDuration, parseDurationText, typeDurationKey } from './cardio';
import { formatClock } from './format';
import type { WeightUnit } from './types';
import { formatDecimal, formatWeight, parseDecimal, parseReps, parseRpe } from './units';

export type LogFieldKind = 'weight' | 'reps' | 'rpe' | 'duration' | 'distance';

/** The efforts a lifter actually picks. Lower than 6 still steps in with minus. */
export const RPE_SCALE = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

/** One short line for the selected effort. Blank means they have not picked one yet. */
export function rpeHint(value: number | null): string {
  if (value == null) {
    return 'How many reps were left?';
  }

  switch (formatWeight(value)) {
    case '10':
      return 'No reps left.';
    case '9.5':
      return 'Maybe one more rep.';
    case '9':
      return 'One rep left.';
    case '8.5':
      return 'One rep left, maybe two.';
    case '8':
      return 'Two reps left.';
    case '7.5':
      return 'Two reps left, maybe three.';
    case '7':
      return 'Three reps left.';
    case '6.5':
      return 'Three reps left, maybe four.';
    case '6':
      return 'Four reps left.';
    default:
      return value < 6 ? 'Easier than a hard set. Several reps left.' : 'How many reps were left?';
  }
}

/**
 * One keypad key. `replace` is the first key after the field is opened, so it
 * overwrites the old number. Returns null when the key does not fit.
 */
export function typeKey(current: string, key: string, kind: 'weight' | 'reps' | 'distance' | 'duration', replace: boolean): string | null {
  if (kind === 'duration') {
    return typeDurationKey(current, key, replace);
  }
  const decimal = kind === 'weight' || kind === 'distance';
  if (replace) {
    if (key === '.') {
      return decimal ? '0.' : null;
    }
    if (!/^[0-9]$/.test(key)) {
      return null;
    }
    return key;
  }

  if (!decimal) {
    if (!/^[0-9]$/.test(key)) {
      return null;
    }
    if (current === '0') {
      return key;
    }
    if (current.length >= 3) {
      return null;
    }
    return current + key;
  }

  if (key === '.') {
    if (current.includes('.')) {
      return null;
    }
    return current.length === 0 ? '0.' : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) {
    return null;
  }

  const next = current === '0' ? key : `${current}${key}`;
  const dot = next.indexOf('.');
  if (dot >= 0 && next.length - dot - 1 > 2) {
    return null;
  }
  if (Number(next) > 9999) {
    return null;
  }
  return next;
}

/** The first delete after opening a field clears it. Later deletes remove one character. */
export function backspaceKey(current: string, replace: boolean, kind: LogFieldKind = 'weight'): string {
  if (kind === 'duration') {
    return backspaceDuration(current, replace);
  }
  if (replace || current.length <= 1) {
    return '';
  }
  return current.slice(0, -1);
}

/** Plus and minus. Weight jumps by a small plate, reps by one, RPE by half a point. */
export function nudgeLogValue(current: string, direction: -1 | 1, kind: LogFieldKind, unit: WeightUnit): string {
  if (kind === 'rpe') {
    const parsed = parseRpe(current);
    const start = parsed == null ? (direction > 0 ? 5.5 : 10.5) : parsed;
    const next = Math.min(10, Math.max(0, Math.round((start + direction * 0.5) * 10) / 10));
    return formatWeight(next);
  }

  if (kind === 'reps') {
    const parsed = parseReps(current) ?? 0;
    return String(Math.min(999, Math.max(0, parsed + direction)));
  }

  if (kind === 'duration') {
    const parsed = parseDurationText(current) ?? 0;
    const next = Math.min(99 * 3600 + 59 * 60 + 59, Math.max(0, parsed + direction * 15));
    return next === 0 ? '' : formatClock(next);
  }

  if (kind === 'distance') {
    const parsed = parseDecimal(current) ?? 0;
    const next = Math.min(999, Math.max(0, Math.round((parsed + direction * 0.1) * 100) / 100));
    return next === 0 ? '' : formatDecimal(next, 2);
  }

  const step = unit === 'lb' ? 5 : 2.5;
  const parsed = parseDecimal(current) ?? 0;
  const next = Math.min(9999, Math.max(0, Math.round((parsed + direction * step) * 100) / 100));
  return formatWeight(next);
}
