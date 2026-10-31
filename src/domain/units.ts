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

/** Display conversion only. Stored cardio distance stays in kilometers. */
const KILOMETERS_PER_MILE = 1.609344;

export function displayToKm(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KILOMETERS_PER_MILE;
}

export function kmToDisplay(kilometers: number, unit: WeightUnit): number {
  return unit === 'kg' ? kilometers : kilometers / KILOMETERS_PER_MILE;
}

export function distanceUnitLabel(unit: WeightUnit): 'km' | 'mi' {
  return unit === 'kg' ? 'km' : 'mi';
}

/** Weights keep two decimals so small plates (8.75 kg, 1.25 kg) survive a save and a reload. */
const WEIGHT_STEPS = 100;

/** A number with at most `places` decimals and no trailing zeros: 80, 8.8, 8.75. */
export function formatDecimal(value: number, places: number): string {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  if (Object.is(rounded, -0)) {
    return '0';
  }

  return String(Number(rounded.toFixed(places)));
}

export function formatWeight(value: number): string {
  return formatDecimal(value, 2);
}

/** A calculated weight such as an estimated 1RM. One decimal; more would be false precision. */
export function formatEstimate(value: number): string {
  return formatDecimal(value, 1);
}

export function formatVolume(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatChartTick(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${formatDecimal(value / 1000, 1)}k`;
  }

  return formatDecimal(value, 1);
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

  return Math.round(parsed * WEIGHT_STEPS) / WEIGHT_STEPS;
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
