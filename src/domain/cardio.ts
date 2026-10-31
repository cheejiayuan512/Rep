/**
 * Cardio sets are time and distance. Lifting sets stay weight and reps.
 * Distance is stored in kilometers and converted in units.ts.
 */
import { formatClock } from './format';
import type { WeightUnit } from './types';
import { displayToKm, distanceUnitLabel, formatDecimal, formatVolume, kgToDisplay, kmToDisplay } from './units';

const CARDIO_IDS = new Set([
  'assault-bike',
  'battle-ropes',
  'cycling',
  'elliptical',
  'hiking',
  'jump-rope',
  'rowing',
  'running',
  'skierg',
  'stair-climber',
  'swimming',
  'treadmill-incline-walk',
  'walking',
]);

/** Longest first so "jump rope" wins over a shorter word inside it. */
const CARDIO_PHRASES = [
  'treadmill incline walk',
  'stationary bike',
  'exercise bike',
  'rowing machine',
  'assault bike',
  'stair climber',
  'stairclimber',
  'stair master',
  'stairmaster',
  'battle ropes',
  'battle rope',
  'jump rope',
  'echo bike',
  'air bike',
  'ski erg',
  'skierg',
  'running',
  'jogging',
  'cycling',
  'biking',
  'elliptical',
  'sprinting',
  'hiking',
  'swimming',
  'walking',
  'treadmill',
  'rowing',
  'rower',
  'sprint',
  'cycle',
  'swim',
  'hike',
  'bike',
  'walk',
  'jog',
  'run',
];

/** A name that also says one of these is a lift, even if it contains "walk" or "run". */
const LIFT_WORDS = ['lunge', 'squat', 'press', 'curl', 'deadlift', 'thrust', 'raise', 'farmer', 'carry', 'clean', 'snatch', 'jerk', 'swing', 'burpee', 'pulldown', 'pullup', 'pull up', 'bench', 'fly', 'crunch', 'plank', 'stretch', 'pushup', 'push up', 'dip'];

const MAX_DURATION_SECONDS = 99 * 3600 + 59 * 60 + 59;

export function isCardioExercise(exerciseId: string, name = ''): boolean {
  if (CARDIO_IDS.has(exerciseId)) {
    return true;
  }
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized || LIFT_WORDS.some((word) => startsWord(normalized, word))) {
    return false;
  }
  return CARDIO_PHRASES.some((phrase) => containsPhrase(normalized, phrase));
}

/** True when `word` starts a token, so "lunge" matches "lunges". */
function startsWord(text: string, word: string): boolean {
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(word, from);
    if (at < 0) {
      return false;
    }
    if (at === 0 || text[at - 1] === ' ') {
      return true;
    }
    from = at + 1;
  }
  return false;
}

function containsPhrase(text: string, phrase: string): boolean {
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(phrase, from);
    if (at < 0) {
      return false;
    }
    const before = at === 0 || text[at - 1] === ' ';
    const after = at + phrase.length === text.length || text[at + phrase.length] === ' ';
    if (before && after) {
      return true;
    }
    from = at + 1;
  }
  return false;
}

/** A stored duration. Blank, zero, and nonsense become null. */
export function cleanDuration(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_DURATION_SECONDS) {
    return null;
  }
  return Math.round(value);
}

/** A stored distance in kilometers. Blank, zero, and nonsense become null. */
export function cleanDistance(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1000) {
    return null;
  }
  return Math.round(value * 1000) / 1000;
}

export function parseDurationText(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }
  const numbers = parts.map((part) => Number(part));
  const seconds = numbers[numbers.length - 1] ?? 0;
  const minutes = numbers[numbers.length - 2] ?? 0;
  const hours = numbers.length === 3 ? (numbers[0] ?? 0) : 0;
  if (seconds > 59 || minutes > 59 || hours > 99) {
    return null;
  }
  return cleanDuration(hours * 3600 + minutes * 60 + seconds);
}

/** Clock entry: each digit shifts in from the right. 1, 2, 3, 0 becomes 12:30. */
export function typeDurationKey(current: string, key: string, replace: boolean): string | null {
  if (!/^[0-9]$/.test(key)) {
    return null;
  }
  const digits = replace ? '' : durationDigits(current);
  if (digits.length >= 6) {
    return null;
  }
  return formatDurationDigits(`${digits}${key}`);
}

export function backspaceDuration(current: string, replace: boolean): string {
  if (replace) {
    return '';
  }
  const digits = durationDigits(current);
  if (digits.length <= 1) {
    return '';
  }
  return formatDurationDigits(digits.slice(0, -1)) ?? '';
}

function durationDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '');
}

function formatDurationDigits(digits: string): string | null {
  const seconds = Number(digits.slice(-2));
  const minutes = digits.length > 2 ? Number(digits.slice(Math.max(0, digits.length - 4), -2)) : 0;
  const hours = digits.length > 4 ? Number(digits.slice(0, -4)) : 0;
  if (seconds > 59 || minutes > 59 || hours > 99) {
    return null;
  }
  const total = hours * 3600 + minutes * 60 + seconds;
  return total === 0 ? '' : formatClock(total);
}

export function durationTextToSeconds(text: string, fallback: number | null): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  return parseDurationText(trimmed) ?? fallback;
}

export function distanceTextToKm(text: string, unit: WeightUnit, fallback: number | null): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
    return fallback;
  }
  return cleanDistance(displayToKm(parsed, unit));
}

export function formatDistance(distanceKm: number, unit: WeightUnit): string {
  return `${formatDecimal(kmToDisplay(distanceKm, unit), 2)} ${distanceUnitLabel(unit)}`;
}

export function formatCardioEffort(durationSeconds: number | null | undefined, distanceKm: number | null | undefined, unit: WeightUnit, warmup = false): string {
  const time = durationSeconds != null && durationSeconds > 0 ? formatClock(durationSeconds) : null;
  const distance = distanceKm != null && distanceKm > 0 ? formatDistance(distanceKm, unit) : null;
  const text = time && distance ? `${time} · ${distance}` : (time ?? distance);
  if (!text) {
    return '—';
  }
  return warmup ? `W ${text}` : text;
}

export function cardioHasEffort(durationSeconds: number | null | undefined, distanceKm: number | null | undefined): boolean {
  return (durationSeconds ?? 0) > 0 || (distanceKm ?? 0) > 0;
}

/** Lifting volume, or the cardio time and distance when the session has no loaded sets. */
export function formatSessionLoad(volumeKg: number, durationSeconds: number | null | undefined, distanceKm: number | null | undefined, unit: WeightUnit): string {
  if (volumeKg > 0) {
    return `${formatVolume(kgToDisplay(volumeKg, unit))} ${unit}`;
  }
  if (cardioHasEffort(durationSeconds, distanceKm)) {
    return formatCardioEffort(durationSeconds, distanceKm, unit);
  }
  return `${formatVolume(0)} ${unit}`;
}
