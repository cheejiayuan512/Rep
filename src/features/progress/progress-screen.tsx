/**
 * Exercises you have actually trained, newest first. Tap one to open its chart.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useTrainedExercises, useWeightUnit } from '../../state/hooks';
import { EmptyState } from '../../components/empty-state';
import { Screen } from '../../components/screen';
import { UnitToggle } from '../../components/unit-toggle';
import { formatWorkoutWhen } from '../../domain/format';
import type { TrainedExercise } from '../../domain/types';
import type { AppNavigation } from '../../navigation/types';
import { colors } from '../../theme/colors';

function exerciseKey(exercise: TrainedExercise): string {
  return exercise.id;
}

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation<'Progress'>>();
  const exercises = useTrainedExercises();
  const { unit, setUnit } = useWeightUnit();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return exercises;
    }
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(needle) || exercise.muscleGroup.toLowerCase().includes(needle));
  }, [exercises, query]);

  const handleOpen = useCallback(
    (exerciseId: string) => {
      navigation.navigate('ExerciseProgress', { exerciseId });
    },
    [navigation],
  );
  const renderExercise = useCallback(
    ({ item }: ListRenderItemInfo<TrainedExercise>) => <TrainedRow exercise={item} onPress={handleOpen} />,
    [handleOpen],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Progress</Text>
          <UnitToggle onChange={setUnit} unit={unit} />
        </View>
        <Text style={styles.subtitle}>Personal records and charts for exercises you have logged.</Text>
        <TextInput autoCorrect={false} onChangeText={setQuery} placeholder="Search trained exercises" placeholderTextColor={colors.faint} style={styles.search} value={query} />
      </View>
      <FlatList
        style={styles.fill}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        data={filtered}
        keyboardShouldPersistTaps="handled"
        keyExtractor={exerciseKey}
        ListEmptyComponent={<EmptyState message="Finish a workout with a completed set to see records and charts." title="Nothing to chart yet" />}
        renderItem={renderExercise}
      />
    </Screen>
  );
};

interface TrainedRowProps {
  exercise: TrainedExercise;
  onPress: (exerciseId: string) => void;
}

const TrainedRow: React.FC<TrainedRowProps> = React.memo(function TrainedRow({ exercise, onPress }) {
  const handlePress = useCallback(() => {
    onPress(exercise.id);
  }, [exercise.id, onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.meta}>
          {exercise.muscleGroup} · {formatWorkoutWhen(exercise.lastPerformedAt)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chevron: {
    color: colors.faint,
    fontSize: 24,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 14,
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
