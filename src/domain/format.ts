import type { WeightUnit } from './types';
import { formatWeight, kgToDisplay } from './units';

export function formatLoggedLoad(
  weightKg: number | null,
  reps: number | null,
  unit: WeightUnit,
  warmup = false,
): string {
  if (weightKg == null && reps == null) {
    return '—';
  }

  const load = weightKg == null ? '—' : weightKg === 0 ? 'BW' : formatWeight(kgToDisplay(weightKg, unit));
  const repText = reps == null ? '—' : String(reps);
  const text = `${load} × ${repText}`;
  return warmup ? `W ${text}` : text;
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatDuration(start: number, end: number): string {
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export function formatWorkoutWhen(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  if (diff === 0) {
    return `Today · ${time}`;
  }
  if (diff === 1) {
    return `Yesterday · ${time}`;
  }

  const dayLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date);
  return `${dayLabel} · ${time}`;
}

export function formatDay(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(timestamp));
}

export function formatMonth(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(timestamp));
}

export function summarizeNames(names: string[]): string {
  if (names.length === 0) {
    return 'No exercises yet';
  }
  if (names.length <= 3) {
    return names.join(', ');
  }

  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}
