/**
 * Local profile: a level and badges in the style of Google's Local Guide,
 * laid out like a training profile. Every number comes from finished workouts.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Screen } from '../../components/screen';
import { formatDay, formatDuration, formatWorkoutWhen } from '../../domain/format';
import { weekValue, type ProfileBadge, type ProfileChartMetric, type ProfileSnapshot, type ProfileWeek } from '../../domain/profile';
import { formatVolume, kgToDisplay } from '../../domain/units';
import type { AppNavigation } from '../../navigation/types';
import { useProfile, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

interface ProfileScreenProps {
  navigation: AppNavigation<'Profile'>;
}

const METRICS: Array<{ id: ProfileChartMetric; label: string }> = [
  { id: 'duration', label: 'Duration' },
  { id: 'volume', label: 'Volume' },
  { id: 'reps', label: 'Reps' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const profile = useProfile();
  const { unit } = useWeightUnit();
  const [metric, setMetric] = useState<ProfileChartMetric>('duration');

  const openHistory = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const openProgress = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  const openRoutines = useCallback(() => {
    navigation.navigate('Routines');
  }, [navigation]);

  const openWorkout = useCallback(() => {
    navigation.navigate('Workout');
  }, [navigation]);

  const openRecent = useCallback(
    (workoutId: string) => {
      navigation.navigate('WorkoutDetail', { workoutId });
    },
    [navigation],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Profile</Text>
        {profile ? (
          <ProfileBody
            metric={metric}
            onMetric={setMetric}
            onOpenHistory={openHistory}
            onOpenProgress={openProgress}
            onOpenRecent={openRecent}
            onOpenRoutines={openRoutines}
            onOpenWorkout={openWorkout}
            profile={profile}
            unit={unit}
          />
        ) : (
          <Text style={styles.muted}>Opening your log.</Text>
        )}
      </ScrollView>
    </Screen>
  );
};

interface ProfileBodyProps {
  profile: ProfileSnapshot;
  unit: 'kg' | 'lb';
  metric: ProfileChartMetric;
  onMetric: (metric: ProfileChartMetric) => void;
  onOpenHistory: () => void;
  onOpenProgress: () => void;
  onOpenRoutines: () => void;
  onOpenWorkout: () => void;
  onOpenRecent: (workoutId: string) => void;
}

const ProfileBody: React.FC<ProfileBodyProps> = ({
  metric,
  onMetric,
  onOpenHistory,
  onOpenProgress,
  onOpenRecent,
  onOpenRoutines,
  onOpenWorkout,
  profile,
  unit,
}) => {
  const weekLabel = profile.thisWeekMinutes < 60 ? `${profile.thisWeekMinutes} min` : formatHours(profile.thisWeekMinutes);

  return (
    <View>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>R</Text>
        </View>
        <Text style={styles.name}>You</Text>
        <View style={styles.stats}>
          <Stat label="Workouts" value={String(profile.workouts)} />
          <Stat label="This week" value={weekLabel} />
          <Stat label="Exercises" value={String(profile.trainedExercises)} />
        </View>
      </View>

      <View style={styles.levelBlock}>
        <LevelMedal />
        <Text style={styles.levelTitle}>Rep Level {profile.level.level}</Text>
        <LevelBar ceiling={profile.level.ceiling} floor={profile.level.floor} points={profile.level.points} />
        <Text style={styles.points}>
          {profile.level.ceiling == null
            ? `${profile.level.points.toLocaleString()} points`
            : `${profile.level.points.toLocaleString()} / ${profile.level.ceiling.toLocaleString()} points`}
        </Text>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.weekLine}>
          <Text style={styles.weekStrong}>{formatThisWeek(profile.thisWeekMinutes)}</Text>
          <Text style={styles.muted}> this week</Text>
        </Text>
        <Text style={styles.range}>Last 12 weeks</Text>
      </View>
      <WeekChart metric={metric} unit={unit} weeks={profile.weeks} />
      <View style={styles.pills}>
        {METRICS.map((item) => (
          <MetricPill active={item.id === metric} key={item.id} label={item.label} metric={item.id} onMetric={onMetric} />
        ))}
      </View>

      <Text style={styles.section}>Badges</Text>
      <View style={styles.badges}>
        {profile.badges.map((badge) => (
          <BadgeView badge={badge} key={badge.id} />
        ))}
      </View>

      <Text style={styles.section}>Dashboard</Text>
      <View style={styles.grid}>
        <DashCard icon="history" label="History" onPress={onOpenHistory} />
        <DashCard icon="progress" label="Progress" onPress={onOpenProgress} />
        <DashCard icon="routines" label="Routines" onPress={onOpenRoutines} />
        <DashCard icon="workout" label="Workout" onPress={onOpenWorkout} />
      </View>

      <Text style={styles.section}>Number of contributions</Text>
      {profile.contributions.map((item) => (
        <View key={item.id} style={styles.contribution}>
          <Text style={styles.contributionLabel}>{item.label}</Text>
          <Text style={styles.contributionValue}>{item.value.toLocaleString()}</Text>
        </View>
      ))}

      <Text style={styles.section}>Workouts</Text>
      {profile.recent.length === 0 ? (
        <Text style={styles.empty}>Finish a workout and it will show up here, with points toward your next level.</Text>
      ) : (
        profile.recent.map((workout) => (
          <RecentRow key={workout.id} onOpen={onOpenRecent} unit={unit} workout={workout} />
        ))
      )}
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const LevelMedal: React.FC = () => {
  return (
    <View style={styles.medal}>
      <Svg height="72" viewBox="0 0 72 72" width="72">
        <Circle cx="36" cy="36" fill={colors.accent} r="32" />
        <Path
          d="M36 18l4.2 9.2 10 .9-7.6 6.4 2.3 9.8L36 39.4 27.1 44.3l2.3-9.8-7.6-6.4 10-.9L36 18z"
          fill={colors.accentInk}
        />
      </Svg>
    </View>
  );
};

const LevelBar: React.FC<{ points: number; floor: number; ceiling: number | null }> = ({ ceiling, floor, points }) => {
  const span = ceiling == null ? 1 : Math.max(1, ceiling - floor);
  const ratio = ceiling == null ? 1 : Math.min(1, Math.max(0, (points - floor) / span));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
};

const WeekChart: React.FC<{ weeks: ProfileWeek[]; metric: ProfileChartMetric; unit: 'kg' | 'lb' }> = ({ metric, unit, weeks }) => {
  const values = weeks.map((week) => (metric === 'volume' ? kgToDisplay(weekValue(week, metric), unit) : weekValue(week, metric)));
  const peak = Math.max(...values, 1);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  return (
    <View>
      <View style={styles.chart}>
        {weeks.map((week, index) => {
          const value = values[index] ?? 0;
          const height = Math.max(4, (value / peak) * 112);
          return <View key={week.start} style={[styles.bar, { height }, value === 0 ? styles.barEmpty : null]} />;
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{first ? formatDay(first.start) : ''}</Text>
        <Text style={styles.chartLabel}>{last ? formatDay(last.start) : ''}</Text>
      </View>
    </View>
  );
};

const MetricPill: React.FC<{
  metric: ProfileChartMetric;
  label: string;
  active: boolean;
  onMetric: (metric: ProfileChartMetric) => void;
}> = ({ active, label, metric, onMetric }) => {
  const onPress = useCallback(() => {
    onMetric(metric);
  }, [metric, onMetric]);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.pill, active ? styles.pillOn : null]}>
      <Text style={[styles.pillText, active ? styles.pillTextOn : null]}>{label}</Text>
    </Pressable>
  );
};

const BadgeView: React.FC<{ badge: ProfileBadge }> = ({ badge }) => {
  const locked = badge.tier === 'locked';
  const color = locked ? colors.faint : badgeColor(badge.id);
  const size = 64;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0.08, badge.ring));
  return (
    <View style={styles.badge}>
      <Svg height={size} viewBox="0 0 64 64" width={size}>
        <Circle cx="32" cy="32" r={radius} stroke={colors.border} strokeWidth="4" />
        <Circle
          cx="32"
          cy="32"
          r={radius}
          stroke={color}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="4"
          transform="rotate(-90 32 32)"
        />
        <Circle cx="32" cy="32" fill={colors.surfaceRaised} r="18" />
      </Svg>
      <Text style={styles.badgeTitle}>{locked ? 'Unlock' : badge.detail}</Text>
      <Text style={styles.badgeName}>{badge.title}</Text>
    </View>
  );
};

const DashCard: React.FC<{ label: string; icon: string; onPress: () => void }> = ({ icon, label, onPress }) => {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.card}>
      <Text style={styles.cardIcon}>{icon === 'history' ? '◷' : icon === 'progress' ? '↗' : icon === 'routines' ? '≡' : '+'}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
};

const RecentRow: React.FC<{
  workout: ProfileSnapshot['recent'][number];
  unit: 'kg' | 'lb';
  onOpen: (workoutId: string) => void;
}> = ({ onOpen, unit, workout }) => {
  const onPress = useCallback(() => {
    onOpen(workout.id);
  }, [onOpen, workout.id]);

  return (
    <Pressable accessibilityLabel={`${workout.name}, ${formatWorkoutWhen(workout.finishedAt)}`} accessibilityRole="button" onPress={onPress} style={styles.recent}>
      <View style={styles.recentAvatar}>
        <Text style={styles.recentLetter}>{workout.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.recentBody}>
        <Text style={styles.recentWhen}>{formatWorkoutWhen(workout.finishedAt)}</Text>
        <Text style={styles.recentName}>{workout.name}</Text>
        <Text style={styles.recentMeta}>
          {formatDuration(workout.startedAt, workout.finishedAt)} · {formatVolume(kgToDisplay(workout.volumeKg, unit))} {unit} · {workout.setCount} {workout.setCount === 1 ? 'set' : 'sets'}
        </Text>
      </View>
    </Pressable>
  );
};

function badgeColor(id: string): string {
  if (id === 'lifter') {
    return '#7EB6FF';
  }
  if (id === 'scribe') {
    return '#F0C14A';
  }
  if (id === 'explorer') {
    return '#C084FC';
  }
  return colors.accent;
}

function formatThisWeek(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  const label = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${label} ${hours === 1 ? 'hour' : 'hours'}`;
}

function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarLetter: {
    color: colors.accentInk,
    fontSize: 32,
    fontWeight: '800',
  },
  badge: {
    alignItems: 'center',
    width: 84,
  },
  badgeName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  badgeTitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bar: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 3,
  },
  barEmpty: {
    backgroundColor: colors.surfaceRaised,
    height: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '48%',
  },
  cardIcon: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  cardLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  chart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 120,
    marginTop: 12,
  },
  chartLabel: {
    color: colors.faint,
    fontSize: 11,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  contribution: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  contributionLabel: {
    color: colors.text,
    fontSize: 16,
  },
  contributionValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  header: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 16,
  },
  identity: {
    alignItems: 'center',
  },
  levelBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 12,
  },
  medal: {
    alignItems: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 15,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillOn: {
    backgroundColor: colors.accent,
  },
  pillText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pillTextOn: {
    color: colors.accentInk,
  },
  pills: {
    flexDirection: 'row',
    marginTop: 16,
  },
  points: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  range: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  recent: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  recentAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  recentBody: {
    flex: 1,
  },
  recentLetter: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  recentMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  recentName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  recentWhen: {
    color: colors.faint,
    fontSize: 12,
  },
  section: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 24,
  },
  sectionHead: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    width: '100%',
  },
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
    width: '100%',
  },
  weekLine: {
    flex: 1,
    marginRight: 12,
  },
  weekStrong: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
