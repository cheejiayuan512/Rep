/**
 * Personal records and chart numbers. A set counts only when it is completed,
 * not a warmup, and has at least one rep. The first set is saved but not announced.
 */
import type { ChartMetric, LoggedSet, SetType } from './types';
import type { WeightUnit } from './types';
import { formatLoggedLoad } from './format';
import { formatVolume, formatWeight, kgToDisplay } from './units';

const WEIGHT_EPSILON_KG = 0.05;
const VOLUME_EPSILON_KG = 0.5;

export interface ScoredSet {
  weightKg: number;
  reps: number;
  oneRepMaxKg: number | null;
  volumeKg: number;
  achievedAt: number;
}

export interface Bests {
  oneRepMax: ScoredSet | null;
  heaviest: ScoredSet | null;
  volume: ScoredSet | null;
  reps: ScoredSet | null;
}

export interface RecordHit {
  kind: 'oneRepMax' | 'heaviest' | 'volume' | 'reps';
  title: string;
  detail: string;
}

export interface SessionStat {
  workoutId: string;
  performedAt: number;
  oneRepMaxKg: number | null;
  topWeightKg: number | null;
  volumeKg: number;
  bestReps: number;
  highlightKg: number | null;
  highlightReps: number | null;
}

export interface ChartPoint {
  at: number;
  value: number;
}

export interface RecordCard {
  label: string;
  value: string;
  detail: string;
  achievedAt: number | null;
}

/** Epley estimate. A single is the weight itself; more reps scale by `reps / 30`. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) {
    return weight;
  }

  return weight * (1 + reps / 30);
}

export function scoreLoggedSet(set: LoggedSet): ScoredSet | null {
  if (!set.completed || set.setType !== 'normal' || set.reps == null || set.reps <= 0) {
    return null;
  }

  const weightKg = set.weightKg ?? 0;
  return {
    achievedAt: set.performedAt,
    oneRepMaxKg: weightKg > 0 ? estimateOneRepMax(weightKg, set.reps) : null,
    reps: set.reps,
    volumeKg: weightKg * set.reps,
    weightKg,
  };
}

export function bestsFromScored(sets: ScoredSet[]): Bests {
  const ordered = [...sets].sort((left, right) => left.achievedAt - right.achievedAt);
  const best: Bests = { heaviest: null, oneRepMax: null, reps: null, volume: null };

  for (const set of ordered) {
    if (set.oneRepMaxKg != null && (best.oneRepMax?.oneRepMaxKg == null || set.oneRepMaxKg > (best.oneRepMax.oneRepMaxKg ?? 0) + WEIGHT_EPSILON_KG)) {
      best.oneRepMax = set;
    }
    if (set.weightKg > 0 && (best.heaviest == null || set.weightKg > best.heaviest.weightKg + WEIGHT_EPSILON_KG)) {
      best.heaviest = set;
    }
    if (set.volumeKg > 0 && (best.volume == null || set.volumeKg > best.volume.volumeKg + VOLUME_EPSILON_KG)) {
      best.volume = set;
    }
    if (best.reps == null || set.reps > best.reps.reps) {
      best.reps = set;
    }
  }

  return best;
}

/**
 * Announces a record only when this set beats a prior best.
 * The first logged set still shows on Progress, but it does not raise a banner.
 */
export function detectRecord(current: ScoredSet, prior: ScoredSet[], unit: WeightUnit): RecordHit | null {
  return detectRecords(current, prior, unit)[0] ?? null;
}

/** Every record this set beats, in priority order: 1RM, heaviest, volume, reps. */
export function detectRecords(current: ScoredSet, prior: ScoredSet[], unit: WeightUnit): RecordHit[] {
  const best = bestsFromScored(prior);
  const hits: RecordHit[] = [];
  if (current.oneRepMaxKg != null && best.oneRepMax?.oneRepMaxKg != null && current.oneRepMaxKg > best.oneRepMax.oneRepMaxKg + WEIGHT_EPSILON_KG) {
    hits.push({
      detail: formatLoggedLoad(current.weightKg, current.reps, unit),
      kind: 'oneRepMax',
      title: `Estimated 1RM PR · ${formatWeight(kgToDisplay(current.oneRepMaxKg, unit))} ${unit}`,
    });
  }
  if (current.weightKg > 0 && best.heaviest != null && current.weightKg > best.heaviest.weightKg + WEIGHT_EPSILON_KG) {
    hits.push({
      detail: `${current.reps} reps`,
      kind: 'heaviest',
      title: `Heaviest set PR · ${formatWeight(kgToDisplay(current.weightKg, unit))} ${unit}`,
    });
  }
  if (current.volumeKg > 0 && best.volume != null && current.volumeKg > best.volume.volumeKg + VOLUME_EPSILON_KG) {
    hits.push({
      detail: formatLoggedLoad(current.weightKg, current.reps, unit),
      kind: 'volume',
      title: `Volume PR · ${formatVolume(kgToDisplay(current.volumeKg, unit))} ${unit}`,
    });
  }
  if (best.reps != null && current.reps > best.reps.reps) {
    hits.push({
      detail: current.weightKg > 0 ? `at ${formatWeight(kgToDisplay(current.weightKg, unit))} ${unit}` : 'bodyweight',
      kind: 'reps',
      title: `Rep PR · ${current.reps}`,
    });
  }

  return hits;
}

/**
 * Walks one exercise's sets in order and returns the ids that beat everything
 * before them: the earlier history plus the earlier sets in this workout.
 */
export function recordSetIds(sets: Array<{ id: string; scored: ScoredSet | null }>, history: ScoredSet[]): Set<string> {
  const ids = new Set<string>();
  const prior = [...history];
  for (const set of sets) {
    if (!set.scored) {
      continue;
    }
    if (detectRecords(set.scored, prior, 'kg').length > 0) {
      ids.add(set.id);
    }
    prior.push(set.scored);
  }

  return ids;
}

/**
 * How many sets beat an earlier estimated 1RM for one exercise, in the order given.
 * The first set sets the bar and does not count, the same as the PR banner.
 */
export function countOneRepMaxRecords(sets: ScoredSet[]): number {
  return oneRepMaxRecordFlags(sets).filter(Boolean).length;
}

/** For each set, whether it beat every earlier estimated 1RM in the list. */
export function oneRepMaxRecordFlags(sets: ScoredSet[]): boolean[] {
  let best: number | null = null;
  return sets.map((set) => {
    if (set.oneRepMaxKg == null) {
      return false;
    }
    const beat = best != null && set.oneRepMaxKg > best + WEIGHT_EPSILON_KG;
    best = best == null ? set.oneRepMaxKg : Math.max(best, set.oneRepMaxKg);
    return beat;
  });
}

export function latestSessionSets(sets: LoggedSet[]): LoggedSet[] {
  const completed = sets.filter((set) => set.completed);
  const first = completed[0];
  if (!first) {
    return [];
  }

  let latestId = first.workoutId;
  let latestAt = first.performedAt;
  for (const set of completed) {
    if (set.performedAt >= latestAt) {
      latestAt = set.performedAt;
      latestId = set.workoutId;
    }
  }

  return completed.filter((set) => set.workoutId === latestId).sort((left, right) => left.position - right.position);
}

export function buildSessionStats(sets: LoggedSet[]): SessionStat[] {
  const groups = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    const group = groups.get(set.workoutId) ?? [];
    group.push(set);
    groups.set(set.workoutId, group);
  }

  const sessions: SessionStat[] = [];
  for (const [workoutId, group] of groups) {
    const scored = group.map(scoreLoggedSet).filter((set): set is ScoredSet => set != null);
    if (scored.length === 0) {
      continue;
    }

    const best = bestsFromScored(scored);
    const highlight = best.oneRepMax ?? best.heaviest ?? best.reps;
    const performedAt = group.reduce((latest, set) => Math.max(latest, set.performedAt), 0);
    sessions.push({
      bestReps: best.reps?.reps ?? 0,
      highlightKg: highlight && highlight.weightKg > 0 ? highlight.weightKg : null,
      highlightReps: highlight?.reps ?? null,
      oneRepMaxKg: best.oneRepMax?.oneRepMaxKg ?? null,
      performedAt,
      topWeightKg: best.heaviest?.weightKg ?? null,
      volumeKg: scored.reduce((sum, set) => sum + set.volumeKg, 0),
      workoutId,
    });
  }

  return sessions.sort((left, right) => left.performedAt - right.performedAt);
}

export function chartValues(sessions: SessionStat[], metric: ChartMetric, unit: WeightUnit): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const session of sessions) {
    const value = metricValue(session, metric, unit);
    if (value != null) {
      points.push({ at: session.performedAt, value });
    }
  }

  return points;
}

export function metricValue(session: SessionStat, metric: ChartMetric, unit: WeightUnit): number | null {
  if (metric === 'oneRepMax') {
    return session.oneRepMaxKg == null ? null : kgToDisplay(session.oneRepMaxKg, unit);
  }
  if (metric === 'topSet') {
    return session.topWeightKg == null || session.topWeightKg <= 0 ? null : kgToDisplay(session.topWeightKg, unit);
  }
  if (session.volumeKg <= 0) {
    return null;
  }

  return kgToDisplay(session.volumeKg, unit);
}

export function formatMetricValue(value: number | null, unit: WeightUnit, metric: ChartMetric): string {
  if (value == null) {
    return '—';
  }
  if (metric === 'volume') {
    return `${formatVolume(value)} ${unit}`;
  }

  return `${formatWeight(value)} ${unit}`;
}

export function recordCardsFromSets(sets: LoggedSet[], unit: WeightUnit): RecordCard[] {
  const scored = sets.map(scoreLoggedSet).filter((set): set is ScoredSet => set != null);
  const best = bestsFromScored(scored);
  return [
    card('Est. 1RM', best.oneRepMax?.oneRepMaxKg == null ? null : `${formatWeight(kgToDisplay(best.oneRepMax.oneRepMaxKg, unit))} ${unit}`, best.oneRepMax ? `from ${formatLoggedLoad(best.oneRepMax.weightKg, best.oneRepMax.reps, unit)}` : 'No weighted set yet', best.oneRepMax?.achievedAt ?? null),
    card('Heaviest', best.heaviest ? `${formatWeight(kgToDisplay(best.heaviest.weightKg, unit))} ${unit}` : null, best.heaviest ? `${best.heaviest.reps} reps` : 'No weighted set yet', best.heaviest?.achievedAt ?? null),
    card('Best volume', best.volume ? `${formatVolume(kgToDisplay(best.volume.volumeKg, unit))} ${unit}` : null, best.volume ? formatLoggedLoad(best.volume.weightKg, best.volume.reps, unit) : 'No weighted set yet', best.volume?.achievedAt ?? null),
    card('Most reps', best.reps ? String(best.reps.reps) : null, best.reps ? (best.reps.weightKg > 0 ? `at ${formatWeight(kgToDisplay(best.reps.weightKg, unit))} ${unit}` : 'bodyweight') : 'No completed set yet', best.reps?.achievedAt ?? null),
  ];
}

export function toLoggedSet(input: {
  workoutId: string;
  exerciseId: string;
  position: number;
  performedAt: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}): LoggedSet {
  return input;
}

function card(label: string, value: string | null, detail: string, achievedAt: number | null): RecordCard {
  return {
    achievedAt,
    detail,
    label,
    value: value ?? '—',
  };
}
