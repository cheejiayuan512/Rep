import { buildProfile, levelForPoints, startOfWeek, weekValue, type ProfileWorkout } from './profile';
import { assertEqual, test } from './test-support';

function workout(overrides: Partial<ProfileWorkout> = {}): ProfileWorkout {
  return {
    exerciseIds: ['back-squat'],
    finishedAt: new Date(2026, 9, 20, 20, 41).getTime(),
    heaviestKg: 80,
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
  const profile = buildProfile({ customExerciseCount: 0, now: new Date(2026, 9, 22).getTime(), recordCount: 0, workouts: [] });
  assertEqual(profile.level.level, 1);
  assertEqual(profile.level.points, 0);
  assertEqual(profile.badges.every((item) => item.tier === 'locked'), true);
  assertEqual(profile.weeks.length, 12);
});

test('one logged workout earns points and the Logger badge', () => {
  const now = new Date(2026, 9, 22).getTime();
  const profile = buildProfile({ customExerciseCount: 1, now, recordCount: 0, workouts: [workout()] });
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
    recordCount: 0,
    workouts: [workout()],
  });
  const week = profile.weeks.find((item) => item.start === startOfWeek(finishedAt));
  assertEqual(week?.volumeKg, 1000);
  assertEqual(weekValue(week ?? profile.weeks[0], 'reps'), week?.start === startOfWeek(finishedAt) ? 24 : 0);
});

test('the new badges read heaviest set, records, and session times', () => {
  const now = new Date(2026, 9, 22).getTime();
  const early = workout({ finishedAt: new Date(2026, 9, 19, 9, 0).getTime(), heaviestKg: 120, id: 'w2', startedAt: new Date(2026, 9, 19, 6, 30).getTime() });
  const profile = buildProfile({ customExerciseCount: 0, now, recordCount: 12, workouts: [workout(), early] });
  const tier = (id: string) => profile.badges.find((item) => item.id === id)?.tier;
  assertEqual(profile.badges.length, 12);
  assertEqual(tier('heavy'), 'regular');
  assertEqual(tier('records'), 'regular');
  assertEqual(tier('early'), 'novice');
  assertEqual(tier('night'), 'locked');
  assertEqual(tier('marathon'), 'novice');
  assertEqual(profile.badges.find((item) => item.id === 'heavy')?.next, 140);
});

test('level ceilings stop at the top floor', () => {
  assertEqual(levelForPoints(8000).level, 8);
  assertEqual(levelForPoints(8000).ceiling, null);
  assertEqual(levelForPoints(19).level, 1);
  assertEqual(levelForPoints(20).level, 2);
});
