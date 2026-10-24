import { defaultRestFor, restAfterSet, restClassFor, warmupLoadRatio, type RestSubject } from './rest';
import { assertEqual, test } from './test-support';

function subject(exerciseId: string, name: string, muscleGroup: RestSubject['muscleGroup'], equipment: RestSubject['equipment']): RestSubject {
  return { equipment, exerciseId, muscleGroup, name };
}

test('heavy barbell compounds rest longest', () => {
  assertEqual(restClassFor(subject('back-squat', 'Back Squat', 'Quads', 'Barbell')), 'heavy');
  assertEqual(restClassFor(subject('deadlift', 'Deadlift', 'Back', 'Barbell')), 'heavy');
  assertEqual(restClassFor(subject('barbell-bench-press', 'Barbell Bench Press', 'Chest', 'Barbell')), 'heavy');
  assertEqual(defaultRestFor(subject('back-squat', 'Back Squat', 'Quads', 'Barbell')), 180);
});

test('dumbbell and bodyweight compounds sit in the middle', () => {
  assertEqual(restClassFor(subject('dumbbell-bench-press', 'Dumbbell Bench Press', 'Chest', 'Dumbbell')), 'compound');
  assertEqual(restClassFor(subject('goblet-squat', 'Goblet Squat', 'Quads', 'Dumbbell')), 'compound');
  assertEqual(restClassFor(subject('pull-up', 'Pull-Up', 'Back', 'Bodyweight')), 'compound');
  assertEqual(defaultRestFor(subject('lat-pulldown', 'Lat Pulldown', 'Back', 'Cable')), 120);
});

test('isolation moves and core work rest less', () => {
  assertEqual(restClassFor(subject('lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell')), 'isolation');
  assertEqual(restClassFor(subject('lying-leg-curl', 'Lying Leg Curl', 'Hamstrings', 'Machine')), 'isolation');
  assertEqual(restClassFor(subject('face-pull', 'Face Pull', 'Back', 'Cable')), 'isolation');
  assertEqual(restClassFor(subject('plank', 'Plank', 'Core', 'Bodyweight')), 'short');
  assertEqual(defaultRestFor(subject('standing-calf-raise', 'Standing Calf Raise', 'Calves', 'Machine')), 60);
});

test('custom exercises are classed by name and equipment', () => {
  assertEqual(restClassFor(subject('x1', 'Safety Bar Squat', 'Quads', 'Barbell')), 'heavy');
  assertEqual(restClassFor(subject('x2', 'Landmine Press', 'Shoulders', 'Other')), 'compound');
  assertEqual(restClassFor(subject('x3', 'Spider Curl', 'Biceps', 'Dumbbell')), 'isolation');
  assertEqual(restClassFor(subject('x4', 'Pec Deck', 'Chest', 'Machine')), 'isolation');
});

test('light warmups rest for a fraction, rounded to 5 seconds', () => {
  assertEqual(restAfterSet(180, 'warmup', 0.5), 90);
  assertEqual(restAfterSet(90, 'warmup', 0.25), 25);
  assertEqual(restAfterSet(60, 'warmup', 0.25), 15);
  assertEqual(restAfterSet(120, 'normal', 0.5), 120);
});

test('heavier warmups rest longer, up to the full rest', () => {
  // 180 s at ½: empty bar 90 s, 50% 115 s, 80% 150 s, 100% 180 s.
  assertEqual(restAfterSet(180, 'warmup', 0.5, 0), 90);
  assertEqual(restAfterSet(180, 'warmup', 0.5, 0.5), 115);
  assertEqual(restAfterSet(180, 'warmup', 0.5, 0.8), 150);
  assertEqual(restAfterSet(180, 'warmup', 0.5, 1), 180);
  assertEqual(restAfterSet(180, 'warmup', 0.5, 3), 180);
});

test('the load ratio uses the heaviest working set, then last session', () => {
  const sets = [
    { setType: 'warmup' as const, weightKg: 60 },
    { setType: 'normal' as const, weightKg: 100 },
    { setType: 'normal' as const, weightKg: 120 },
  ];
  assertEqual(warmupLoadRatio(60, sets), 0.5);
  assertEqual(warmupLoadRatio(60, [{ setType: 'warmup', weightKg: 60 }], [{ setType: 'normal', weightKg: 80 }]), 0.75);
  assertEqual(warmupLoadRatio(null, sets), 0);
  assertEqual(warmupLoadRatio(40, [{ setType: 'normal', weightKg: null }]), 0);
});
