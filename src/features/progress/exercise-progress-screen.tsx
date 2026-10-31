/**
 * Records and the chart for one exercise. The 1RM / Weight / Volume chips
 * only change which number the line is plotting.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useStored, useWeightUnit } from '../../state/hooks';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { LineChart } from '../../components/line-chart';
import { Screen } from '../../components/screen';
import { getExercise, getExerciseLog } from '../../data/repository';
import { Chip } from '../../components/chip';
import { MovementFigure } from '../../components/movement-figure';
import { poseForExercise } from '../../domain/movement-pose';
import { formatDay, formatLoggedLoad } from '../../domain/format';
import { buildSessionStats, chartValues, filterSetsBySetup, formatMetricValue, groupLoggedSessions, metricValue, recordCardsFromSets } from '../../domain/metrics';
import { extraMachineSetups, formatMachineSetup, machineBrands, setTypeMark, usesMachineSetup, type ChartMetric, type LoggedSet } from '../../domain/types';
import { formatWeight } from '../../domain/units';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

const NO_SETS: LoggedSet[] = [];

const metrics: Array<{ id: ChartMetric; label: string }> = [
  { id: 'oneRepMax', label: '1RM' },
  { id: 'topSet', label: 'Weight' },
  { id: 'volume', label: 'Volume' },
];

export const ExerciseProgressScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ExerciseProgress'>>();
  const { unit } = useWeightUnit();
  const exercise = useStored(getExercise, route.params.exerciseId);
  const sets = useStored(getExerciseLog, route.params.exerciseId) ?? NO_SETS;
  const [metric, setMetric] = useState<ChartMetric>('oneRepMax');
  const [setup, setSetup] = useState<string | null>(() => (route.params.machineSetup !== undefined ? route.params.machineSetup : (exercise?.machineSetup ?? null)));
  const setups = useMemo(() => {
    const used = extraMachineSetups(sets.map((set) => set.machineSetup));
    const named = [...machineBrands.filter((brand) => sets.some((set) => set.machineSetup === brand)), ...used];
    return named;
  }, [sets]);
  const visibleSets = useMemo(
    () => (exercise && usesMachineSetup(exercise.equipment) ? filterSetsBySetup(sets, setup) : sets),
    [exercise, sets, setup],
  );

  const sessions = useMemo(() => buildSessionStats(visibleSets), [visibleSets]);
  const pastSessions = useMemo(() => groupLoggedSessions(visibleSets), [visibleSets]);
  const cards = useMemo(() => recordCardsFromSets(visibleSets, unit), [unit, visibleSets]);
  const points = useMemo(() => chartValues(sessions, metric, unit), [metric, sessions, unit]);
  const delta = points.length >= 2 ? (points[points.length - 1]?.value ?? 0) - (points[points.length - 2]?.value ?? 0) : null;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Progress" />
      {!exercise ? (
        <EmptyState message="This exercise is not in the library." title="Exercise missing" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
          <View style={styles.heading}>
            <MovementFigure pose={poseForExercise(exercise.id, exercise.name)} size={72} />
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{exercise.name}</Text>
              <Text style={styles.meta}>
                {exercise.muscleGroup} · {exercise.equipment}
              </Text>
            </View>
          </View>
          {usesMachineSetup(exercise.equipment) ? (
            <View style={styles.setups}>
              <Chip label={formatMachineSetup(null)} onSelect={setSetup} selected={setup == null} value={null} />
              {setups.map((name) => (
                <Chip key={name} label={name} onSelect={setSetup} selected={setup === name} value={name} />
              ))}
            </View>
          ) : null}
          <Text style={styles.pastHeading}>Past sets</Text>
          {pastSessions.length === 0 ? (
            <Text style={styles.empty}>Finished sets from earlier workouts show up here.</Text>
          ) : (
            pastSessions.map((session) => <PastSession key={session.workoutId} performedAt={session.performedAt} sets={session.sets} unit={unit} />)
          )}
          <View style={styles.grid}>
            {cards.map((card) => (
              <View key={card.label} style={styles.card}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardValue}>{card.value}</Text>
                <Text style={styles.cardDetail}>{card.detail}</Text>
              </View>
            ))}
          </View>
          <View style={styles.metricRow}>
            {metrics.map((item) => (
              <MetricChip key={item.id} metric={item.id} label={item.label} onSelect={setMetric} selected={metric === item.id} />
            ))}
          </View>
          <LineChart caption={`${metrics.find((item) => item.id === metric)?.label ?? 'Progress'} in ${unit}`} points={points} />
          {delta == null ? <Text style={styles.delta}>Log another session to see the change.</Text> : <DeltaText delta={delta} metric={metric} unit={unit} />}
        </ScrollView>
      )}
    </Screen>
  );
};

interface DeltaTextProps {
  delta: number;
  metric: ChartMetric;
  unit: 'kg' | 'lb';
}

const DeltaText: React.FC<DeltaTextProps> = ({ delta, metric, unit }) => {
  const sign = delta > 0 ? '+' : '';
  return (
    <Text style={[styles.delta, delta > 0 ? styles.up : delta < 0 ? styles.down : null]}>
      {sign}
      {formatMetricValue(delta, unit, metric)} vs last session
    </Text>
  );
};

const PastSession: React.FC<{ performedAt: number; sets: LoggedSet[]; unit: 'kg' | 'lb' }> = ({ performedAt, sets, unit }) => {
  let workingNumber = 0;
  return (
    <View style={styles.session}>
      <Text style={styles.sessionDate}>{formatDay(performedAt)}</Text>
      {sets.map((set, index) => {
        const warmup = set.setType === 'warmup';
        if (!warmup) {
          workingNumber += 1;
        }
        const mark = setTypeMark(set.setType) ?? String(workingNumber);
        return (
          <Text key={`${set.position}-${index}`} style={styles.sessionSet}>
            {mark}  {formatLoggedLoad(set.weightKg, set.reps, unit)}
            {set.rpe != null ? `  ·  ${formatWeight(set.rpe)}` : ''}
          </Text>
        );
      })}
    </View>
  );
};

interface MetricChipProps {
  metric: ChartMetric;
  label: string;
  selected: boolean;
  onSelect: (metric: ChartMetric) => void;
}

const MetricChip: React.FC<MetricChipProps> = ({ metric, label, selected, onSelect }) => {
  const handlePress = useCallback(() => {
    onSelect(metric);
  }, [metric, onSelect]);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={handlePress} style={[styles.metric, selected && styles.metricSelected]}>
      <Text style={[styles.metricText, selected && styles.metricTextSelected]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    width: '48%',
  },
  cardDetail: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  cardLabel: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  pastHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 20,
  },
  delta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  down: {
    color: colors.danger,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  headingCopy: {
    flex: 1,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  metric: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    paddingVertical: 8,
  },
  metricRow: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    marginTop: 18,
    padding: 3,
  },
  metricSelected: {
    backgroundColor: colors.accent,
  },
  metricText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  metricTextSelected: {
    color: colors.accentInk,
  },
  setups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  session: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  sessionDate: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sessionSet: {
    color: colors.muted,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  up: {
    color: colors.success,
  },
});
