import { buildProfile, levelForPoints, startOfWeek, weekValue, type ProfileWorkout } from './profile';
import { assertEqual, test } from './test-support';

function workout(overrides: Partial<ProfileWorkout> = {}): ProfileWorkout {
  return {
    exerciseIds: ['back-squat'],
    finishedAt: new Date(2026, 9, 20, 20, 41).getTime(),
    heaviestKg: 80,
    id: 'w1',
    muscleGroups: ['Quads'],
    rpeSets: 2,
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
  assertEqual(profile.badges.length, 20);
  assertEqual(tier('heavy'), 'regular');
  assertEqual(tier('records'), 'regular');
  assertEqual(tier('early'), 'novice');
  assertEqual(tier('night'), 'locked');
  assertEqual(tier('marathon'), 'novice');
  assertEqual(profile.badges.find((item) => item.id === 'heavy')?.next, 140);
});

test('levels say how far the next one is, and stop at the top', () => {
  assertEqual(levelForPoints(13000).level, 20);
  assertEqual(levelForPoints(13000).ceiling, null);
  assertEqual(levelForPoints(13000).toNext, null);
  assertEqual(levelForPoints(13000).title, 'Legend');
  assertEqual(levelForPoints(19).level, 1);
  assertEqual(levelForPoints(19).toNext, 1);
  assertEqual(levelForPoints(20).level, 2);
  assertEqual(levelForPoints(20).maxLevel, 20);
  assertEqual(levelForPoints(700).title, 'Regular');
});

test('records add XP and the newer badges count their own thing', () => {
  const now = new Date(2026, 9, 22).getTime();
  // Saturday 17 Oct 2026, 40 minutes, 12 sets, 120 reps.
  const quick = workout({
    finishedAt: new Date(2026, 9, 17, 10, 40).getTime(),
    id: 'w3',
    muscleGroups: ['Chest', 'Back', 'Quads', 'Biceps'],
    reps: 120,
    startedAt: new Date(2026, 9, 17, 10, 0).getTime(),
    volumeKg: 6000,
    workingSets: 12,
  });
  const withoutRecords = buildProfile({ customExerciseCount: 0, now, recordCount: 0, workouts: [quick] });
  const withRecords = buildProfile({ customExerciseCount: 0, now, recordCount: 2, strengthLevelIndex: 2, workouts: [quick] });
  assertEqual(withRecords.level.points - withoutRecords.level.points, 6);
  const tier = (id: string) => withRecords.badges.find((item) => item.id === id)?.tier;
  assertEqual(tier('quick'), 'novice');
  assertEqual(tier('weekender'), 'novice');
  assertEqual(tier('century'), 'novice');
  assertEqual(tier('allrounder'), 'novice');
  assertEqual(tier('bigday'), 'novice');
  assertEqual(tier('strong'), 'regular');
  assertEqual(tier('sets'), 'locked');
  assertEqual(withoutRecords.badges.find((item) => item.id === 'strong')?.tier, 'locked');
  assertEqual(withRecords.badges.every((item) => item.description.length > 0), true);
});
