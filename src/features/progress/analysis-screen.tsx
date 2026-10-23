/**
 * Training analysis for a chosen period, compared with the period before it:
 * frequency, volume, muscle balance, rep ranges, effort, and top lifts.
 * Working sets only; warmups and unfinished sets do not count.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Chip } from '../../components/chip';
import { EmptyState } from '../../components/empty-state';
import { Header, TextButton } from '../../components/header';
import { Screen } from '../../components/screen';
import type { Analysis, RepRange } from '../../domain/stats';
import { formatVolume, formatWeight, kgToDisplay } from '../../domain/units';
import type { WeightUnit } from '../../domain/types';
import type { StackNavigation } from '../../navigation/types';
import { useAnalysis, useWeightUnit } from '../../state/hooks';
import { colors } from '../../theme/colors';

const PERIODS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
] as const;

type PeriodLabel = (typeof PERIODS)[number]['label'];

const RANGE_LABELS: Record<RepRange, string> = {
  endurance: 'Endurance · 13+ reps',
  hypertrophy: 'Hypertrophy · 6–12 reps',
  strength: 'Strength · 1–5 reps',
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const AnalysisScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigation>();
  const { unit } = useWeightUnit();
  const [period, setPeriod] = useState<PeriodLabel>('30 days');
  const days = PERIODS.find((item) => item.label === period)?.days ?? 30;
  const analysis = useAnalysis(days);
  const selectPeriod = useCallback((value: PeriodLabel) => setPeriod(value), []);

  return (
    <Screen bottomInset>
      <Header left={<TextButton label="Back" onPress={navigation.goBack} />} title="Analysis" />
      <View style={styles.periods}>
        {PERIODS.map((item) => (
          <Chip key={item.label} label={item.label} onSelect={selectPeriod} selected={item.label === period} value={item.label} />
        ))}
      </View>
      {!analysis ? (
        <Text style={styles.loading}>Crunching your log…</Text>
      ) : analysis.workouts === 0 ? (
        <EmptyState message={`Finish a workout in the last ${period} to see the breakdown.`} title="No workouts in this period" />
      ) : (
        <AnalysisBody analysis={analysis} period={period} unit={unit} />
      )}
    </Screen>
  );
};

const AnalysisBody: React.FC<{ analysis: Analysis; period: string; unit: WeightUnit }> = ({ analysis, period, unit }) => {
  const peakDay = Math.max(...analysis.weekdays, 1);
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.fill}>
      <View style={styles.grid}>
        <Tile change={analysis.workoutsChange} label="Workouts" sub={`${formatWeight(analysis.perWeek)} per week`} value={String(analysis.workouts)} />
        <Tile change={analysis.volumeChange} label={`Volume (${unit})`} sub={`vs the ${period} before`} value={formatVolume(kgToDisplay(analysis.volumeKg, unit))} />
        <Tile label="Avg session" sub="from start to finish" value={`${analysis.averageMinutes} min`} />
        <Tile label="Avg sets" sub="working sets per workout" value={formatWeight(analysis.averageSets)} />
      </View>

      <Text style={styles.section}>Muscle groups</Text>
      <Text style={styles.caption}>Share of working sets. A big gap can point to a muscle that needs more work.</Text>
      <View style={styles.card}>
        {analysis.muscles.map((row) => (
          <ShareBar key={row.id} label={row.id} share={row.share} value={`${row.sets} sets`} />
        ))}
      </View>

      <Text style={styles.section}>Rep ranges</Text>
      <View style={styles.card}>
        {analysis.repRanges.map((row) => (
          <ShareBar key={row.id} label={RANGE_LABELS[row.id]} share={row.share} value={`${Math.round(row.share * 100)}%`} />
        ))}
      </View>

      <Text style={styles.section}>Training days</Text>
      <View style={[styles.card, styles.days]}>
        {analysis.weekdays.map((count, index) => (
          <View accessibilityLabel={`${WEEKDAYS[index]} ${count} workouts`} key={index} style={styles.day}>
            <Text style={styles.dayCount}>{count}</Text>
            <View style={styles.dayTrack}>
              <View style={[styles.dayFill, { height: `${(count / peakDay) * 100}%` }]} />
            </View>
            <Text style={styles.dayLabel}>{WEEKDAYS[index]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Effort</Text>
      <View style={[styles.card, styles.effort]}>
        <Text style={styles.effortValue}>{analysis.averageRpe == null ? '—' : formatWeight(analysis.averageRpe)}</Text>
        <View style={styles.effortCopy}>
          <Text style={styles.effortLabel}>Average RPE</Text>
          <Text style={styles.caption}>
            {analysis.averageRpe == null ? 'Log RPE on your sets to track effort.' : `Logged on ${Math.round(analysis.rpeShare * 100)}% of working sets.`}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Top lifts</Text>
      <Text style={styles.caption}>Best estimated 1RM for your most-trained exercises, against the {period} before.</Text>
      <View style={styles.card}>
        {analysis.lifts.map((lift) => {
          const delta = lift.previousKg == null ? null : lift.bestKg - lift.previousKg;
          return (
            <View key={lift.exerciseId} style={styles.lift}>
              <View style={styles.liftCopy}>
                <Text numberOfLines={1} style={styles.liftName}>
                  {lift.name}
                </Text>
                <Text style={styles.caption}>{lift.sets} working sets</Text>
              </View>
              <View style={styles.liftNumbers}>
                <Text style={styles.liftValue}>
                  {formatWeight(kgToDisplay(lift.bestKg, unit))} {unit}
                </Text>
                <Text style={[styles.liftDelta, delta != null && delta > 0.05 ? styles.up : delta != null && delta < -0.05 ? styles.down : null]}>
                  {delta == null ? 'New' : `${delta >= 0 ? '+' : '−'}${formatWeight(Math.abs(kgToDisplay(delta, unit)))} ${unit}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const Tile: React.FC<{ label: string; value: string; sub: string; change?: number | null }> = ({ change, label, sub, value }) => {
  return (
    <View style={styles.tile}>
      <View style={styles.tileTop}>
        <Text style={styles.tileValue}>{value}</Text>
        {change != null ? (
          <Text style={[styles.change, change > 0 ? styles.up : change < 0 ? styles.down : null]}>
            {change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(Math.round(change * 100))}%
          </Text>
        ) : null}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.tileSub}>
        {sub}
      </Text>
    </View>
  );
};

const ShareBar: React.FC<{ label: string; value: string; share: number }> = ({ label, share, value }) => {
  return (
    <View style={styles.share}>
      <View style={styles.shareHead}>
        <Text numberOfLines={1} style={styles.shareLabel}>
          {label}
        </Text>
        <Text style={styles.shareValue}>{value}</Text>
      </View>
      <View style={styles.shareTrack}>
        <View style={[styles.shareFill, { width: `${Math.max(2, share * 100)}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  caption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  change: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
  day: {
    alignItems: 'center',
    flex: 1,
  },
  dayCount: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  dayFill: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    width: '100%',
  },
  dayLabel: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  dayTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 6,
    height: 80,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 18,
  },
  days: {
    flexDirection: 'row',
  },
  down: {
    color: colors.danger,
  },
  effort: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  effortCopy: {
    flex: 1,
  },
  effortLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  effortValue: {
    color: colors.accent,
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 64,
    textAlign: 'center',
  },
  fill: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  lift: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  liftCopy: {
    flex: 1,
    paddingRight: 12,
  },
  liftDelta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'right',
  },
  liftName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  liftNumbers: {
    alignItems: 'flex-end',
  },
  liftValue: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  loading: {
    color: colors.muted,
    padding: 20,
  },
  periods: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 26,
  },
  share: {
    marginVertical: 6,
  },
  shareFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
  },
  shareHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  shareLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingRight: 8,
  },
  shareTrack: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  shareValue: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  tileSub: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 6,
  },
  tileTop: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  tileValue: {
    color: colors.text,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  up: {
    color: colors.success,
  },
});
