/**
 * The stacks a machine or cable card can switch between.
 * Used brands (most recent first) sit above unused built-in names.
 */
import { filterSetsBySetup, latestSessionSets } from './metrics';
import { machineBrands, type LoggedSet, type SetType } from './types';

export interface MachineSetupLast {
  weightKg: number | null;
  reps: number | null;
  setType: SetType;
}

export interface MachineSetupOption {
  setup: string | null;
  last: MachineSetupLast | null;
  /** When this stack was last trained. Null means never. */
  usedAt: number | null;
}

export function machineSetupKey(setup: string | null | undefined): string {
  return setup ?? '';
}

export function machineSetupOptions(history: LoggedSet[]): MachineSetupOption[] {
  const setups = new Map<string, string | null>();
  setups.set('', null);
  for (const brand of machineBrands) {
    setups.set(brand, brand);
  }
  for (const set of history) {
    if (!set.completed) {
      continue;
    }
    setups.set(machineSetupKey(set.machineSetup), set.machineSetup ?? null);
  }

  const options: MachineSetupOption[] = [];
  for (const setup of setups.values()) {
    const session = latestSessionSets(filterSetsBySetup(history, setup));
    const preview = session.find((set) => set.setType !== 'warmup') ?? session[0] ?? null;
    options.push({
      last: preview ? { reps: preview.reps, setType: preview.setType, weightKg: preview.weightKg } : null,
      setup,
      usedAt: preview?.performedAt ?? null,
    });
  }

  return options.sort(compareSetupOptions);
}

function compareSetupOptions(left: MachineSetupOption, right: MachineSetupOption): number {
  if (left.usedAt != null && right.usedAt != null && left.usedAt !== right.usedAt) {
    return right.usedAt - left.usedAt;
  }
  if (left.usedAt != null && right.usedAt == null) {
    return -1;
  }
  if (left.usedAt == null && right.usedAt != null) {
    return 1;
  }
  return unusedRank(left.setup) - unusedRank(right.setup);
}

function unusedRank(setup: string | null): number {
  if (setup == null) {
    return machineBrands.length + 1;
  }
  const index = (machineBrands as readonly string[]).indexOf(setup);
  return index >= 0 ? index : machineBrands.length;
}
