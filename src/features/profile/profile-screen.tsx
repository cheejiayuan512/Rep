/**
 * Local profile: a level and badges in the style of Google's Local Guide,
 * laid out like a training profile. Every number comes from finished workouts.
 * Settings live here too: kg or lb, warmup rest, and bodyweight for strength levels.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BadgeGlyph } from '../../components/badge-icons';
import { BodyProfileForm } from '../../components/body-profile-form';
import { Chip } from '../../components/chip';
import { Screen } from '../../components/screen';
import { UnitToggle } from '../../components/unit-toggle';
import { formatDay } from '../../domain/format';
import {
  BADGE_INFO,
  weekValue,
  XP_RULES,
  type BadgeId,
  type ProfileBadge,
  type ProfileChartMetric,
  type ProfileLevel,
  type ProfileSnapshot,
  type ProfileWeek,
} from '../../domain/profile';
import { formatMultiplier, WARMUP_MULTIPLIERS } from '../../domain/rest';
import { STRENGTH_LEVELS } from '../../domain/strength';
import { formatDecimal, formatVolume, formatWeight, kgToDisplay } from '../../domain/units';
import type { WeightUnit } from '../../domain/types';
import type { AppNavigation } from '../../navigation/types';
import { tutorialRequested, useAppDispatch } from '../../state/store';
import { useBodyProfile, useProfile, useShowRpe, useStrengthOverview, useWarmupRestMultiplier, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';
import { screenTitle, screenTitleInset } from '../../theme/layout';

interface ProfileScreenProps {
  navigation: AppNavigation<'Profile'>;
}

const METRICS: Array<{ id: ProfileChartMetric; label: string }> = [
  { id: 'duration', label: 'Duration' },
  { id: 'volume', label: 'Volume' },
  { id: 'reps', label: 'Reps' },
];

const COLLAPSED_BADGES = 8;
const TIER_RANK = { expert: 3, locked: 0, novice: 1, regular: 2 } as const;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const profile = useProfile();
  const { unit } = useWeightUnit();
  const [metric, setMetric] = useState<ProfileChartMetric>('duration');

  const openStrength = useCallback(() => navigation.navigate('StrengthLevels'), [navigation]);
  const openLibrary = useCallback(() => navigation.navigate('Exercises'), [navigation]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Profile</Text>
        {profile ? (
          <ProfileBody metric={metric} onMetric={setMetric} onOpenLibrary={openLibrary} onOpenStrength={openStrength} profile={profile} unit={unit} />
        ) : null}
        <Settings />
        <ExerciseArtCredit />
      </ScrollView>
    </Screen>
  );
};

interface ProfileBodyProps {
  profile: ProfileSnapshot;
  unit: WeightUnit;
  metric: ProfileChartMetric;
  onMetric: (metric: ProfileChartMetric) => void;
  onOpenLibrary: () => void;
  onOpenStrength: () => void;
}

const ProfileBody: React.FC<ProfileBodyProps> = ({ metric, onMetric, onOpenLibrary, onOpenStrength, profile, unit }) => {
  const weekLabel = profile.thisWeekMinutes < 60 ? `${profile.thisWeekMinutes} min` : formatHours(profile.thisWeekMinutes);
  const earned = profile.badges.filter((badge) => badge.tier !== 'locked').length;
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [openBadge, setOpenBadge] = useState<BadgeId | null>(null);
  const ordered = useMemo(
    () => [...profile.badges].sort((left, right) => TIER_RANK[right.tier] - TIER_RANK[left.tier] || right.ring - left.ring),
    [profile.badges],
  );
  const earnedBadges = ordered.filter((badge) => badge.tier !== 'locked');
  const visibleBadges = showAllBadges ? earnedBadges : earnedBadges.slice(0, COLLAPSED_BADGES);
  const selected = openBadge ? (profile.badges.find((badge) => badge.id === openBadge) ?? null) : null;
  const toggleBadges = useCallback(() => setShowAllBadges((open) => !open), []);
  const closeBadge = useCallback(() => setOpenBadge(null), []);

  return (
    <View>
      <View style={styles.stats}>
        <Stat label="Workouts" value={String(profile.workouts)} />
        <Stat label="This week" value={weekLabel} />
        <Stat label="Exercises" value={String(profile.trainedExercises)} />
      </View>

      <LevelBlock level={profile.level} />

      <StrengthSummary onOpen={onOpenStrength} unit={unit} />
      <Pressable accessibilityLabel="Exercise library" accessibilityRole="button" onPress={onOpenLibrary} style={styles.strength}>
        <View style={styles.flex}>
          <Text style={styles.strengthKicker}>Library</Text>
          <Text style={styles.strengthTitle}>Exercise library</Text>
          <Text style={styles.muted}>Rename, recategorize, or add a custom exercise.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

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

      {earned > 0 ? (
        <View>
          <View style={styles.sectionHead}>
            <Text style={[styles.section, styles.sectionInline]}>Badges</Text>
            <Text style={styles.range}>
              {earned} of {profile.badges.length} earned
            </Text>
          </View>
          <View style={styles.badges}>
            {visibleBadges.map((badge) => (
              <BadgeView badge={badge} key={badge.id} onOpen={setOpenBadge} unit={unit} />
            ))}
          </View>
          {earnedBadges.length > COLLAPSED_BADGES ? (
            <Pressable accessibilityRole="button" onPress={toggleBadges} style={styles.more}>
              <Text style={styles.moreText}>{showAllBadges ? 'Show fewer' : `Show all ${earnedBadges.length} badges`}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.section}>Number of contributions</Text>
      {profile.contributions.map((item) => (
        <View key={item.id} style={styles.contribution}>
          <Text style={styles.contributionLabel}>{item.label}</Text>
          <Text style={styles.contributionValue}>{item.value.toLocaleString()}</Text>
        </View>
      ))}

      <BadgeSheet badge={selected} onClose={closeBadge} unit={unit} />
    </View>
  );
};

const LevelBlock: React.FC<{ level: ProfileLevel }> = ({ level }) => {
  const [explain, setExplain] = useState(false);
  const toggle = useCallback(() => setExplain((open) => !open), []);
  const inLevel = level.ceiling == null ? null : { done: level.points - level.floor, span: level.ceiling - level.floor };
  return (
    <View style={styles.levelBlock}>
      <LevelMedal level={level.level} />
      <Text style={styles.levelTitle}>
        Level {level.level} <Text style={styles.levelOf}>of {level.maxLevel}</Text>
      </Text>
      <Text style={styles.levelName}>{level.title}</Text>
      <LevelBar ceiling={level.ceiling} floor={level.floor} points={level.points} />
      <View style={styles.levelNumbers}>
        <Text style={styles.points}>{inLevel ? `${inLevel.done.toLocaleString()} / ${inLevel.span.toLocaleString()} XP` : `${level.points.toLocaleString()} XP`}</Text>
        <Text style={styles.pointsStrong}>{level.toNext == null ? 'Top level' : `${level.toNext.toLocaleString()} XP to level ${level.level + 1}`}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: explain }} hitSlop={6} onPress={toggle}>
        <Text style={styles.link}>{explain ? 'Hide how XP works' : 'How XP works'}</Text>
      </Pressable>
      {explain ? (
        <View style={styles.xpRules}>
          {XP_RULES.map((rule) => (
            <View key={rule.label} style={styles.xpRule}>
              <Text style={styles.xpLabel}>{rule.label}</Text>
              <Text style={styles.xpValue}>+{rule.points} XP</Text>
            </View>
          ))}
          <Text style={styles.xpNote}>Total so far: {level.points.toLocaleString()} XP. Levels get further apart as you climb.</Text>
        </View>
      ) : null}
    </View>
  );
};

const StrengthSummary: React.FC<{ onOpen: () => void; unit: WeightUnit }> = ({ onOpen, unit }) => {
  const overview = useStrengthOverview();
  const best = overview?.ratings[0];
  const ready = overview?.body.bodyweightKg != null && overview.body.sex != null;
  return (
    <Pressable accessibilityLabel="Strength levels" accessibilityRole="button" onPress={onOpen} style={styles.strength}>
      <View style={styles.flex}>
        <Text style={styles.strengthKicker}>Strength level</Text>
        {best ? (
          <>
            <Text style={styles.strengthTitle}>
              {best.liftName} · {best.level}
            </Text>
            <Text style={styles.muted}>
              Stronger than about {best.percentile}% of lifters · est. 1RM {formatWeight(Math.round(kgToDisplay(best.oneRepMaxKg, unit)))} {unit}
            </Text>
            <View style={styles.strengthScale}>
              {STRENGTH_LEVELS.map((level, index) => (
                <View key={level} style={[styles.strengthSegment, index <= best.levelIndex && styles.strengthSegmentOn]} />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.strengthTitle}>{ready ? 'Log a main lift to get a level' : 'See how your lifts compare'}</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
};

const CreditLink: React.FC<{ href: string; label: string }> = ({ href, label }) => {
  const open = useCallback(() => {
    void Linking.openURL(href);
  }, [href]);
  return (
    <Text accessibilityRole="link" onPress={open} style={styles.artLink}>
      {label}
    </Text>
  );
};

const ExerciseArtCredit: React.FC = () => {
  return (
    <View style={styles.credit}>
      <Text style={styles.section}>Exercise drawings</Text>
      <Text style={styles.hint}>
        © 2026 <CreditLink href="https://bryllim.com" label="Bryl Lim" />, from <CreditLink href="https://github.com/everkinetic/data" label="Everkinetic" />,{' '}
        <CreditLink href="https://bryllim.github.io/workout-guide/exercises/" label="Workout Guide" />. <CreditLink href="https://creativecommons.org/licenses/by-sa/4.0/" label="CC BY-SA 4.0" />. Scaled, heavier frame left out, figure held in place.
      </Text>
    </View>
  );
};

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setUnit, unit } = useWeightUnit();
  const { setWarmupMultiplier, warmupMultiplier } = useWarmupRestMultiplier();
  const { loggedRpe, setShowRpe, showRpe } = useShowRpe();
  const { body, setBody } = useBodyProfile();
  const selectMultiplier = useCallback((value: string) => setWarmupMultiplier(Number(value)), [setWarmupMultiplier]);
  const selectRpe = useCallback((value: string) => setShowRpe(value === 'on'), [setShowRpe]);
  const showTutorial = useCallback(() => dispatch(tutorialRequested()), [dispatch]);
  return (
    <View>
      <Text style={styles.section}>Settings</Text>
      <View style={styles.settingRow}>
        <Text style={styles.contributionLabel}>Weight unit</Text>
        <UnitToggle onChange={setUnit} unit={unit} />
      </View>
      {loggedRpe ? null : (
        <View style={styles.settingRow}>
          <Text style={styles.contributionLabel}>Show RPE</Text>
          <View style={styles.multipliers}>
            <Chip label="Off" onSelect={selectRpe} selected={!showRpe} value="off" />
            <Chip label="On" onSelect={selectRpe} selected={showRpe} value="on" />
          </View>
        </View>
      )}
      <View style={styles.settingBlock}>
        <Text style={styles.contributionLabel}>Warmup rest</Text>
        <Text style={styles.hint}>A light warmup rests this share of the exercise&apos;s rest. Heavier warmups rest longer, up to the full rest.</Text>
        <View style={styles.multipliers}>
          {WARMUP_MULTIPLIERS.map((multiplier) => (
            <Chip key={multiplier} label={formatMultiplier(multiplier)} onSelect={selectMultiplier} selected={warmupMultiplier === multiplier} value={String(multiplier)} />
          ))}
        </View>
      </View>
      <Pressable accessibilityLabel="Show tutorial" accessibilityRole="button" onPress={showTutorial} style={styles.settingRow}>
        <Text style={styles.contributionLabel}>Tutorial</Text>
        <Text style={styles.sheetCloseText}>Show again</Text>
      </Pressable>
      <Text style={styles.settingCaption}>For strength levels</Text>
      <BodyProfileForm body={body} onChange={setBody} unit={unit} />
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

/** A five-point star centred on (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${points.join('L')}Z`;
}

const MEDAL_STAR = starPath(36, 37.5, 17, 7.2);

const LevelMedal: React.FC<{ level: number }> = ({ level }) => {
  return (
    <View accessibilityLabel={`Level ${level}`} accessible style={styles.medal}>
      <Svg height="72" viewBox="0 0 72 72" width="72">
        <Circle cx="36" cy="36" fill={colors.accent} r="32" />
        <Path d={MEDAL_STAR} fill={colors.accentInk} />
      </Svg>
    </View>
  );
};

const LevelBar: React.FC<{ points: number; floor: number; ceiling: number | null }> = ({ ceiling, floor, points }) => {
  const span = ceiling == null ? 1 : Math.max(1, ceiling - floor);
  const ratio = ceiling == null ? 1 : Math.min(1, Math.max(0, (points - floor) / span));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
};

const WeekChart: React.FC<{ weeks: ProfileWeek[]; metric: ProfileChartMetric; unit: WeightUnit }> = ({ metric, unit, weeks }) => {
  const values = weeks.map((week) => (metric === 'volume' ? kgToDisplay(weekValue(week, metric), unit) : weekValue(week, metric)));
  const peak = Math.max(...values, 1);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  const spoken = (value: number) => {
    if (metric === 'volume') {
      return `${formatVolume(value)} ${unit}`;
    }
    if (metric === 'reps') {
      return `${Math.round(value)} reps`;
    }
    return `${Math.round(value)} minutes`;
  };
  const summary =
    first && last
      ? `${METRICS.find((item) => item.id === metric)?.label ?? 'Weeks'} over 12 weeks. ${formatDay(first.start)}, ${spoken(values[0] ?? 0)}. ${formatDay(last.start)}, ${spoken(values[values.length - 1] ?? 0)}.`
      : 'No weeks yet';
  return (
    <View accessibilityLabel={summary} accessible>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chart}>
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

const BadgeRing: React.FC<{ badge: ProfileBadge; size: number }> = ({ badge, size }) => {
  const locked = badge.tier === 'locked';
  const color = locked ? colors.faint : badgeColor(badge.id);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(1, Math.max(0.08, badge.ring));
  return (
    <View style={[styles.badgeArt, { height: size, width: size }]}>
      <Svg height={size} viewBox="0 0 64 64" width={size}>
        <Circle cx="32" cy="32" fill="none" r={radius} stroke={colors.border} strokeWidth="4" />
        <Circle cx="32" cy="32" fill="none" r={radius} stroke={color} strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" strokeWidth="4" transform="rotate(-90 32 32)" />
        <Circle cx="32" cy="32" fill={locked ? colors.surface : colors.surfaceRaised} r="20" />
      </Svg>
      <View style={styles.badgeGlyph}>
        <BadgeGlyph color={color} id={badge.id} size={Math.round(size * 0.375)} />
      </View>
    </View>
  );
};

const BadgeView: React.FC<{ badge: ProfileBadge; unit: WeightUnit; onOpen: (id: BadgeId) => void }> = React.memo(function BadgeView({ badge, onOpen, unit }) {
  const locked = badge.tier === 'locked';
  const goal = badge.next == null ? null : formatBadgeAmount(badge, badge.next, unit);
  const handlePress = useCallback(() => onOpen(badge.id), [badge.id, onOpen]);
  return (
    <Pressable
      accessibilityHint="Shows what the badge counts"
      accessibilityLabel={`${badge.title}, ${badge.detail}${goal ? `, next at ${goal}` : ''}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.badge}
    >
      <BadgeRing badge={badge} size={64} />
      <Text numberOfLines={1} style={[styles.badgeName, locked && styles.badgeNameLocked]}>
        {badge.title}
      </Text>
      <Text numberOfLines={2} style={styles.badgeTitle}>
        {locked ? goal : badge.detail}
      </Text>
    </Pressable>
  );
});

/** What a badge counts, where you are, and each tier's target. */
const BadgeSheet: React.FC<{ badge: ProfileBadge | null; unit: WeightUnit; onClose: () => void }> = ({ badge, onClose, unit }) => {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={badge != null}>
      <Pressable accessibilityLabel="Close badge" onPress={onClose} style={styles.backdrop}>
        {badge ? (
          <Pressable accessibilityRole="none" style={styles.sheet}>
            <BadgeRing badge={badge} size={96} />
            <Text style={styles.sheetTitle}>{badge.title}</Text>
            <Text style={styles.sheetTier}>{badge.tier === 'locked' ? 'Locked' : `${badge.detail} tier`}</Text>
            <Text style={styles.sheetText}>{badge.description}</Text>
            <Text style={styles.sheetProgress}>
              Now: {formatBadgeAmount(badge, badge.value, unit)}
              {badge.next != null ? ` · next at ${formatBadgeAmount(badge, badge.next, unit)}` : ' · top tier'}
            </Text>
            <View style={styles.tiers}>
              {(['Novice', 'Regular', 'Expert'] as const).map((tier, index) => {
                const reached = badge.value >= badge.steps[index];
                return (
                  <View key={tier} style={styles.tierRow}>
                    <Text style={[styles.tierMark, reached && styles.tierMarkOn]}>{reached ? '✓' : '○'}</Text>
                    <Text style={[styles.tierName, reached && styles.tierNameOn]}>{tier}</Text>
                    <Text style={styles.tierGoal}>{formatBadgeAmount(badge, badge.steps[index], unit)}</Text>
                  </View>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
};

function formatBadgeAmount(badge: ProfileBadge, amount: number, unit: WeightUnit): string {
  const label = BADGE_INFO[badge.id].unit;
  if (badge.id === 'strong') {
    return amount <= 0 ? 'no level yet' : (STRENGTH_LEVELS[amount - 1] ?? 'Elite');
  }
  if (label.startsWith('kg')) {
    return `${formatStep(Math.round(kgToDisplay(amount, unit)))} ${label.replace('kg', unit)}`;
  }
  return `${formatStep(amount)} ${amount === 1 ? singularUnit(label) : label}`;
}

/** Badge units are stored as plurals. One of something should read as one. */
function singularUnit(unit: string): string {
  const singles: Record<string, string> = {
    exercises: 'exercise',
    notes: 'note',
    PRs: 'PR',
    reps: 'rep',
    sets: 'set',
    warmups: 'warmup',
    workouts: 'workout',
    '100-rep workouts': '100-rep workout',
    '90-min sessions': '90-min session',
    'muscle groups': 'muscle group',
    'quick sessions': 'quick session',
    'sets with RPE': 'set with RPE',
    'weekend workouts': 'weekend workout',
    'weeks in a row': 'week in a row',
  };
  return singles[unit] ?? unit;
}

function formatStep(value: number): string {
  return value >= 1000 ? `${formatDecimal(value / 1000, 1)}k` : String(Math.round(value));
}

const BADGE_COLORS: Record<BadgeId, string> = {
  allrounder: '#7EB6FF',
  bigday: '#FF8A8A',
  century: '#3DDC97',
  early: '#FFB86B',
  explorer: '#C084FC',
  heavy: '#FF8A8A',
  lifter: '#7EB6FF',
  logger: colors.accent,
  marathon: '#5EEAD4',
  night: '#A5B4FC',
  quick: '#F0C14A',
  records: '#F0C14A',
  reps: '#3DDC97',
  rpe: '#5EEAD4',
  scribe: '#F0C14A',
  sets: colors.accent,
  streak: '#FF9F43',
  strong: '#FB7185',
  warmup: '#FB7185',
  weekender: '#C084FC',
};

function badgeColor(id: BadgeId): string {
  return BADGE_COLORS[id];
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
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  badge: {
    alignItems: 'center',
    marginBottom: 18,
    width: '25%',
  },
  badgeArt: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlyph: {
    position: 'absolute',
  },
  badgeName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: colors.muted,
  },
  badgeTitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    paddingHorizontal: 2,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
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
  chevron: {
    color: colors.faint,
    fontSize: 24,
  },
  content: {
    ...screenTitleInset,
    paddingBottom: 32,
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
  fill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
  },
  flex: {
    flex: 1,
  },
  header: {
    ...screenTitle,
    marginBottom: 16,
  },
  artLink: {
    color: colors.accent,
  },
  credit: {
    marginBottom: 28,
  },
  hint: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  levelBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  levelName: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  levelNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    width: '100%',
  },
  levelOf: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '600',
  },
  levelTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 12,
  },
  link: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  medal: {
    alignItems: 'center',
  },
  more: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  moreText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  multipliers: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
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
  },
  pointsStrong: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  range: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
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
  sectionInline: {
    marginBottom: 0,
    marginTop: 0,
  },
  settingBlock: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  settingCaption: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sheet: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 380,
    padding: 22,
    width: '100%',
  },
  sheetClose: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sheetCloseText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  sheetProgress: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  sheetText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  sheetTier: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    width: '100%',
  },
  strength: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    padding: 14,
  },
  strengthKicker: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  strengthScale: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  strengthSegment: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    flex: 1,
    height: 6,
  },
  strengthSegmentOn: {
    backgroundColor: colors.accent,
  },
  strengthTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  tierGoal: {
    color: colors.muted,
    fontSize: 13,
  },
  tierMark: {
    color: colors.faint,
    fontSize: 14,
    width: 20,
  },
  tierMarkOn: {
    color: colors.accent,
  },
  tierName: {
    color: colors.muted,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  tierNameOn: {
    color: colors.text,
  },
  tierRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tiers: {
    alignSelf: 'stretch',
    marginTop: 12,
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
  xpLabel: {
    color: colors.text,
    fontSize: 14,
  },
  xpNote: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 8,
  },
  xpRule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  xpRules: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  xpValue: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});
