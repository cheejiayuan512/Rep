/**
 * Records and the chart for one exercise. The 1RM / Weight / Volume chips
 * only change which number the line is plotting.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useRevision, useWeightUnit } from '../../state/hooks';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { LineChart } from '../../components/line-chart';
import { Screen } from '../../components/screen';
import { getExercise, getExerciseLog } from '../../data/repository';
import { formatDay, formatLoggedLoad } from '../../domain/format';
import { buildSessionStats, chartValues, formatMetricValue, metricValue, recordCardsFromSets } from '../../domain/metrics';
import type { ChartMetric, Exercise, LoggedSet } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

const metrics: Array<{ id: ChartMetric; label: string }> = [
  { id: 'oneRepMax', label: '1RM' },
  { id: 'topSet', label: 'Weight' },
  { id: 'volume', label: 'Volume' },
];

export const ExerciseProgressScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ExerciseProgress'>>();
  const revision = useRevision();
  const { unit } = useWeightUnit();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [metric, setMetric] = useState<ChartMetric>('oneRepMax');

  useEffect(() => {
    let cancel = false;
    void Promise.all([getExercise(route.params.exerciseId), getExerciseLog(route.params.exerciseId)]).then(([loadedExercise, loadedSets]) => {
      if (!cancel) {
        setExercise(loadedExercise);
        setSets(loadedSets);
      }
    });
    return () => {
      cancel = true;
    };
  }, [revision, route.params.exerciseId]);

  const sessions = useMemo(() => buildSessionStats(sets), [sets]);
  const cards = useMemo(() => recordCardsFromSets(sets, unit), [sets, unit]);
  const points = useMemo(() => chartValues(sessions, metric, unit), [metric, sessions, unit]);
  const delta = points.length >= 2 ? (points[points.length - 1]?.value ?? 0) - (points[points.length - 2]?.value ?? 0) : null;

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Progress" />
      {!exercise ? (
        <EmptyState message="This exercise is not in the library." title="Exercise missing" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
          <Text style={styles.title}>{exercise.name}</Text>
          <Text style={styles.meta}>
            {exercise.muscleGroup} · {exercise.equipment}
          </Text>
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
          <LineChart points={points} />
          {delta == null ? <Text style={styles.delta}>Log another session to see the change.</Text> : <DeltaText delta={delta} metric={metric} unit={unit} />}
          {sessions.slice().reverse().map((session) => (
            <View key={session.workoutId} style={styles.session}>
              <View>
                <Text style={styles.sessionDate}>{formatDay(session.performedAt)}</Text>
                <Text style={styles.sessionSet}>{formatLoggedLoad(session.highlightKg, session.highlightReps, unit)}</Text>
              </View>
              <Text style={styles.sessionValue}>{formatMetricValue(metricValue(session, metric, unit), unit, metric)}</Text>
            </View>
          ))}
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
    <Pressable onPress={handlePress} style={[styles.metric, selected && styles.metricSelected]}>
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
  session: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sessionDate: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sessionSet: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  sessionValue: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
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
