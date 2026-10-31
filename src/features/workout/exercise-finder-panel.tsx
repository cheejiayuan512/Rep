/**
 * "Not sure what it's called?" in the exercise picker. Three taps (where you
 * feel it, what you are using, how you are placed), then the closest exercises
 * with a one-line description of each move. Tapping a result adds it like the list does.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TextButton } from '../../components/header';
import { ExerciseAnimation } from '../../components/exercise-animation';
import { StrengthMark } from '../../components/strength-mark';
import type { StrengthRating } from '../../domain/strength';
import { bodyPositions, feelLabels, findExercises, movementCue, usingLabels, type FinderAnswers, type FinderMatch } from '../../domain/exercise-finder';
import { equipmentTypes, muscleGroups, type Exercise } from '../../domain/types';
import { colors } from '../../theme/colors';

interface ExerciseFinderPanelProps {
  exercises: readonly Exercise[];
  addedIds: ReadonlySet<string>;
  pendingId: string | null;
  swapping: boolean;
  currentExerciseId: string | null;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
  ratingByExercise: ReadonlyMap<string, StrengthRating>;
}

type Step = 'muscle' | 'equipment' | 'position' | 'results';

const steps: Step[] = ['muscle', 'equipment', 'position', 'results'];
const empty: FinderAnswers = { equipment: null, muscle: null, position: null };

interface Option {
  key: string;
  label: string;
}

const muscleOptions: Option[] = muscleGroups.map((group) => ({ key: group, label: feelLabels[group] }));
const equipmentOptions: Option[] = equipmentTypes.map((equipment) => ({ key: equipment, label: usingLabels[equipment] }));
const positionOptions: Option[] = bodyPositions.map((position) => ({ key: position, label: position }));

const questions: Record<Exclude<Step, 'results'>, { title: string; options: Option[] }> = {
  equipment: { options: equipmentOptions, title: 'What are you using?' },
  muscle: { options: muscleOptions, title: 'Where do you feel it?' },
  position: { options: positionOptions, title: 'How is your body placed?' },
};

export const ExerciseFinderPanel: React.FC<ExerciseFinderPanelProps> = ({ exercises, addedIds, pendingId, swapping, currentExerciseId, onSelect, onClose, ratingByExercise }) => {
  const [step, setStep] = useState<Step>('muscle');
  const [answers, setAnswers] = useState<FinderAnswers>(empty);
  const matches = useMemo(() => (step === 'results' ? findExercises(exercises, answers) : []), [answers, exercises, step]);
  const exact = matches.filter((match) => match.exact);
  const near = matches.filter((match) => !match.exact);

  const answer = useCallback(
    (key: string | null) => {
      setAnswers((current) => {
        if (step === 'muscle') {
          return { ...current, muscle: muscleGroups.find((group) => group === key) ?? null };
        }
        if (step === 'equipment') {
          return { ...current, equipment: equipmentTypes.find((equipment) => equipment === key) ?? null };
        }
        return { ...current, position: bodyPositions.find((position) => position === key) ?? null };
      });
      setStep((current) => steps[steps.indexOf(current) + 1] ?? 'results');
    },
    [step],
  );

  const skip = useCallback(() => answer(null), [answer]);
  const back = useCallback(() => {
    if (step === 'muscle') {
      onClose();
      return;
    }
    setStep((current) => steps[steps.indexOf(current) - 1] ?? 'muscle');
  }, [onClose, step]);
  const restart = useCallback(() => {
    setAnswers(empty);
    setStep('muscle');
  }, []);

  const question = step === 'results' ? null : questions[step];
  const summary = [answers.muscle ? feelLabels[answers.muscle] : null, answers.equipment ? usingLabels[answers.equipment] : null, answers.position].filter(Boolean).join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.fill}>
      <View style={styles.top}>
        <TextButton label={step === 'muscle' ? 'Back to search' : 'Back'} onPress={back} />
        {step === 'results' ? null : <Text style={styles.count}>{steps.indexOf(step) + 1} of 3</Text>}
      </View>
      {question ? (
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {question.title}
          </Text>
          <View style={styles.options}>
            {question.options.map((option) => (
              <OptionButton key={option.key} label={option.label} onPress={answer} value={option.key} />
            ))}
            <OptionButton label="Not sure" muted onPress={skip} value={null} />
          </View>
        </View>
      ) : (
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {exact.length > 0 ? 'Is it one of these?' : 'Closest matches'}
          </Text>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          {exact.map((match) => (
            <FinderResult added={addedIds.has(match.exercise.id)} current={currentExerciseId === match.exercise.id} key={match.exercise.id} match={match} onPress={onSelect} pending={pendingId === match.exercise.id} rating={ratingByExercise.get(match.exercise.id) ?? null} swapping={swapping} />
          ))}
          {near.length > 0 ? <Text style={styles.section}>{exact.length > 0 ? 'Also close' : 'One answer differs'}</Text> : null}
          {near.map((match) => (
            <FinderResult added={addedIds.has(match.exercise.id)} current={currentExerciseId === match.exercise.id} key={match.exercise.id} match={match} onPress={onSelect} pending={pendingId === match.exercise.id} rating={ratingByExercise.get(match.exercise.id) ?? null} swapping={swapping} />
          ))}
          {matches.length === 0 ? <Text style={styles.summary}>Nothing in the library matches. Go back to search and create it as a new exercise.</Text> : null}
          <View style={styles.footer}>
            <TextButton label="Start over" onPress={restart} tone="accent" />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

interface OptionButtonProps {
  label: string;
  value: string | null;
  muted?: boolean;
  onPress: (value: string | null) => void;
}

const OptionButton: React.FC<OptionButtonProps> = React.memo(function OptionButton({ label, value, muted, onPress }) {
  const handlePress = useCallback(() => {
    onPress(value);
  }, [onPress, value]);

  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={[styles.option, muted && styles.optionMuted]}>
      <Text style={[styles.optionText, muted && styles.optionTextMuted]}>{label}</Text>
    </Pressable>
  );
});

interface FinderResultProps {
  match: FinderMatch;
  added: boolean;
  pending: boolean;
  current: boolean;
  swapping: boolean;
  rating: StrengthRating | null;
  onPress: (exerciseId: string) => void;
}

const FinderResult: React.FC<FinderResultProps> = React.memo(function FinderResult({ match, added, pending, current, swapping, rating, onPress }) {
  const { exercise } = match;
  const handlePress = useCallback(() => {
    onPress(exercise.id);
  }, [exercise.id, onPress]);
  const status = pending ? '…' : swapping ? (current ? 'Current' : added ? 'In workout' : 'Swap') : added ? '✓ Added' : '+';
  const cue = movementCue(exercise.id);

  return (
    <Pressable
      accessibilityHint={swapping ? 'Replaces the exercise on the card' : added ? 'Removes it from the list' : 'Adds it to the list'}
      accessibilityLabel={rating ? `${exercise.name}, ${rating.level}` : exercise.name}
      accessibilityRole="button"
      accessibilityState={{ selected: added }}
      onPress={handlePress}
      style={styles.result}
    >
      <ExerciseAnimation exerciseId={exercise.id} name={exercise.name} />
      <View style={styles.resultCopy}>
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
        {cue ? <Text style={styles.cue}>{cue}</Text> : null}
      </View>
      <Text style={[styles.status, !added && !swapping && styles.statusHint]}>{status}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  count: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: '700',
  },
  cue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 6,
  },
  fill: {
    flex: 1,
  },
  footer: {
    alignItems: 'flex-start',
    marginTop: 12,
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
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionMuted: {
    backgroundColor: 'transparent',
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  optionTextMuted: {
    color: colors.muted,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  result: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    padding: 14,
  },
  resultCopy: {
    flex: 1,
    paddingRight: 12,
  },
  section: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  status: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    width: 64,
  },
  statusHint: {
    color: colors.faint,
    fontSize: 20,
  },
  summary: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
