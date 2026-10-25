/**
 * The page right after Finish: what the session added up to, new records,
 * the XP it earned toward the next level, and any badge it unlocked.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { BadgeGlyph } from '../../components/badge-icons';
import { Button } from '../../components/button';
import { Screen } from '../../components/screen';
import { getWorkoutRecap, unfinishWorkout, type WorkoutRecap } from '../../data/repository';
import { activeWorkoutChanged, dataChanged, useAppDispatch } from '../../state/store';
import { formatDuration, formatLoggedLoad } from '../../domain/format';
import type { ProfileBadge } from '../../domain/profile';
import { formatEstimate, formatVolume, formatWeight, kgToDisplay } from '../../domain/units';
import type { WeightUnit } from '../../domain/types';
import type { StackNavigation, StackRoute } from '../../navigation/types';
import { useStored, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

const nativeDriver = Platform.OS !== 'web';

export const WorkoutCompleteScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const route = useRoute<StackRoute<'WorkoutComplete'>>();
  const dispatch = useAppDispatch();
  const { unit } = useWeightUnit();
  const recap = useStored(getWorkoutRecap, route.params.workoutId);

  const handleDone = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Tabs');
  }, [navigation]);

  const handleView = useCallback(() => {
    navigation.replace('WorkoutDetail', { workoutId: route.params.workoutId });
  }, [navigation, route.params.workoutId]);

  const handleUndo = useCallback(() => {
    const workoutId = route.params.workoutId;
    void (async () => {
      await unfinishWorkout(workoutId);
      dispatch(activeWorkoutChanged(workoutId));
      dispatch(dataChanged());
      navigation.replace('ActiveWorkout', { workoutId });
    })();
  }, [dispatch, navigation, route.params.workoutId]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {recap ? <RecapBody recap={recap} unit={unit} /> : <Text style={styles.muted}>Saving your workout…</Text>}
        <Button label="Done" onPress={handleDone} style={styles.done} />
        <Pressable accessibilityRole="button" onPress={handleUndo} style={styles.quiet}>
          <Text style={styles.quietText}>Undo finish</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleView} style={styles.quiet}>
          <Text style={styles.quietText}>View workout</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const RecapBody: React.FC<{ recap: WorkoutRecap; unit: WeightUnit }> = ({ recap, unit }) => {
  const { after, before, workout } = recap;
  const gained = after.level.points - before.level.points;
  const leveledUp = after.level.level > before.level.level;
  const newBadges = useMemo(() => upgradedBadges(before.badges, after.badges), [after.badges, before.badges]);

  return (
    <View>
      <Medal />
      <Text style={styles.kicker}>Workout complete</Text>
      <Text style={styles.title}>{workout.name}</Text>
      <Text style={styles.subtitle}>{praise(recap)}</Text>

      <View style={styles.stats}>
        <Stat label="Time" value={formatDuration(workout.startedAt, workout.finishedAt)} />
        <Stat label={`Volume (${unit})`} value={formatVolume(kgToDisplay(workout.volumeKg, unit))} />
        <Stat label="Sets" value={String(workout.setCount)} />
        <Stat label="Reps" value={String(recap.reps)} />
      </View>

      {recap.records.length > 0 ? (
        <View style={styles.records}>
          <Text style={styles.recordsTitle}>
            {recap.records.length} new {recap.records.length === 1 ? 'PR' : 'PRs'}
          </Text>
          {recap.records.map((record) => (
            <Text key={record.name} style={styles.recordLine}>
              {record.name} · est. 1RM {formatEstimate(kgToDisplay(record.oneRepMaxKg, unit))} {unit}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.xpHead}>
          <Text style={styles.xpGain}>+{gained} XP</Text>
          {leveledUp ? <Text style={styles.levelUp}>Level up!</Text> : null}
        </View>
        <Text style={styles.levelLine}>
          Level {after.level.level} of {after.level.maxLevel} · {after.level.title}
        </Text>
        <XpBar after={after.level} before={before.level} />
        <Text style={styles.muted}>
          {after.level.toNext == null ? 'Top level reached.' : `${after.level.toNext.toLocaleString()} XP to level ${after.level.level + 1}`}
        </Text>
      </View>

      {newBadges.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>{newBadges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}</Text>
          {newBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeRow}>
              <BadgeGlyph color={colors.accent} id={badge.id} size={26} />
              <View style={styles.badgeCopy}>
                <Text style={styles.badgeName}>
                  {badge.title} · {badge.detail}
                </Text>
                <Text style={styles.muted}>{badge.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>Exercises</Text>
      {recap.exercises.map((exercise) => (
        <View key={exercise.name} style={styles.exercise}>
          <View style={styles.exerciseCopy}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.muted}>
              {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
              {exercise.best ? ` · best ${formatLoggedLoad(exercise.best.weightKg, exercise.best.reps, unit)}` : ''}
            </Text>
          </View>
          {exercise.sessionKg != null ? (
            <View style={styles.oneRm}>
              <Text style={styles.oneRmValue}>{formatEstimate(kgToDisplay(exercise.sessionKg, unit))}</Text>
              <Text style={styles.oneRmLabel}>session 1RM</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
};

function upgradedBadges(before: ProfileBadge[], after: ProfileBadge[]): ProfileBadge[] {
  const rank = { expert: 3, locked: 0, novice: 1, regular: 2 } as const;
  return after.filter((badge) => {
    const previous = before.find((item) => item.id === badge.id);
    return rank[badge.tier] > rank[previous?.tier ?? 'locked'];
  });
}

function praise(recap: WorkoutRecap): string {
  if (recap.records.length > 0) {
    return 'New personal best. That is what the work is for.';
  }
  if (recap.after.level.level > recap.before.level.level) {
    return 'A new level. Keep stacking sessions.';
  }
  return 'Another one in the log. Consistency wins.';
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/** Fills from where the level bar was before this workout to where it is now. */
const XpBar: React.FC<{ before: WorkoutRecap['before']['level']; after: WorkoutRecap['after']['level'] }> = ({ after, before }) => {
  const ratioOf = (points: number) => {
    if (after.ceiling == null) {
      return 1;
    }
    return Math.min(1, Math.max(0, (points - after.floor) / Math.max(1, after.ceiling - after.floor)));
  };
  const start = after.level > before.level ? 0 : ratioOf(before.points);
  const fill = useRef(new Animated.Value(start)).current;

  const target = ratioOf(after.points);
  useEffect(() => {
    Animated.timing(fill, { delay: 450, duration: 1100, easing: Easing.out(Easing.cubic), toValue: target, useNativeDriver: false }).start();
  }, [fill, target]);

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
};

const Medal: React.FC = () => {
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.spring(scale, { friction: 4, tension: 80, toValue: 1, useNativeDriver: nativeDriver }).start();
  }, [scale]);
  return (
    <Animated.View style={[styles.medal, { transform: [{ scale }] }]}>
      <Text style={styles.medalStar}>★</Text>
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  badgeCopy: {
    flex: 1,
  },
  badgeName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  done: {
    marginTop: 28,
  },
  exercise: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  exerciseCopy: {
    flex: 1,
    paddingRight: 12,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  levelLine: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  levelUp: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  medal: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginTop: 12,
    width: 96,
  },
  medalStar: {
    color: colors.accentInk,
    fontSize: 52,
    lineHeight: 60,
    textAlign: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  oneRm: {
    alignItems: 'flex-end',
  },
  oneRmLabel: {
    color: colors.faint,
    fontSize: 11,
  },
  oneRmValue: {
    color: colors.text,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  quiet: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  quietText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  recordLine: {
    color: colors.accentInk,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  records: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
  },
  recordsTitle: {
    color: colors.accentInk,
    fontSize: 17,
    fontWeight: '800',
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  stats: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 20,
    paddingVertical: 14,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    height: 10,
    marginTop: 10,
    overflow: 'hidden',
  },
  trackFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 10,
  },
  xpGain: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '800',
  },
  xpHead: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
