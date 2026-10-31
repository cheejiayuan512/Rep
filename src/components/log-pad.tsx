/**
 * The keypad for a set. Weight and reps get digits, Next, and a nudge.
 * RPE swaps the digits for a 6–10 scale and a line about reps left.
 * Notes and other screens keep the system keyboard.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backspaceKey, nudgeLogValue, RPE_SCALE, rpeHint, typeKey, type LogFieldKind } from '../domain/log-pad';
import { formatWeight, parseRpe } from '../domain/units';
import type { WeightUnit } from '../domain/types';
import { colors } from '../theme/colors';
import { KeyboardHideIcon } from './icons';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

/** Used until the pad has been measured, so the list can clear it on the first frame. */
export const LOG_PAD_FALLBACK = 300;

interface RpeLink {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

interface FieldLinks {
  weightId: string;
  repsId: string;
  rpe: RpeLink | null;
}

interface LogTarget {
  kind: LogFieldKind;
  order: number;
  value: string;
  unit: WeightUnit;
  onChange: (value: string) => void;
  links: FieldLinks;
  node: ViewInstance | null;
}

interface LogPadContextValue {
  activeId: string | null;
  mode: 'number' | 'effort';
  height: number;
  register: (id: string, target: React.MutableRefObject<LogTarget>) => void;
  unregister: (id: string) => void;
  activate: (id: string) => void;
  dismiss: () => void;
  snapshot: () => LogTarget | null;
  scrollRef: React.RefObject<ScrollViewInstance | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  typeDigit: (key: string) => void;
  erase: () => void;
  nudge: (direction: -1 | 1) => void;
  pickRpe: (value: number) => void;
  goNext: () => void;
  showEffort: () => void;
  showNumbers: () => void;
  setMeasuredHeight: (height: number) => void;
  bindPad: (node: ViewInstance | null) => void;
}

const LogPadContext = createContext<LogPadContextValue | null>(null);

function useLogPad(): LogPadContextValue {
  const pad = useContext(LogPadContext);
  if (!pad) {
    throw new Error('Log fields have to sit inside LogPadProvider');
  }
  return pad;
}

export function useLogPadLayout(): {
  open: boolean;
  height: number;
  scrollRef: React.RefObject<ScrollViewInstance | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
  const pad = useLogPad();
  return {
    // The RPE scale is shorter than the number pad. Once measured, use that
    // height so the rest bar sits on the keys instead of a fixed 300px gap.
    height: pad.activeId ? (pad.height > 0 ? pad.height : LOG_PAD_FALLBACK) : 0,
    onScroll: pad.onScroll,
    open: pad.activeId != null,
    scrollRef: pad.scrollRef,
  };
}

export const LogPadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targets = useRef(new Map<string, React.MutableRefObject<LogTarget>>());
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const offsetRef = useRef(0);
  const padNode = useRef<ViewInstance | null>(null);
  const heightRef = useRef(0);
  const armedRef = useRef(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<'number' | 'effort'>('number');
  const [height, setHeight] = useState(0);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const read = useCallback((id: string | null) => (id ? (targets.current.get(id)?.current ?? null) : null), []);

  const reveal = useCallback((node: ViewInstance | null) => {
    requestAnimationFrame(() => {
      node?.measureInWindow((_x, y, _width, nodeHeight) => {
        const fallbackTop = Dimensions.get('window').height - Math.max(heightRef.current, LOG_PAD_FALLBACK);
        const place = (padTop: number) => {
          const overflow = y + nodeHeight + 16 - padTop;
          if (overflow > 8) {
            scrollRef.current?.scrollTo({ animated: true, y: offsetRef.current + overflow });
          }
        };
        if (!padNode.current) {
          place(fallbackTop);
          return;
        }
        padNode.current.measureInWindow((_padX, padTop) => {
          place(padTop > 0 ? padTop : fallbackTop);
        });
      });
    });
  }, []);

  const activate = useCallback(
    (id: string) => {
      const target = read(id);
      if (!target) {
        return;
      }
      Keyboard.dismiss();
      armedRef.current = true;
      setActiveId(id);
      setMode(target.kind === 'rpe' ? 'effort' : 'number');
      reveal(target.node);
    },
    [read, reveal],
  );

  const dismiss = useCallback(() => {
    setActiveId(null);
    setMode('number');
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      if (activeRef.current) {
        setActiveId(null);
        setMode('number');
      }
    });
    return () => show.remove();
  }, []);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const register = useCallback((id: string, target: React.MutableRefObject<LogTarget>) => {
    targets.current.set(id, target);
  }, []);

  const unregister = useCallback((id: string) => {
    targets.current.delete(id);
    if (activeRef.current === id) {
      setActiveId(null);
    }
  }, []);

  const typeDigit = useCallback(
    (key: string) => {
      const target = read(activeRef.current);
      if (!target || target.kind === 'rpe') {
        return;
      }
      const next = typeKey(target.value, key, target.kind, armedRef.current);
      if (next == null) {
        return;
      }
      armedRef.current = false;
      target.value = next;
      target.onChange(next);
    },
    [read],
  );

  const erase = useCallback(() => {
    const target = read(activeRef.current);
    if (!target || target.kind === 'rpe') {
      return;
    }
    const next = backspaceKey(target.value, armedRef.current, target.kind);
    armedRef.current = false;
    target.value = next;
    target.onChange(next);
  }, [read]);

  const writeRpe = useCallback((target: LogTarget, text: string) => {
    const linked = target.links.rpe ? targets.current.get(target.links.rpe.id) : undefined;
    if (linked) {
      linked.current.value = text;
    }
    if (target.links.rpe) {
      target.links.rpe.value = text;
    }
    if (target.kind === 'rpe') {
      target.value = text;
      target.onChange(text);
      return;
    }
    target.links.rpe?.onChange(text);
  }, []);

  const nudge = useCallback(
    (direction: -1 | 1) => {
      const target = read(activeRef.current);
      if (!target) {
        return;
      }
      if (mode === 'effort' || target.kind === 'rpe') {
        const current = target.kind === 'rpe' ? target.value : (target.links.rpe?.value ?? '');
        writeRpe(target, nudgeLogValue(current, direction, 'rpe', target.unit));
        return;
      }
      armedRef.current = true;
      target.value = nudgeLogValue(target.value, direction, target.kind, target.unit);
      target.onChange(target.value);
    },
    [mode, read, writeRpe],
  );

  const pickRpe = useCallback(
    (value: number) => {
      const target = read(activeRef.current);
      if (!target) {
        return;
      }
      writeRpe(target, formatWeight(value));
    },
    [read, writeRpe],
  );

  const goNext = useCallback(() => {
    const ordered = [...targets.current.entries()].sort((left, right) => left[1].current.order - right[1].current.order || left[0].localeCompare(right[0]));
    const index = ordered.findIndex(([fieldId]) => fieldId === activeRef.current);
    const next = ordered[index + 1];
    if (!next) {
      dismiss();
      return;
    }
    activate(next[0]);
  }, [activate, dismiss]);

  const showEffort = useCallback(() => {
    const target = read(activeRef.current);
    if (!target?.links.rpe) {
      return;
    }
    if (targets.current.has(target.links.rpe.id)) {
      activate(target.links.rpe.id);
      return;
    }
    setMode('effort');
  }, [activate, read]);

  const showNumbers = useCallback(() => {
    const target = read(activeRef.current);
    if (target?.kind === 'rpe') {
      activate(target.links.repsId);
      return;
    }
    setMode('number');
  }, [activate, read]);

  const setMeasuredHeight = useCallback((next: number) => {
    heightRef.current = next;
    setHeight(next);
  }, []);

  const bindPad = useCallback((node: ViewInstance | null) => {
    padNode.current = node;
  }, []);

  const snapshot = useCallback(() => read(activeRef.current), [read]);

  const value = useMemo<LogPadContextValue>(
    () => ({
      activate,
      activeId,
      bindPad,
      dismiss,
      erase,
      goNext,
      height,
      mode,
      nudge,
      onScroll,
      pickRpe,
      register,
      scrollRef,
      setMeasuredHeight,
      showEffort,
      showNumbers,
      snapshot,
      typeDigit,
      unregister,
    }),
    [activate, activeId, bindPad, dismiss, erase, goNext, height, mode, nudge, onScroll, pickRpe, register, setMeasuredHeight, showEffort, showNumbers, snapshot, typeDigit, unregister],
  );

  return <LogPadContext.Provider value={value}>{children}</LogPadContext.Provider>;
};

interface LogValueProps {
  accessibilityLabel: string;
  id: string;
  kind: LogFieldKind;
  order: number;
  value: string;
  onChange: (value: string) => void;
  unit: WeightUnit;
  links: FieldLinks;
  style?: StyleProp<ViewStyle>;
}

export const LogValue: React.FC<LogValueProps> = ({ accessibilityLabel, id, kind, links, onChange, order, style, unit, value }) => {
  const { activate, activeId, register, unregister } = useLogPad();
  const targetRef = useRef<LogTarget>({ kind, links, node: null, onChange, order, unit, value });
  targetRef.current.kind = kind;
  targetRef.current.links = links;
  targetRef.current.onChange = onChange;
  targetRef.current.order = order;
  targetRef.current.unit = unit;
  targetRef.current.value = value;

  useEffect(() => {
    register(id, targetRef);
    return () => unregister(id);
  }, [id, register, unregister]);

  const onPress = useCallback(() => {
    activate(id);
  }, [activate, id]);
  const setNode = useCallback((node: ViewInstance | null) => {
    targetRef.current.node = node;
  }, []);

  return (
    <Pressable
      accessibilityLabel={value.length > 0 ? `${accessibilityLabel}, ${value}` : accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: activeId === id }}
      collapsable={false}
      onPress={onPress}
      ref={setNode}
      style={[styles.value, activeId === id && styles.valueFocused, style]}
    >
      <Text style={[styles.valueText, value.length === 0 && styles.placeholder]}>{value.length === 0 ? '—' : value}</Text>
    </Pressable>
  );
};

interface KeyProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  accent?: boolean;
  tall?: boolean;
}

const Key: React.FC<KeyProps> = ({ accessibilityLabel, accent, label, onPress, tall }) => (
  <Pressable
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.key, tall && styles.keyTall, accent && styles.keyAccent, pressed && (accent ? styles.keyAccentPressed : styles.keyPressed)]}
  >
    <Text style={[styles.keyText, accent && styles.keyTextAccent, label.length > 2 && styles.keyTextSmall]}>{label}</Text>
  </Pressable>
);

interface NumberKeysProps {
  kind: 'weight' | 'reps' | 'distance' | 'duration';
  onDigit: (key: string) => void;
  onBackspace: () => void;
  onNext: () => void;
  onNudge: (direction: -1 | 1) => void;
  onEffort: (() => void) | null;
}

const NumberKeys: React.FC<NumberKeysProps> = ({ kind, onBackspace, onDigit, onEffort, onNext, onNudge }) => {
  const decrease = useCallback(() => onNudge(-1), [onNudge]);
  const increase = useCallback(() => onNudge(1), [onNudge]);
  const typeDecimal = useCallback(() => onDigit('.'), [onDigit]);
  const typeZero = useCallback(() => onDigit('0'), [onDigit]);
  return (
    <View style={styles.body}>
      <View style={styles.grid}>
        {DIGIT_ROWS.map((row) => (
          <View key={row.join('')} style={styles.keyRow}>
            {row.map((digit) => (
              <DigitKey digit={digit} key={digit} onDigit={onDigit} />
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          {kind === 'weight' || kind === 'distance' ? (
            <Key accessibilityLabel="Decimal point" label="." onPress={typeDecimal} />
          ) : (
            <View style={styles.keyGap} />
          )}
          <Key label="0" onPress={typeZero} />
          <Key accessibilityLabel="Delete" label="⌫" onPress={onBackspace} />
        </View>
      </View>
      <View style={styles.rail}>
        <Key accent label="Next" onPress={onNext} tall />
        <View style={styles.keyRow}>
          <Key accessibilityLabel="Decrease" label="−" onPress={decrease} />
          <Key accessibilityLabel="Increase" label="+" onPress={increase} />
        </View>
        {onEffort ? <Key label="RPE" onPress={onEffort} /> : <View style={styles.keyGap} />}
      </View>
    </View>
  );
};

const DigitKey: React.FC<{ digit: string; onDigit: (key: string) => void }> = ({ digit, onDigit }) => {
  const onPress = useCallback(() => onDigit(digit), [digit, onDigit]);
  return <Key label={digit} onPress={onPress} />;
};

interface EffortKeysProps {
  hint: string;
  selected: number | null;
  onPick: (value: number) => void;
  onNumbers: () => void;
  onNext: () => void;
  onNudge: (direction: -1 | 1) => void;
}

const EffortKeys: React.FC<EffortKeysProps> = ({ hint, onNext, onNumbers, onNudge, onPick, selected }) => {
  const decrease = useCallback(() => onNudge(-1), [onNudge]);
  const increase = useCallback(() => onNudge(1), [onNudge]);
  const selectedText = selected == null ? null : formatWeight(selected);
  return (
    <View style={styles.effort}>
      <Text style={styles.hint}>{hint}</Text>
      <ScrollView horizontal contentContainerStyle={styles.scale} keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
        {RPE_SCALE.map((step) => (
          <RpeChip key={step} onPick={onPick} selected={selectedText === formatWeight(step)} step={step} />
        ))}
      </ScrollView>
      <View style={styles.effortActions}>
        <Key label="123" onPress={onNumbers} />
        <Key accessibilityLabel="Decrease" label="−" onPress={decrease} />
        <Key accessibilityLabel="Increase" label="+" onPress={increase} />
        <Key accent label="Next" onPress={onNext} />
      </View>
    </View>
  );
};

const RpeChip: React.FC<{ step: number; selected: boolean; onPick: (value: number) => void }> = ({ onPick, selected, step }) => {
  const onPress = useCallback(() => onPick(step), [onPick, step]);
  return (
    <Pressable accessibilityLabel={`RPE ${formatWeight(step)}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{formatWeight(step)}</Text>
    </Pressable>
  );
};

interface LogPadProps {
  /** Workout draws no home-indicator padding of its own. A routine screen already does. */
  safeBottom?: boolean;
}

export const LogPad: React.FC<LogPadProps> = ({ safeBottom = true }) => {
  const pad = useLogPad();
  const insets = useSafeAreaInsets();
  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      pad.setMeasuredHeight(event.nativeEvent.layout.height);
    },
    [pad],
  );
  const setNode = useCallback(
    (node: ViewInstance | null) => {
      pad.bindPad(node);
    },
    [pad],
  );
  const active = pad.activeId ? pad.snapshot() : null;
  if (!active) {
    return null;
  }

  const effort = pad.mode === 'effort' || active.kind === 'rpe';
  const rpeText = active.kind === 'rpe' ? active.value : (active.links.rpe?.value ?? '');
  const label = effort ? 'Effort' : active.kind === 'duration' ? 'Time' : active.kind === 'distance' ? 'Distance' : active.kind === 'reps' ? 'Reps' : 'Weight';

  return (
    <View collapsable={false} onLayout={onLayout} ref={setNode} style={[styles.pad, { left: insets.left, paddingBottom: safeBottom ? Math.max(insets.bottom, 8) : 8, right: insets.right }]}>
      <View style={styles.header}>
        <Text style={styles.field}>{label}</Text>
        <Pressable accessibilityLabel="Hide keyboard" accessibilityRole="button" hitSlop={8} onPress={pad.dismiss} style={styles.hide}>
          <KeyboardHideIcon color={colors.muted} size={20} />
        </Pressable>
      </View>
      {effort ? (
        <EffortKeys hint={rpeHint(parseRpe(rpeText))} onNext={pad.goNext} onNumbers={pad.showNumbers} onNudge={pad.nudge} onPick={pad.pickRpe} selected={parseRpe(rpeText)} />
      ) : (
        <NumberKeys
          kind={active.kind === 'reps' || active.kind === 'duration' || active.kind === 'distance' ? active.kind : 'weight'}
          onBackspace={pad.erase}
          onDigit={pad.typeDigit}
          onEffort={active.links.rpe ? pad.showEffort : null}
          onNext={pad.goNext}
          onNudge={pad.nudge}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    gap: 8,
    height: 232,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    minWidth: 40,
    paddingHorizontal: 6,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.accentInk,
  },
  effort: {
    gap: 10,
  },
  effortActions: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
  },
  field: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  grid: {
    flex: 1,
    gap: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 28,
  },
  hide: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 36,
  },
  hint: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    minHeight: 22,
  },
  key: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    flex: 1,
    height: 52,
    justifyContent: 'center',
  },
  keyAccent: {
    backgroundColor: colors.accent,
  },
  keyAccentPressed: {
    backgroundColor: colors.accentPressed,
  },
  keyGap: {
    flex: 1,
    height: 52,
  },
  keyPressed: {
    backgroundColor: colors.border,
  },
  keyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keyTall: {
    height: 112,
  },
  keyText: {
    color: colors.text,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  keyTextAccent: {
    color: colors.accentInk,
    fontSize: 17,
    fontWeight: '800',
  },
  keyTextSmall: {
    fontSize: 16,
    fontWeight: '800',
  },
  pad: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  placeholder: {
    color: colors.faint,
    fontWeight: '600',
  },
  rail: {
    gap: 8,
    width: 108,
  },
  scale: {
    flexGrow: 1,
    gap: 6,
  },
  value: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
  },
  valueFocused: {
    borderColor: colors.accent,
  },
  valueText: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
