/**
 * Personal records and chart numbers. A set counts only when it is completed,
 * not a warmup, and has at least one rep. The first set is saved but not announced.
 */
import type { CableAttachment, ChartMetric, LoggedSet, SetType } from './types';
import { isWorkingSetType, sameMachineSetup } from './types';
import type { WeightUnit } from './types';
import { formatLoggedLoad } from './format';
import { formatEstimate, formatVolume, formatWeight, kgToDisplay } from './units';

const WEIGHT_EPSILON_KG = 0.05;
const VOLUME_EPSILON_KG = 0.5;
const RPE_EPSILON = 0.45;

export interface ScoredSet {
  weightKg: number;
  reps: number;
  oneRepMaxKg: number | null;
  volumeKg: number;
  achievedAt: number;
  rpe: number | null;
  /** Groups sets into a session so two singles can beat one single. */
  workoutId: string;
}

export interface Bests {
  oneRepMax: ScoredSet | null;
  heaviest: ScoredSet | null;
  volume: ScoredSet | null;
  reps: ScoredSet | null;
}

export interface RecordHit {
  kind: 'oneRepMax' | 'heaviest' | 'volume' | 'reps' | 'rpe' | 'session';
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
  if (!set.completed || !isWorkingSetType(set.setType) || set.reps == null || set.reps <= 0) {
    return null;
  }

  const weightKg = set.weightKg ?? 0;
  return {
    achievedAt: set.performedAt,
    oneRepMaxKg: weightKg > 0 ? estimateOneRepMax(weightKg, set.reps) : null,
    reps: set.reps,
    rpe: typeof set.rpe === 'number' ? set.rpe : null,
    volumeKg: weightKg * set.reps,
    weightKg,
    workoutId: set.workoutId,
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

/** Every record this set beats, in priority order: 1RM, heaviest, volume, reps, easier RPE, then a bigger session. */
export function detectRecords(current: ScoredSet, prior: ScoredSet[], unit: WeightUnit): RecordHit[] {
  const best = bestsFromScored(prior);
  const hits: RecordHit[] = [];
  if (current.oneRepMaxKg != null && best.oneRepMax?.oneRepMaxKg != null && current.oneRepMaxKg > best.oneRepMax.oneRepMaxKg + WEIGHT_EPSILON_KG) {
    hits.push({
      detail: formatLoggedLoad(current.weightKg, current.reps, unit),
      kind: 'oneRepMax',
      title: `Estimated 1RM PR · ${formatEstimate(kgToDisplay(current.oneRepMaxKg, unit))} ${unit}`,
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
  if (current.rpe != null) {
    const hardest = prior
      .filter((set) => set.rpe != null && Math.abs(set.weightKg - current.weightKg) <= WEIGHT_EPSILON_KG && current.reps >= set.reps)
      .reduce<number | null>((min, set) => (min == null || (set.rpe ?? 10) < min ? set.rpe ?? null : min), null);
    if (hardest != null && current.rpe < hardest - RPE_EPSILON) {
      hits.push({
        detail: formatLoggedLoad(current.weightKg, current.reps, unit),
        kind: 'rpe',
        title: `RPE PR · ${current.rpe}`,
      });
    }
  }
  const session = sessionHit(current, prior, unit);
  if (session) {
    hits.push(session);
  }

  return hits;
}

/**
 * More work across the session than any earlier one: two singles after a best
 * of one single. The set that crosses the old total gets the star. A single
 * set that already beats that total stays a set record and is not repeated here.
 */
function sessionHit(current: ScoredSet, prior: ScoredSet[], unit: WeightUnit): RecordHit | null {
  let bestVolume = 0;
  let bestReps = 0;
  let earlierVolume = 0;
  let earlierReps = 0;
  let earlierCount = 0;
  const other = new Map<string, { reps: number; volumeKg: number }>();
  for (const set of prior) {
    if (set.workoutId === current.workoutId) {
      earlierVolume += set.volumeKg;
      earlierReps += set.reps;
      earlierCount += 1;
      continue;
    }
    const row = other.get(set.workoutId) ?? { reps: 0, volumeKg: 0 };
    row.volumeKg += set.volumeKg;
    row.reps += set.reps;
    other.set(set.workoutId, row);
  }
  for (const row of other.values()) {
    if (row.volumeKg > bestVolume) {
      bestVolume = row.volumeKg;
    }
    if (row.volumeKg <= 0 && row.reps > bestReps) {
      bestReps = row.reps;
    }
  }
  const sets = earlierCount + 1;
  if (bestVolume > 0) {
    const running = earlierVolume + current.volumeKg;
    const crossed = running > bestVolume + VOLUME_EPSILON_KG && earlierVolume <= bestVolume + VOLUME_EPSILON_KG;
    if (crossed && current.volumeKg <= bestVolume + VOLUME_EPSILON_KG) {
      return {
        detail: `${sets} sets`,
        kind: 'session',
        title: `Session PR · ${formatVolume(kgToDisplay(running, unit))} ${unit} · ${sets} sets`,
      };
    }
    return null;
  }
  const runningReps = earlierReps + current.reps;
  const crossedReps = bestReps > 0 && runningReps > bestReps && earlierReps <= bestReps;
  if (crossedReps && current.reps <= bestReps) {
    return {
      detail: `${sets} sets`,
      kind: 'session',
      title: `Session PR · ${runningReps} reps · ${sets} sets`,
    };
  }
  return null;
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

/** Sets logged on the same stack. Null matches other unknown stacks. */
export function filterSetsBySetup(sets: LoggedSet[], setup: string | null): LoggedSet[] {
  return sets.filter((set) => sameMachineSetup(set.machineSetup, setup));
}

/** Sets logged with the same cable attachment. Null matches "None". */
export function filterSetsByAttachment(sets: LoggedSet[], attachment: string | null): LoggedSet[] {
  return sets.filter((set) => (set.attachment ?? null) === attachment);
}

/**
 * Finished workouts that moved more weight than every earlier one.
 * The first workout with any volume sets the bar and is not a record.
 */
export function volumeRecordIds(workouts: Array<{ id: string; finishedAt: number; volumeKg: number }>): Set<string> {
  const ordered = [...workouts].sort((left, right) => left.finishedAt - right.finishedAt || left.id.localeCompare(right.id));
  const ids = new Set<string>();
  let best = 0;
  let seen = false;
  for (const workout of ordered) {
    if (workout.volumeKg <= 0) {
      continue;
    }
    if (seen && workout.volumeKg > best + VOLUME_EPSILON_KG) {
      ids.add(workout.id);
    }
    if (!seen || workout.volumeKg > best) {
      best = workout.volumeKg;
      seen = true;
    }
  }
  return ids;
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

/** Finished sets of one exercise, newest session first, in the order they were logged. */
export interface LoggedSession {
  workoutId: string;
  performedAt: number;
  sets: LoggedSet[];
}

export function groupLoggedSessions(sets: LoggedSet[]): LoggedSession[] {
  const groups = new Map<string, LoggedSet[]>();
  for (const set of sets) {
    if (!set.completed) {
      continue;
    }
    const group = groups.get(set.workoutId) ?? [];
    group.push(set);
    groups.set(set.workoutId, group);
  }

  const sessions: LoggedSession[] = [];
  for (const [workoutId, group] of groups) {
    const ordered = [...group].sort((left, right) => left.position - right.position);
    sessions.push({
      performedAt: ordered.reduce((latest, set) => Math.max(latest, set.performedAt), 0),
      sets: ordered,
      workoutId,
    });
  }

  return sessions.sort((left, right) => right.performedAt - left.performedAt);
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

  return `${metric === 'oneRepMax' ? formatEstimate(value) : formatWeight(value)} ${unit}`;
}

export function recordCardsFromSets(sets: LoggedSet[], unit: WeightUnit): RecordCard[] {
  const scored = sets.map(scoreLoggedSet).filter((set): set is ScoredSet => set != null);
  const best = bestsFromScored(scored);
  return [
    card('Est. 1RM', best.oneRepMax?.oneRepMaxKg == null ? null : `${formatEstimate(kgToDisplay(best.oneRepMax.oneRepMaxKg, unit))} ${unit}`, best.oneRepMax ? `from ${formatLoggedLoad(best.oneRepMax.weightKg, best.oneRepMax.reps, unit)}` : 'No weighted set yet', best.oneRepMax?.achievedAt ?? null),
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
  machineSetup?: string | null;
  attachment?: CableAttachment | null;
  rpe?: number | null;
}): LoggedSet {
  return { ...input, attachment: input.attachment ?? null, machineSetup: input.machineSetup ?? null, rpe: input.rpe ?? null };
}

function card(label: string, value: string | null, detail: string, achievedAt: number | null): RecordCard {
  return {
    achievedAt,
    detail,
    label,
    value: value ?? '—',
  };
}
