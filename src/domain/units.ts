/**
 * Turns kilograms into the unit on screen, and typed text back into kilograms.
 * Call these at the edges. Do not store a pound value on a set.
 */
import type { WeightUnit } from './types';

/** Display conversion only. Stored workout weight stays in kilograms. */
const POUNDS_PER_KILOGRAM = 2.2046226218;

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / POUNDS_PER_KILOGRAM;
}

export function kgToDisplay(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * POUNDS_PER_KILOGRAM;
}

export function formatWeight(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Object.is(rounded, -0) || Number.isInteger(rounded)) {
    return String(Math.round(rounded));
  }

  return rounded.toFixed(1);
}

export function formatVolume(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatChartTick(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${formatWeight(value / 1000)}k`;
  }

  return formatWeight(value);
}

export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999) {
    return null;
  }

  return Math.round(parsed * 10) / 10;
}

export function parseReps(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    return null;
  }

  return parsed;
}

export function weightTextToKg(value: string, unit: WeightUnit, fallback: number | null): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseDecimal(trimmed);
  if (parsed == null) {
    return fallback;
  }

  return displayToKg(parsed, unit);
}

export function parseRpe(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
    return null;
  }

  return Math.round(parsed * 10) / 10;
}

export function rpeTextToNumber(value: string, fallback: number | null): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseRpe(trimmed);
  return parsed == null ? fallback : parsed;
}

export function repsTextToNumber(value: string, fallback: number | null): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseReps(trimmed);
  return parsed == null ? fallback : parsed;
}
