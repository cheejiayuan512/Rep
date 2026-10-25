/**
 * The exercise library. Opens from Profile. Tap one to rename it, change its
 * muscle group or equipment, or delete a custom one. Adding to a workout happens in the picker.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Chip } from '../../components/chip';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { listExercises } from '../../data/repository';
import { fuzzyFilter } from '../../domain/fuzzy-search';
import { muscleGroups, type Exercise, type MuscleGroup } from '../../domain/types';
import type { StackNavigation } from '../../navigation/types';
import { useStored } from '../../state/hooks';
import { colors } from '../../theme/colors';

const ROW_HEIGHT = 64;
const ALL = 'All';
const filters = [ALL, ...muscleGroups] as const;
type Filter = (typeof filters)[number];

function exerciseKey(exercise: Exercise): string {
  return exercise.id;
}

function getRowLayout(_data: ArrayLike<Exercise> | null | undefined, index: number) {
  return { index, length: ROW_HEIGHT, offset: ROW_HEIGHT * index };
}

export const ExercisesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(ALL);
  const library = useStored(listExercises, '', null);
  const exercises = useMemo(() => [...(library ?? [])].sort((left, right) => left.name.localeCompare(right.name)), [library]);

  const visible = useMemo(
    () => fuzzyFilter(filter === ALL ? exercises : exercises.filter((exercise) => exercise.muscleGroup === filter), query),
    [exercises, filter, query],
  );

  const customCount = useMemo(() => exercises.filter((exercise) => exercise.isCustom).length, [exercises]);

  const handleOpen = useCallback(
    (exerciseId: string) => {
      navigation.navigate('ExerciseEditor', { exerciseId });
    },
    [navigation],
  );

  const handleNew = useCallback(() => {
    navigation.navigate('ExerciseEditor', { exerciseId: null });
  }, [navigation]);

  const renderExercise = useCallback(({ item }: ListRenderItemInfo<Exercise>) => <ExerciseRow exercise={item} onPress={handleOpen} />, [handleOpen]);

  const selectFilter = useCallback((value: Filter) => {
    setFilter(value);
  }, []);

  return (
    <Screen>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} right={<TextButton label="New" onPress={handleNew} tone="accent" />} title="Exercises" />
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {exercises.length} in the library · {customCount} custom
        </Text>
        <TextInput
          accessibilityLabel="Search the library"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search the library"
          placeholderTextColor={colors.faint}
          style={styles.search}
          value={query}
        />
      </View>
      <ScrollView contentContainerStyle={styles.filters} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
        {filters.map((item) => (
          <Chip key={item} label={item} onSelect={selectFilter} selected={item === filter} value={item} />
        ))}
      </ScrollView>
      <FlatList
        contentContainerStyle={visible.length === 0 ? styles.emptyList : undefined}
        data={visible}
        getItemLayout={getRowLayout}
        initialNumToRender={14}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={exerciseKey}
        ListEmptyComponent={<EmptyState actionLabel="New exercise" message="Nothing matches that search." onAction={handleNew} title="No exercises" />}
        maxToRenderPerBatch={16}
        removeClippedSubviews
        renderItem={renderExercise}
        style={styles.fill}
        windowSize={8}
      />
    </Screen>
  );
};

interface ExerciseRowProps {
  exercise: Exercise;
  onPress: (exerciseId: string) => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = React.memo(function ExerciseRow({ exercise, onPress }) {
  const handlePress = useCallback(() => {
    onPress(exercise.id);
  }, [exercise.id, onPress]);

  return (
    <Pressable accessibilityHint="Edit this exercise" accessibilityLabel={exercise.name} accessibilityRole="button" onPress={handlePress} style={styles.row}>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.name}>
          {exercise.name}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {exercise.muscleGroup} · {exercise.equipment}
          {exercise.isCustom ? ' · Custom' : ''}
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
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
  },
  filterScroller: {
    flexGrow: 0,
    height: 56,
  },
  filters: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
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
    height: ROW_HEIGHT,
    paddingHorizontal: 20,
  },
  rowCopy: {
    flex: 1,
    paddingRight: 12,
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
});
