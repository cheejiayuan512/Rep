import { buildProfile, levelForPoints, startOfWeek, weekValue, type ProfileWorkout } from './profile';
import { assertEqual, test } from './test-support';

function workout(overrides: Partial<ProfileWorkout> = {}): ProfileWorkout {
  return {
    exerciseIds: ['back-squat'],
    finishedAt: new Date(2026, 9, 20, 20, 41).getTime(),
    id: 'w1',
    name: 'Morning workout',
    notedExercises: 1,
    reps: 24,
    startedAt: new Date(2026, 9, 20, 18, 42).getTime(),
    volumeKg: 1000,
    warmupSets: 1,
    workingSets: 4,
    ...overrides,
  };
}

test('an empty log is level 1 with locked badges', () => {
  const profile = buildProfile({ customExerciseCount: 0, now: new Date(2026, 9, 22).getTime(), workouts: [] });
  assertEqual(profile.level.level, 1);
  assertEqual(profile.level.points, 0);
  assertEqual(profile.badges.every((item) => item.tier === 'locked'), true);
  assertEqual(profile.weeks.length, 12);
});

test('one logged workout earns points and the Logger badge', () => {
  const now = new Date(2026, 9, 22).getTime();
  const profile = buildProfile({ customExerciseCount: 1, now, workouts: [workout()] });
  // 10 workout + 4 sets + 2 notes + 5 trained + 5 custom
  assertEqual(profile.level.points, 26);
  assertEqual(profile.level.level, 2);
  assertEqual(profile.badges.find((item) => item.id === 'logger')?.tier, 'novice');
  assertEqual(profile.badges.find((item) => item.id === 'explorer')?.tier, 'locked');
  assertEqual(profile.contributions.find((item) => item.id === 'warmups')?.value, 1);
  assertEqual(profile.thisWeekMinutes, 119);
});

test('weekly bars use the week the workout finished', () => {
  const finishedAt = new Date(2026, 9, 20, 20, 41).getTime();
  const profile = buildProfile({
    customExerciseCount: 0,
    now: new Date(2026, 9, 22).getTime(),
    workouts: [workout()],
  });
  const week = profile.weeks.find((item) => item.start === startOfWeek(finishedAt));
  assertEqual(week?.volumeKg, 1000);
  assertEqual(weekValue(week ?? profile.weeks[0], 'reps'), week?.start === startOfWeek(finishedAt) ? 24 : 0);
});

test('level ceilings stop at the top floor', () => {
  assertEqual(levelForPoints(8000).level, 8);
  assertEqual(levelForPoints(8000).ceiling, null);
  assertEqual(levelForPoints(19).level, 1);
  assertEqual(levelForPoints(20).level, 2);
});
