/**
 * Search the exercise library and add one to the open workout or to a routine.
 * Tapping an added exercise takes it back out, so each exercise appears once.
 * A cable exercise can be added again with a different attachment.
 * The same screen serves both, which is why the route params include a mode.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';
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
  listTargetSlots,
  removeExerciseFromRoutine,
  removeExerciseFromWorkout,
  swapWorkoutExercise,
  type TargetSlot,
} from '../../data/repository';
import { groupExercises, movementFamily, type ExerciseListItem } from '../../domain/exercise-families';
import type { StrengthRating } from '../../domain/strength';
import { ExerciseAnimation } from '../../components/exercise-animation';
import { StrengthMark } from '../../components/strength-mark';
import { useStrengthOverview } from '../../state/hooks';
import { ExerciseFinderPanel } from './exercise-finder-panel';
import type { CableAttachment, Equipment, Exercise, MuscleGroup } from '../../domain/types';
import { cableAttachments, equipmentTypes, muscleGroups, sameExerciseSlot } from '../../domain/types';
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
  const [attachmentExerciseId, setAttachmentExerciseId] = useState<string | null>(null);
  const [slots, setSlots] = useState<TargetSlot[]>(
    () => listTargetSlots.now(route.params.mode === 'routine' ? { routineId: route.params.routineId } : { workoutId: route.params.workoutId }) ?? [],
  );
  const addedIds = useMemo(() => new Set(slots.map((slot) => slot.exerciseId)), [slots]);
  const [expandedFamilies, setExpandedFamilies] = useState<ReadonlySet<string>>(new Set());
  const [finderLibrary, setFinderLibrary] = useState<Exercise[] | null>(null);
  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const exercise of exercises) {
      map.set(exercise.id, exercise);
    }
    for (const exercise of finderLibrary ?? []) {
      map.set(exercise.id, exercise);
    }
    return map;
  }, [exercises, finderLibrary]);
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
    void listTargetSlots(target).then((next) => {
      if (!cancel) {
        setSlots(next);
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
    async (exerciseId: string, attachment?: CableAttachment | null) => {
      if (route.params.mode === 'swap') {
        await swapWorkoutExercise(route.params.workoutExerciseId, exerciseId);
        return;
      }
      if (route.params.mode === 'workout') {
        await addExerciseToWorkout(route.params.workoutId, exerciseId, attachment);
        return;
      }
      await addExerciseToRoutine(route.params.routineId, exerciseId, attachment);
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
      const target = exerciseById.get(exerciseId);
      const attachment = target?.equipment === 'Cable' ? target.attachment : null;
      const taken = slots.some(
        (slot) =>
          slot.id !== swapping.workoutExerciseId &&
          target != null &&
          sameExerciseSlot(target.equipment, { attachment: slot.attachment, exerciseId: slot.exerciseId }, { attachment, exerciseId }),
      );
      if (taken) {
        setError(target?.equipment === 'Cable' ? 'That attachment is already in this workout.' : 'That exercise is already in this workout.');
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
    [dispatch, exerciseById, navigation, pendingId, slots, swapping],
  );

  const refreshSlots = useCallback(async () => {
    const target = route.params.mode === 'routine' ? { routineId: route.params.routineId } : { workoutId: route.params.workoutId };
    setSlots(await listTargetSlots(target));
  }, [route.params]);

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
      const target = exerciseById.get(exerciseId);
      if (target?.equipment === 'Cable' && addedIds.has(exerciseId)) {
        setError(null);
        setAttachmentExerciseId(exerciseId);
        return;
      }
      setPendingId(exerciseId);
      setError(null);
      try {
        if (addedIds.has(exerciseId)) {
          if (await removeFromTarget(exerciseId)) {
            await refreshSlots();
          } else {
            setError('That exercise has completed sets. Remove it from its card in the workout.');
          }
        } else {
          await addToTarget(exerciseId);
          await refreshSlots();
        }
        void hapticLight();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not change the exercise.');
      } finally {
        setPendingId(null);
      }
    },
    [addToTarget, addedIds, exerciseById, handleSwap, pendingId, refreshSlots, removeFromTarget, swapping],
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
      await refreshSlots();
      setName('');
      setCreating(false);
      await load(query, muscle);
      void hapticLight();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the exercise.');
    }
  }, [addToTarget, customEquipment, customMuscle, dispatch, load, muscle, name, navigation, query, refreshSlots, swapping]);

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
          count={slots.filter((slot) => slot.exerciseId === item.exercise.id).length}
          current={swapping?.currentExerciseId === item.exercise.id}
          exercise={item.exercise}
          nested={item.nested}
          onPress={handleSelect}
          pending={pendingId === item.exercise.id}
          rating={ratingByExercise.get(item.exercise.id) ?? null}
          swapping={swapping != null}
        />
      ),
    [addedIds, handleSelect, pendingId, ratingByExercise, ratingByFamily, slots, swapping, toggleFamily],
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
  const closeAttachments = useCallback(() => setAttachmentExerciseId(null), []);
  const attachmentExercise = attachmentExerciseId ? exerciseById.get(attachmentExerciseId) ?? null : null;
  const chooseAttachment = useCallback(
    (attachment: CableAttachment | null) => {
      if (!attachmentExerciseId || route.params.mode === 'swap' || pendingId) {
        return;
      }
      const target = route.params;
      const exerciseId = attachmentExerciseId;
      const used = slots.some((slot) => slot.exerciseId === exerciseId && slot.attachment === attachment);
      setPendingId(exerciseId);
      setError(null);
      void (async () => {
        try {
          if (target.mode === 'workout') {
            if (used) {
              if ((await removeExerciseFromWorkout(target.workoutId, exerciseId, attachment)) !== 'removed') {
                setError('That exercise has completed sets. Remove it from its card in the workout.');
                return;
              }
            } else {
              await addExerciseToWorkout(target.workoutId, exerciseId, attachment);
            }
          } else if (used) {
            await removeExerciseFromRoutine(target.routineId, exerciseId, attachment);
          } else {
            await addExerciseToRoutine(target.routineId, exerciseId, attachment);
          }
          await refreshSlots();
          setAttachmentExerciseId(null);
          void hapticLight();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not change the exercise.');
        } finally {
          setPendingId(null);
        }
      })();
    },
    [attachmentExerciseId, pendingId, refreshSlots, route.params, slots],
  );

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
        extraData={`${pendingId ?? ''}:${slots.length}`}
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
      <AttachmentSheet exercise={attachmentExercise} onClose={closeAttachments} onSelect={chooseAttachment} slots={slots} />
    </Screen>
  );
};

interface AttachmentSheetProps {
  exercise: Exercise | null;
  slots: readonly TargetSlot[];
  onSelect: (attachment: CableAttachment | null) => void;
  onClose: () => void;
}

const AttachmentSheet: React.FC<AttachmentSheetProps> = ({ exercise, slots, onSelect, onClose }) => {
  const options = useMemo(() => [null, ...cableAttachments] as Array<CableAttachment | null>, []);
  const keepOpen = useCallback(() => undefined, []);
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={exercise != null}>
      <Pressable accessibilityLabel="Close attachments" onPress={onClose} style={styles.backdrop}>
        <Pressable onPress={keepOpen} style={styles.sheet}>
          <Text style={styles.sheetTitle}>{exercise?.name ?? 'Attachment'}</Text>
          <Text style={styles.sheetHint}>Add it again with a different attachment. An attachment already on a card can be removed here.</Text>
          {options.map((attachment) => (
            <AttachmentChoice added={slots.some((slot) => slot.exerciseId === exercise?.id && slot.attachment === attachment)} attachment={attachment} key={attachment ?? 'none'} onSelect={onSelect} />
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface AttachmentChoiceProps {
  attachment: CableAttachment | null;
  added: boolean;
  onSelect: (attachment: CableAttachment | null) => void;
}

const AttachmentChoice: React.FC<AttachmentChoiceProps> = React.memo(function AttachmentChoice({ attachment, added, onSelect }) {
  const handlePress = useCallback(() => {
    onSelect(attachment);
  }, [attachment, onSelect]);
  const label = attachment ?? 'None';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: added }} onPress={handlePress} style={styles.attachmentRow}>
      <Text style={styles.name}>{label}</Text>
      <Text style={[styles.added, !added && styles.addHint]}>{added ? 'Added' : 'Add'}</Text>
    </Pressable>
  );
});

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
      <ExerciseAnimation family={family} />
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
  count: number;
  pending: boolean;
  nested: boolean;
  /** Swap mode: the card's own exercise. */
  current: boolean;
  swapping: boolean;
  rating: StrengthRating | null;
  onPress: (exerciseId: string) => void;
}

const ExerciseChoice: React.FC<ExerciseChoiceProps> = React.memo(function ExerciseChoice({ exercise, added, count, pending, nested, current, swapping, rating, onPress }) {
  const handlePress = useCallback(() => {
    void onPress(exercise.id);
  }, [exercise.id, onPress]);
  const cable = exercise.equipment === 'Cable';
  const status = pending ? '…' : swapping ? (current ? 'Current' : added ? 'In workout' : 'Swap') : added ? (cable && count > 1 ? `${count} added` : '✓ Added') : '+';
  const hint = swapping ? 'Replaces the exercise on the card' : added && cable ? 'Adds another attachment' : added ? 'Removes it from the list' : 'Adds it to the list';

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={rating ? `${exercise.name}, ${rating.level}` : exercise.name}
      accessibilityRole="button"
      accessibilityState={{ selected: added }}
      onPress={handlePress}
      style={[styles.row, nested && styles.nested]}
    >
      <ExerciseAnimation exerciseId={exercise.id} name={exercise.name} />
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
    width: 72,
  },
  attachmentRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 8,
  },
  backdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
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
