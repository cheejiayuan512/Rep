import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { dataChanged, useAppDispatch } from '../../state/store';
import { Button } from '../../components/button';
import { Header, TextButton } from '../../components/header';
import { hapticLight } from '../../components/haptics';
import { Screen } from '../../components/screen';
import { addExerciseToRoutine, addExerciseToWorkout, createExercise, deleteCustomExercise, listExercises } from '../../data/repository';
import type { Equipment, Exercise, MuscleGroup } from '../../domain/types';
import { equipmentTypes, muscleGroups } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

const filters = ['All', ...muscleGroups] as const;
const ROW_HEIGHT = 68;

function exerciseKey(exercise: Exercise): string {
  return exercise.id;
}

function getExerciseItemLayout(_data: ArrayLike<Exercise> | null | undefined, index: number) {
  return { index, length: ROW_HEIGHT, offset: ROW_HEIGHT * index };
}

export const ExercisePickerScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ExercisePicker'>>();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('Barbell');
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async (nextQuery: string, nextMuscle: MuscleGroup | null) => {
    const rows = await listExercises(nextQuery, nextMuscle);
    setExercises(rows);
  }, []);

  React.useEffect(() => {
    void load(query, muscle);
  }, [load, muscle, query]);

  const handleDone = useCallback(() => {
    dispatch(dataChanged());
    navigation.goBack();
  }, [dispatch, navigation]);

  const addToTarget = useCallback(
    async (exerciseId: string) => {
      if (route.params.mode === 'workout') {
        await addExerciseToWorkout(route.params.workoutId, exerciseId);
        return;
      }
      await addExerciseToRoutine(route.params.routineId, exerciseId);
    },
    [route.params],
  );

  const handleSelect = useCallback(
    async (exerciseId: string) => {
      if (pendingId) {
        return;
      }
      setPendingId(exerciseId);
      setError(null);
      try {
        await addToTarget(exerciseId);
        setAddedIds((current) => new Set(current).add(exerciseId));
        void hapticLight();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not add the exercise.');
      } finally {
        setPendingId(null);
      }
    },
    [addToTarget, pendingId],
  );

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give the exercise a name.');
      return;
    }
    setError(null);
    try {
      const created = await createExercise({ equipment: customEquipment, muscleGroup: customMuscle, name: trimmed });
      await addToTarget(created.id);
      setAddedIds((current) => new Set(current).add(created.id));
      setName('');
      setCreating(false);
      await load(query, muscle);
      void hapticLight();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the exercise.');
    }
  }, [addToTarget, customEquipment, customMuscle, load, muscle, name, query]);

  const handleDeleteCustom = useCallback(
    async (exerciseId: string) => {
      const result = await deleteCustomExercise(exerciseId);
      if (result === 'in-use') {
        setError('That exercise is already used in a workout or routine.');
        return;
      }
      await load(query, muscle);
    },
    [load, muscle, query],
  );

  const renderExercise = useCallback(
    ({ item }: ListRenderItemInfo<Exercise>) => (
      <ExerciseChoice added={addedIds.has(item.id)} exercise={item} onDelete={handleDeleteCustom} onPress={handleSelect} pending={pendingId === item.id} />
    ),
    [addedIds, handleDeleteCustom, handleSelect, pendingId],
  );

  const listEmpty = useMemo(() => <Text style={styles.empty}>No exercises match that search.</Text>, []);
  const openCreate = useCallback(() => setCreating(true), []);
  const pressCreate = useCallback(() => {
    void handleCreate();
  }, [handleCreate]);

  return (
    <Screen bottomInset>
      <Header right={<TextButton label="Done" onPress={handleDone} tone="accent" />} title="Exercises" />
      <View style={styles.searchWrap}>
        <TextInput autoCorrect={false} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={colors.faint} style={styles.search} value={query} />
      </View>
      <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
        {filters.map((filter) => (
          <FilterChip filter={filter} key={filter} onSelect={setMuscle} selected={(filter === 'All' && muscle == null) || filter === muscle} />
        ))}
      </ScrollView>
      <View style={styles.createRow}>
        <TextButton label={creating ? 'Custom exercise' : 'New exercise'} onPress={openCreate} tone="accent" />
      </View>
      {creating ? (
        <View style={styles.form}>
          <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Exercise name" placeholderTextColor={colors.faint} style={styles.search} value={name} />
          <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
            {muscleGroups.map((group) => (
              <ChoiceChip key={group} label={group} onPress={setCustomMuscle} selected={customMuscle === group} />
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
            {equipmentTypes.map((equipment) => (
              <ChoiceChip key={equipment} label={equipment} onPress={setCustomEquipment} selected={customEquipment === equipment} />
            ))}
          </ScrollView>
          <Button label="Add custom exercise" onPress={pressCreate} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.list}
        data={exercises}
        extraData={`${pendingId ?? ''}:${addedIds.size}`}
        getItemLayout={getExerciseItemLayout}
        initialNumToRender={12}
        keyExtractor={exerciseKey}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={listEmpty}
        maxToRenderPerBatch={16}
        renderItem={renderExercise}
        windowSize={8}
      />
    </Screen>
  );
};

interface FilterChipProps {
  filter: (typeof filters)[number];
  selected: boolean;
  onSelect: (muscle: MuscleGroup | null) => void;
}

const FilterChip: React.FC<FilterChipProps> = React.memo(function FilterChip({ filter, selected, onSelect }) {
  const handlePress = useCallback(() => {
    onSelect(filter === 'All' ? null : filter);
  }, [filter, onSelect]);

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{filter}</Text>
    </Pressable>
  );
});

interface ChoiceChipProps<T extends string> {
  label: T;
  selected: boolean;
  onPress: (value: T) => void;
}

function ChoiceChip<T extends string>({ label, selected, onPress }: ChoiceChipProps<T>) {
  const handlePress = useCallback(() => {
    onPress(label);
  }, [label, onPress]);

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

interface ExerciseChoiceProps {
  exercise: Exercise;
  added: boolean;
  pending: boolean;
  onPress: (exerciseId: string) => void;
  onDelete: (exerciseId: string) => void;
}

const ExerciseChoice: React.FC<ExerciseChoiceProps> = React.memo(function ExerciseChoice({ exercise, added, pending, onPress, onDelete }) {
  const handlePress = useCallback(() => {
    void onPress(exercise.id);
  }, [exercise.id, onPress]);
  const handleDelete = useCallback(() => {
    void onDelete(exercise.id);
  }, [exercise.id, onDelete]);

  return (
    <Pressable accessibilityLabel={exercise.name} accessibilityRole="button" onPress={handlePress} style={styles.row}>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.name}>
          {exercise.name}
        </Text>
        <Text style={styles.meta}>
          {exercise.muscleGroup} · {exercise.equipment}
          {exercise.isCustom ? ' · Custom' : ''}
        </Text>
      </View>
      {exercise.isCustom ? (
        <Pressable hitSlop={8} onPress={handleDelete}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      ) : null}
      <Text style={styles.added}>{pending ? '…' : added ? 'Added' : ''}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  added: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    width: 48,
  },
  chip: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.accentInk,
  },
  createRow: {
    paddingHorizontal: 20,
  },
  delete: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  empty: {
    color: colors.muted,
    padding: 24,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  list: {
    flex: 1,
  },
  form: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
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
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchWrap: {
    paddingHorizontal: 20,
  },
});
