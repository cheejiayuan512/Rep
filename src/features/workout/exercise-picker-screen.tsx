/**
 * Search the exercise library and add one to the open workout or to a routine.
 * Tapping an added exercise takes it back out, so each exercise appears once.
 * The same screen serves both, which is why the route params include a mode.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { dataChanged, useAppDispatch } from '../../state/store';
import { Button } from '../../components/button';
import { Header, TextButton } from '../../components/header';
import { hapticLight } from '../../components/haptics';
import { Screen } from '../../components/screen';
import {
  addExerciseToRoutine,
  addExerciseToWorkout,
  createExercise,
  listExercises,
  listTargetExerciseIds,
  removeExerciseFromRoutine,
  removeExerciseFromWorkout,
  swapWorkoutExercise,
} from '../../data/repository';
import { groupExercises, movementFamily, type ExerciseListItem } from '../../domain/exercise-families';
import type { StrengthRating } from '../../domain/strength';
import { MovementFigure } from '../../components/movement-figure';
import { StrengthMark } from '../../components/strength-mark';
import { poseForExercise, poseForFamily } from '../../domain/movement-pose';
import { useStrengthOverview } from '../../state/hooks';
import { ExerciseFinderPanel } from './exercise-finder-panel';
import type { Equipment, Exercise, MuscleGroup } from '../../domain/types';
import { equipmentTypes, muscleGroups } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { colors } from '../../theme/colors';

const filters = ['All', ...muscleGroups] as const;
const ROW_HEIGHT = 68;

function itemKey(item: ExerciseListItem): string {
  return item.key;
}

function getExerciseItemLayout(_data: ArrayLike<ExerciseListItem> | null | undefined, index: number) {
  return { index, length: ROW_HEIGHT, offset: ROW_HEIGHT * index };
}

export const ExercisePickerScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ExercisePicker'>>();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>(() => listExercises.now('', null) ?? []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('Chest');
  const [customEquipment, setCustomEquipment] = useState<Equipment>('Barbell');
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(
    () => new Set(listTargetExerciseIds.now(route.params.mode === 'routine' ? { routineId: route.params.routineId } : { workoutId: route.params.workoutId }) ?? []),
  );
  const [expandedFamilies, setExpandedFamilies] = useState<ReadonlySet<string>>(new Set());
  const [finderLibrary, setFinderLibrary] = useState<Exercise[] | null>(null);
  const items = useMemo(() => groupExercises(exercises, expandedFamilies, query.trim().length > 0), [exercises, expandedFamilies, query]);
  const strengthOverview = useStrengthOverview();
  const ratingByExercise = useMemo(() => {
    const map = new Map<string, StrengthRating>();
    for (const rating of strengthOverview?.ratings ?? []) {
      map.set(rating.exerciseId, rating);
    }
    return map;
  }, [strengthOverview]);
  const ratingByFamily = useMemo(() => {
    const map = new Map<string, StrengthRating>();
    for (const exercise of exercises) {
      const family = movementFamily(exercise.id);
      const rating = ratingByExercise.get(exercise.id);
      if (!family || !rating) {
        continue;
      }
      const current = map.get(family);
      if (!current || rating.percentile > current.percentile) {
        map.set(family, rating);
      }
    }
    return map;
  }, [exercises, ratingByExercise]);

  const load = useCallback(async (nextQuery: string, nextMuscle: MuscleGroup | null) => {
    const rows = await listExercises(nextQuery, nextMuscle);
    setExercises(rows);
  }, []);

  React.useEffect(() => {
    void load(query, muscle);
  }, [load, muscle, query]);

  React.useEffect(() => {
    let cancel = false;
    const target = route.params.mode === 'routine' ? { routineId: route.params.routineId } : { workoutId: route.params.workoutId };
    void listTargetExerciseIds(target).then((ids) => {
      if (!cancel) {
        setAddedIds(new Set(ids));
      }
    });
    return () => {
      cancel = true;
    };
  }, [route.params]);

  const handleDone = useCallback(() => {
    navigation.goBack();
    dispatch(dataChanged());
  }, [dispatch, navigation]);

  const swapping = route.params.mode === 'swap' ? route.params : null;

  const addToTarget = useCallback(
    async (exerciseId: string) => {
      if (route.params.mode === 'swap') {
        await swapWorkoutExercise(route.params.workoutExerciseId, exerciseId);
        return;
      }
      if (route.params.mode === 'workout') {
        await addExerciseToWorkout(route.params.workoutId, exerciseId);
        return;
      }
      await addExerciseToRoutine(route.params.routineId, exerciseId);
    },
    [route.params],
  );

  const removeFromTarget = useCallback(
    async (exerciseId: string): Promise<boolean> => {
      if (route.params.mode === 'swap') {
        return false;
      }
      if (route.params.mode === 'workout') {
        return (await removeExerciseFromWorkout(route.params.workoutId, exerciseId)) === 'removed';
      }
      await removeExerciseFromRoutine(route.params.routineId, exerciseId);
      return true;
    },
    [route.params],
  );

  // Swap mode: one tap replaces the card's exercise and goes back.
  const handleSwap = useCallback(
    async (exerciseId: string) => {
      if (!swapping || pendingId) {
        return;
      }
      if (exerciseId === swapping.currentExerciseId) {
        navigation.goBack();
        return;
      }
      if (addedIds.has(exerciseId)) {
        setError('That exercise is already in this workout.');
        return;
      }
      setPendingId(exerciseId);
      setError(null);
      try {
        await swapWorkoutExercise(swapping.workoutExerciseId, exerciseId);
        void hapticLight();
        navigation.goBack();
        dispatch(dataChanged());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not swap the exercise.');
      } finally {
        setPendingId(null);
      }
    },
    [addedIds, dispatch, navigation, pendingId, swapping],
  );

  // Tapping toggles: an exercise is in the target once at most.
  const handleSelect = useCallback(
    async (exerciseId: string) => {
      if (swapping) {
        await handleSwap(exerciseId);
        return;
      }
      if (pendingId) {
        return;
      }
      setPendingId(exerciseId);
      setError(null);
      try {
        if (addedIds.has(exerciseId)) {
          if (await removeFromTarget(exerciseId)) {
            setAddedIds((current) => {
              const next = new Set(current);
              next.delete(exerciseId);
              return next;
            });
          } else {
            setError('That exercise has completed sets. Remove it from its card in the workout.');
          }
        } else {
          await addToTarget(exerciseId);
          setAddedIds((current) => new Set(current).add(exerciseId));
        }
        void hapticLight();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not change the exercise.');
      } finally {
        setPendingId(null);
      }
    },
    [addToTarget, addedIds, handleSwap, pendingId, removeFromTarget, swapping],
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
      if (swapping) {
        navigation.goBack();
        dispatch(dataChanged());
        return;
      }
      setAddedIds((current) => new Set(current).add(created.id));
      setName('');
      setCreating(false);
      await load(query, muscle);
      void hapticLight();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the exercise.');
    }
  }, [addToTarget, customEquipment, customMuscle, dispatch, load, muscle, name, navigation, query, swapping]);

  const toggleFamily = useCallback((family: string) => {
    setExpandedFamilies((current) => {
      const next = new Set(current);
      if (next.has(family)) {
        next.delete(family);
      } else {
        next.add(family);
      }
      return next;
    });
  }, []);

  const renderExercise = useCallback(
    ({ item }: ListRenderItemInfo<ExerciseListItem>) =>
      item.kind === 'family' ? (
        <FamilyRow count={item.count} expanded={item.expanded} family={item.family} onToggle={toggleFamily} rating={ratingByFamily.get(item.family) ?? null} />
      ) : (
        <ExerciseChoice
          added={addedIds.has(item.exercise.id)}
          current={swapping?.currentExerciseId === item.exercise.id}
          exercise={item.exercise}
          nested={item.nested}
          onPress={handleSelect}
          pending={pendingId === item.exercise.id}
          rating={ratingByExercise.get(item.exercise.id) ?? null}
          swapping={swapping != null}
        />
      ),
    [addedIds, handleSelect, pendingId, ratingByExercise, ratingByFamily, swapping, toggleFamily],
  );

  const listEmpty = useMemo(() => <Text style={styles.empty}>No exercises match that search.</Text>, []);
  const openCreate = useCallback(() => setCreating(true), []);
  const openFinder = useCallback(() => {
    setCreating(false);
    setError(null);
    setFinderLibrary(listExercises.now('', null) ?? []);
    void listExercises('', null).then(setFinderLibrary);
  }, []);
  const closeFinder = useCallback(() => setFinderLibrary(null), []);
  const pressFinderResult = useCallback(
    (exerciseId: string) => {
      void handleSelect(exerciseId);
    },
    [handleSelect],
  );
  const pressCreate = useCallback(() => {
    void handleCreate();
  }, [handleCreate]);

  return (
    <Screen bottomInset>
      <Header
        right={swapping ? <TextButton label="Cancel" onPress={navigation.goBack} /> : <TextButton label="Done" onPress={handleDone} tone="accent" />}
        title={swapping ? 'Swap exercise' : 'Exercises'}
      />
      {finderLibrary ? (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <ExerciseFinderPanel
            addedIds={addedIds}
            currentExerciseId={swapping?.currentExerciseId ?? null}
            exercises={finderLibrary}
            ratingByExercise={ratingByExercise}
            onClose={closeFinder}
            onSelect={pressFinderResult}
            pendingId={pendingId}
            swapping={swapping != null}
          />
        </>
      ) : (
        <>
      <View style={styles.searchWrap}>
        <TextInput accessibilityLabel="Search exercises" autoCorrect={false} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={colors.faint} style={styles.search} value={query} />
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
          <Button label={swapping ? 'Swap to custom exercise' : 'Add custom exercise'} onPress={pressCreate} />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        style={styles.list}
        data={items}
        extraData={`${pendingId ?? ''}:${addedIds.size}`}
        getItemLayout={getExerciseItemLayout}
        initialNumToRender={12}
        keyExtractor={itemKey}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={listEmpty}
        maxToRenderPerBatch={16}
        renderItem={renderExercise}
        windowSize={8}
      />
        </>
      )}
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

interface FamilyRowProps {
  family: string;
  count: number;
  expanded: boolean;
  rating: StrengthRating | null;
  onToggle: (family: string) => void;
}

const FamilyRow: React.FC<FamilyRowProps> = React.memo(function FamilyRow({ family, count, expanded, onToggle, rating }) {
  const handlePress = useCallback(() => {
    onToggle(family);
  }, [family, onToggle]);

  return (
    <Pressable
      accessibilityLabel={rating ? `${family}, ${rating.level}, ${count} variations` : `${family}, ${count} variations`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={handlePress}
      style={styles.row}
    >
      <MovementFigure pose={poseForFamily(family)} />
      <View style={styles.rowCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {family}
          </Text>
          {rating ? <StrengthMark rating={rating} /> : null}
        </View>
        <Text style={styles.meta}>{count} variations</Text>
      </View>
      <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
    </Pressable>
  );
});

interface ExerciseChoiceProps {
  exercise: Exercise;
  added: boolean;
  pending: boolean;
  nested: boolean;
  /** Swap mode: the card's own exercise. */
  current: boolean;
  swapping: boolean;
  rating: StrengthRating | null;
  onPress: (exerciseId: string) => void;
}

const ExerciseChoice: React.FC<ExerciseChoiceProps> = React.memo(function ExerciseChoice({ exercise, added, pending, nested, current, swapping, rating, onPress }) {
  const handlePress = useCallback(() => {
    void onPress(exercise.id);
  }, [exercise.id, onPress]);
  const status = pending ? '…' : swapping ? (current ? 'Current' : added ? 'In workout' : 'Swap') : added ? '✓ Added' : '+';
  const hint = swapping ? 'Replaces the exercise on the card' : added ? 'Removes it from the list' : 'Adds it to the list';

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={rating ? `${exercise.name}, ${rating.level}` : exercise.name}
      accessibilityRole="button"
      accessibilityState={{ selected: added }}
      onPress={handlePress}
      style={[styles.row, nested && styles.nested]}
    >
      <MovementFigure pose={poseForExercise(exercise.id, exercise.name)} />
      <View style={styles.rowCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {exercise.name}
          </Text>
          {rating ? <StrengthMark rating={rating} /> : null}
        </View>
        <Text style={styles.meta}>
          {exercise.muscleGroup} · {exercise.equipment}
          {exercise.isCustom ? ' · Custom' : ''}
        </Text>
      </View>
      <Text style={[styles.added, !added && !swapping && styles.addHint, swapping && (added || current) && styles.taken]}>{status}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  added: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    width: 64,
  },
  addHint: {
    color: colors.faint,
    fontSize: 20,
  },
  chevron: {
    color: colors.muted,
    fontSize: 18,
    textAlign: 'center',
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
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nested: {
    backgroundColor: colors.surface,
    paddingLeft: 28,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
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
  taken: {
    color: colors.faint,
  },
});
