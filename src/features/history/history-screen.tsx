/**
 * Finished workouts, grouped by month. Only workouts with a finish time appear here.
 * Export, import, backup, and restore live under Profile → Settings.
 */
import React, { useCallback, useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View, type SectionListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { formatSessionLoad } from '../../domain/cardio';
import { useWeightUnit, useWorkoutSummaries } from '../../state/hooks';
import { EmptyState } from '../../components/empty-state';
import { Screen } from '../../components/screen';
import { formatDuration, formatMonth, formatWorkoutWhen } from '../../domain/format';
import type { WorkoutSummary } from '../../domain/types';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { screenTitle, screenTitleInset } from '../../theme/layout';
import { hitTarget, space } from '../../theme/spacing';
import { type } from '../../theme/typography';

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
    ({ item }: SectionListRenderItemInfo<WorkoutSummary, HistorySection>) => <HistoryRow onOpen={handleOpen} unit={unit} workout={item} />,
    [handleOpen, unit],
  );

  const renderSectionHeader = useCallback(({ section }: { section: HistorySection }) => <Text style={styles.month}>{section.title}</Text>, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>
      <SectionList
        style={styles.fill}
        contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.list}
        keyExtractor={workoutKey}
        ListEmptyComponent={
          <EmptyState message="Finish a workout and the sessions will land here. Import or restore a log from Profile → Settings." title="No workouts yet" />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        sections={sections}
        stickySectionHeadersEnabled={false}
        windowSize={7}
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

interface HistoryRowProps {
  workout: WorkoutSummary;
  unit: 'kg' | 'lb';
  onOpen: (workoutId: string) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = React.memo(function HistoryRow({ workout, unit, onOpen }) {
  const handlePress = useCallback(() => {
    onOpen(workout.id);
  }, [onOpen, workout.id]);

  const meta = [
    formatWorkoutWhen(workout.finishedAt),
    formatDuration(workout.startedAt, workout.finishedAt),
    formatSessionLoad(workout.volumeKg, workout.cardioSeconds, workout.cardioKm, unit),
  ].join(' · ');

  return (
    <Pressable accessibilityLabel={`${workout.name}, ${meta}`} accessibilityRole="button" onPress={handlePress} style={styles.row}>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.name}>
          {workout.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      </View>
      {workout.recordCount > 0 ? (
        <Text style={styles.prBadge}>
          {workout.recordCount} {workout.recordCount === 1 ? 'PR' : 'PRs'}
        </Text>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  header: {
    ...screenTitleInset,
  },
  list: {
    paddingBottom: space.xl,
    paddingHorizontal: space.lg,
  },
  meta: {
    ...type.footnote,
    color: colors.muted,
    marginTop: 2,
  },
  month: {
    ...type.caption1,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: space.xs,
    marginTop: space.md,
    textTransform: 'uppercase',
  },
  name: {
    ...type.headline,
    color: colors.text,
  },
  prBadge: {
    ...type.caption1,
    backgroundColor: colors.accent,
    borderRadius: 999,
    color: colors.accentInk,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    minHeight: hitTarget,
    paddingVertical: space.sm,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...screenTitle,
  },
});
