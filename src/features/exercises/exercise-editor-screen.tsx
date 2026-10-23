/**
 * Create or change one library exercise: name, muscle group, and equipment.
 * Custom exercises can be deleted while no workout or routine uses them.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Button } from '../../components/button';
import { Chip } from '../../components/chip';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import { createExercise, deleteCustomExercise, getExercise, getExerciseUsage, updateExercise } from '../../data/repository';
import { equipmentTypes, muscleGroups, type Equipment, type Exercise, type MuscleGroup } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { dataChanged, useAppDispatch } from '../../state/store';
import { colors } from '../../theme/colors';

export const ExerciseEditorScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'ExerciseEditor'>>();
  const dispatch = useAppDispatch();
  const exerciseId = route.params.exerciseId;
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [usage, setUsage] = useState<{ workouts: number; routines: number } | null>(null);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('Chest');
  const [equipment, setEquipment] = useState<Equipment>('Barbell');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!exerciseId) {
      return;
    }
    let cancel = false;
    void Promise.all([getExercise(exerciseId), getExerciseUsage(exerciseId)]).then(([loaded, used]) => {
      if (cancel || !loaded) {
        return;
      }
      setExercise(loaded);
      setUsage(used);
      setName(loaded.name);
      setMuscle(loaded.muscleGroup);
      setEquipment(loaded.equipment);
    });
    return () => {
      cancel = true;
    };
  }, [exerciseId]);

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (exerciseId) {
        await updateExercise(exerciseId, { equipment, muscleGroup: muscle, name });
      } else {
        if (name.trim().length < 2) {
          throw new Error('Give the exercise a name.');
        }
        await createExercise({ equipment, muscleGroup: muscle, name });
      }
      navigation.goBack();
      dispatch(dataChanged());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the exercise.');
    } finally {
      setSaving(false);
    }
  }, [dispatch, equipment, exerciseId, muscle, name, navigation, saving]);

  const pressSave = useCallback(() => {
    void handleSave();
  }, [handleSave]);

  const askDelete = useCallback(() => setConfirmingDelete(true), []);
  const cancelDelete = useCallback(() => setConfirmingDelete(false), []);
  const confirmDelete = useCallback(() => {
    setConfirmingDelete(false);
    if (!exerciseId) {
      return;
    }
    void deleteCustomExercise(exerciseId).then((result) => {
      if (result === 'in-use') {
        setError('That exercise is used in a workout or routine, so it stays.');
        return;
      }
      navigation.goBack();
      dispatch(dataChanged());
    });
  }, [dispatch, exerciseId, navigation]);

  const openProgress = useCallback(() => {
    if (exerciseId) {
      navigation.navigate('ExerciseProgress', { exerciseId });
    }
  }, [exerciseId, navigation]);

  const inUse = usage != null && usage.workouts + usage.routines > 0;

  return (
    <Screen bottomInset>
      <Header
        left={<TextButton label="Cancel" onPress={navigation.goBack} />}
        right={<TextButton disabled={saving} label="Save" onPress={pressSave} tone="accent" />}
        title={exerciseId ? 'Edit exercise' : 'New exercise'}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.fill}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          accessibilityLabel="Exercise name"
          autoCapitalize="words"
          autoFocus={!exerciseId}
          onChangeText={setName}
          placeholder="Exercise name"
          placeholderTextColor={colors.faint}
          style={styles.input}
          value={name}
        />
        <Text style={styles.label}>Muscle group</Text>
        <View style={styles.chips}>
          {muscleGroups.map((group) => (
            <Chip key={group} label={group} onSelect={setMuscle} selected={group === muscle} value={group} />
          ))}
        </View>
        <Text style={styles.label}>Equipment</Text>
        <View style={styles.chips}>
          {equipmentTypes.map((item) => (
            <Chip key={item} label={item} onSelect={setEquipment} selected={item === equipment} value={item} />
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button disabled={saving} label={exerciseId ? 'Save changes' : 'Add exercise'} onPress={pressSave} style={styles.save} />
        {exercise ? (
          <View style={styles.usage}>
            <Text style={styles.usageText}>
              Used in {usage?.workouts ?? 0} {usage?.workouts === 1 ? 'workout' : 'workouts'} and {usage?.routines ?? 0} {usage?.routines === 1 ? 'routine' : 'routines'}.
              {exercise.isCustom ? '' : ' Built-in exercises can be edited but not deleted.'}
            </Text>
            {usage && usage.workouts > 0 ? <Button label="View progress" onPress={openProgress} style={styles.secondary} variant="secondary" /> : null}
            {exercise.isCustom ? (
              inUse ? (
                <Text style={styles.usageText}>Remove it from those workouts and routines to delete it.</Text>
              ) : (
                <Button label="Delete exercise" onPress={askDelete} style={styles.secondary} variant="danger" />
              )
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        confirmLabel="Delete"
        destructive
        message="It leaves the library. Nothing logged uses it."
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title={`Delete ${exercise?.name ?? 'exercise'}?`}
        visible={confirmingDelete}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 16,
  },
  fill: {
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  save: {
    marginTop: 24,
  },
  secondary: {
    marginTop: 12,
  },
  usage: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
    paddingTop: 16,
  },
  usageText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
