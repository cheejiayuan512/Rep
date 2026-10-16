import React, { useCallback, useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View, type SectionListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useWeightUnit, useWorkoutSummaries } from '../../state/hooks';
import { EmptyState } from '../../components/empty-state';
import { Screen } from '../../components/screen';
import { formatDuration, formatMonth, formatWorkoutWhen, summarizeNames } from '../../domain/format';
import { formatVolume, kgToDisplay } from '../../domain/units';
import type { WorkoutSummary } from '../../domain/types';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';

interface HistorySection {
  title: string;
  data: WorkoutSummary[];
}

function workoutKey(workout: WorkoutSummary): string {
  return workout.id;
}

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation<'History'>>();
  const workouts = useWorkoutSummaries();
  const { unit } = useWeightUnit();
  const sections = useMemo(() => groupByMonth(workouts), [workouts]);

  const handleOpen = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<WorkoutSummary, HistorySection>) => <HistoryCard onOpen={handleOpen} unit={unit} workout={item} />,
    [handleOpen, unit],
  );

  const renderSectionHeader = useCallback(({ section }: { section: HistorySection }) => <Text style={styles.month}>{section.title}</Text>, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Finished sessions stay on this device.</Text>
      </View>
      <SectionList
        style={styles.fill}
        contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.list}
        keyExtractor={workoutKey}
        ListEmptyComponent={<EmptyState message="Finish a workout and the session will land here." title="No workouts yet" />}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        sections={sections}
        stickySectionHeadersEnabled={false}
      />
    </Screen>
  );
};

function groupByMonth(workouts: WorkoutSummary[]): HistorySection[] {
  const groups = new Map<string, WorkoutSummary[]>();
  for (const workout of workouts) {
    const title = formatMonth(workout.finishedAt);
    const existing = groups.get(title);
    if (existing) {
      existing.push(workout);
    } else {
      groups.set(title, [workout]);
    }
  }

  return [...groups.entries()].map(([title, data]) => ({ data, title }));
}

interface HistoryCardProps {
  workout: WorkoutSummary;
  unit: 'kg' | 'lb';
  onOpen: (workoutId: string) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = React.memo(function HistoryCard({ workout, unit, onOpen }) {
  const handlePress = useCallback(() => {
    onOpen(workout.id);
  }, [onOpen, workout.id]);

  return (
    <Pressable onPress={handlePress} style={styles.card}>
      <Text style={styles.name}>{workout.name}</Text>
      <Text style={styles.meta}>{formatWorkoutWhen(workout.finishedAt)}</Text>
      <Text numberOfLines={2} style={styles.exercises}>
        {summarizeNames(workout.exerciseNames)}
      </Text>
      <Text style={styles.meta}>
        {formatVolume(kgToDisplay(workout.volumeKg, unit))} {unit} · {workout.setCount} sets · {formatDuration(workout.startedAt, workout.finishedAt)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  exercises: {
    color: colors.text,
    fontSize: 14,
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: {
    padding: 20,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  month: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
  },
});
