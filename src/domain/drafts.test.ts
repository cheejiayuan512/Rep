/**
 * The text boxes keep what the person typed until it is safe to save as a number.
 */
import { draftFromSet, mergeDrafts, withDraft } from './drafts';
import { assertEqual, test } from './test-support';
import { formatWeight, kgToDisplay } from './units';

test('a saved set becomes box text', () => {
  assertEqual(draftFromSet({ reps: 8, rpe: 8.5, weightKg: 80 }, 'kg'), {
    distanceText: '',
    durationText: '',
    repsText: '8',
    rpeText: '8.5',
    weightText: '80',
  });
});

test('pounds are only the display text', () => {
  const draft = draftFromSet({ reps: null, rpe: null, weightKg: 100 }, 'lb');
  assertEqual(draft.weightText, formatWeight(kgToDisplay(100, 'lb')));
  assertEqual(draft.repsText, '');
  assertEqual(draft.rpeText, '');
});

test('editing one box keeps the others', () => {
  const next = withDraft({ distanceText: '', durationText: '', repsText: '8', rpeText: '7', weightText: '80' }, { weightText: '82.5' });
  assertEqual(next, { distanceText: '', durationText: '', repsText: '8', rpeText: '7', weightText: '82.5' });
});

test('reloading does not wipe text that is still being typed', () => {
  const typed = { distanceText: '', durationText: '', repsText: '8.', rpeText: '', weightText: '80' };
  const merged = mergeDrafts({ 'set-1': typed }, [{ id: 'set-1', reps: 8, rpe: null, weightKg: 80 }], 'kg');
  assertEqual(merged['set-1'], typed);
});
