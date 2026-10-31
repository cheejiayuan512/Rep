/**
 * Pushes this week's training, or the open workout, to the home screen widget.
 * The widget extension only exists in an iOS or Android build.
 */
import { Platform } from 'react-native';

import { getActiveWorkoutSummary, getInProgressWorkoutId, getSettings, listWorkoutSummaries } from '../data/repository';
import { buildHomeStats } from '../domain/stats';
import { formatVolume, kgToDisplay } from '../domain/units';

export interface HomeWidgetProps {
  heading: string;
  primary: string;
  secondary: string;
}

export function homeWidgetProps(): HomeWidgetProps | null {
  const settings = getSettings.now();
  const workouts = listWorkoutSummaries.now();
  if (!settings || !workouts) {
    return null;
  }
  const activeId = getInProgressWorkoutId.now();
  const active = activeId ? getActiveWorkoutSummary.now(activeId) : null;
  if (active) {
    return {
      heading: 'In progress',
      primary: active.name.trim() || 'Workout',
      secondary: active.exerciseCount === 1 ? '1 exercise' : `${active.exerciseCount} exercises`,
    };
  }
  const stats = buildHomeStats(workouts, Date.now());
  const week = stats.thisWeek;
  const streakWeeks = stats.streakWeeks;
  const volume = `${formatVolume(kgToDisplay(week.volumeKg, settings.weightUnit))} ${settings.weightUnit}`;
  const streak = streakWeeks === 1 ? '1 week streak' : streakWeeks > 1 ? `${streakWeeks} week streak` : '';
  return {
    heading: 'This week',
    primary: week.workouts === 1 ? '1 workout' : `${week.workouts} workouts`,
    secondary: week.workouts === 0 ? 'Start a workout in Rep' : streak ? `${volume} · ${streak}` : volume,
  };
}

export function syncHomeWidget(): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }
  const props = homeWidgetProps();
  if (!props) {
    return;
  }
  try {
    const widget = require('./home-widget').default as { updateSnapshot: (next: HomeWidgetProps) => void };
    widget.updateSnapshot(props);
  } catch {
    // Expo Go has no widget extension. A development or store build does.
  }
}
