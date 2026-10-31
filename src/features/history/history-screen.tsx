/**
 * Finished workouts, grouped by month. Only workouts with a finish time appear here.
 * Import past sessions from a Hevy, Strong, Jefit, or FitNotes CSV export.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, Share, StyleSheet, Text, View, type SectionListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

import { importWorkoutCsv, listWorkoutsForExport } from '../../data/repository';
import { formatSessionLoad } from '../../domain/cardio';
import { workoutsToCsv } from '../../domain/log-export';
import { useWeightUnit, useWorkoutSummaries } from '../../state/hooks';
import { dataChanged, useAppDispatch } from '../../state/store';
import { EmptyState } from '../../components/empty-state';
import { Screen } from '../../components/screen';
import { formatDuration, formatLoggedLoad, formatMonth, formatWorkoutWhen } from '../../domain/format';
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
  const dispatch = useAppDispatch();
  const workouts = useWorkoutSummaries();
  const { unit } = useWeightUnit();
  const sections = useMemo(() => groupByMonth(workouts), [workouts]);
  const [importing, setImporting] = useState(false);

  const handleOpen = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

  const handleImportCsv = useCallback(async () => {
    if (importing) {
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) {
        return;
      }

      setImporting(true);
      const response = await fetch(picked.assets[0].uri);
      const csvText = await response.text();
      const summary = await importWorkoutCsv(csvText);
      dispatch(dataChanged());

      const parts = [
        summary.importedWorkouts === 1 ? '1 workout imported' : `${summary.importedWorkouts} workouts imported`,
      ];
      if (summary.skippedDuplicates > 0) {
        parts.push(`${summary.skippedDuplicates} already in History`);
      }
      if (summary.createdExercises > 0) {
        parts.push(`${summary.createdExercises} new exercises added`);
      }
      if (summary.skippedCardioRows > 0) {
        parts.push(`${summary.skippedCardioRows} cardio rows skipped`);
      }
      Alert.alert(`${summary.sourceLabel} import`, parts.join('. ') + '.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not import that file.';
      Alert.alert('Import failed', message);
    } finally {
      setImporting(false);
    }
  }, [dispatch, importing]);

  const handleExportCsv = useCallback(async () => {
    const rows = listWorkoutsForExport.now();
    if (!rows || rows.length === 0) {
      Alert.alert('Nothing to export', 'Finish a workout first.');
      return;
    }
    try {
      await Share.share({ message: workoutsToCsv(rows), title: 'Rep workouts.csv' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && !/cancel|abort/i.test(message)) {
        Alert.alert('Export failed', message);
      }
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<WorkoutSummary, HistorySection>) => <HistoryCard onOpen={handleOpen} unit={unit} workout={item} />,
    [handleOpen, unit],
  );

  const renderSectionHeader = useCallback(({ section }: { section: HistorySection }) => <Text style={styles.month}>{section.title}</Text>, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>History</Text>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" onPress={() => void handleExportCsv()} style={styles.importButton}>
              <Text style={styles.importLabel}>Export CSV</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={importing} onPress={() => void handleImportCsv()} style={styles.importButton}>
              <Text style={styles.importLabel}>{importing ? 'Importing…' : 'Import CSV'}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>Finished sessions stay on this device. Export writes kilograms in Strong's columns. Import reads Hevy, Strong, Jefit, or FitNotes.</Text>
      </View>
      <SectionList
        style={styles.fill}
        contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.list}
        keyExtractor={workoutKey}
        ListEmptyComponent={<EmptyState message="Finish a workout or import a CSV and the sessions will land here." title="No workouts yet" />}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
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

interface HistoryCardProps {
  workout: WorkoutSummary;
  unit: 'kg' | 'lb';
  onOpen: (workoutId: string) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = React.memo(function HistoryCard({ workout, unit, onOpen }) {
  const handlePress = useCallback(() => {
    onOpen(workout.id);
  }, [onOpen, workout.id]);

  const shown = workout.exercises.slice(0, MAX_LINES);
  const hidden = workout.exercises.length - shown.length;

  return (
    <Pressable accessibilityLabel={`${workout.name}, ${formatWorkoutWhen(workout.finishedAt)}`} accessibilityRole="button" onPress={handlePress} style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <Text numberOfLines={1} style={styles.name}>
            {workout.name}
          </Text>
          <Text style={styles.meta}>{formatWorkoutWhen(workout.finishedAt)}</Text>
        </View>
        {workout.recordCount > 0 ? (
          <Text style={styles.prBadge}>
            {workout.recordCount} {workout.recordCount === 1 ? 'PR' : 'PRs'}
          </Text>
        ) : null}
      </View>
      <View style={styles.statRow}>
        <StatPill label={formatDuration(workout.startedAt, workout.finishedAt)} />
        <StatPill label={formatSessionLoad(workout.volumeKg, workout.cardioSeconds, workout.cardioKm, unit)} />
        <StatPill label={`${workout.setCount} ${workout.setCount === 1 ? 'set' : 'sets'}`} />
      </View>
      <View style={styles.lines}>
        {shown.map((exercise, index) => (
          <View key={`${exercise.name}-${index}`} style={styles.line}>
            <Text numberOfLines={1} style={styles.lineName}>
              <Text style={styles.lineCount}>{exercise.sets} × </Text>
              {exercise.name}
            </Text>
            <Text style={styles.lineBest}>{exercise.best ? formatLoggedLoad(exercise.best.weightKg, exercise.best.reps, unit) : '—'}</Text>
          </View>
        ))}
        {hidden > 0 ? <Text style={styles.more}>+{hidden} more</Text> : null}
      </View>
    </Pressable>
  );
});

const MAX_LINES = 4;

const StatPill: React.FC<{ label: string }> = ({ label }) => {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardHead: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  line: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  lineBest: {
    color: colors.muted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  lineCount: {
    color: colors.faint,
  },
  lineName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  lines: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 8,
  },
  more: {
    color: colors.faint,
    fontSize: 13,
    marginTop: 4,
  },
  pill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    color: colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  prBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    color: colors.accentInk,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  importButton: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
