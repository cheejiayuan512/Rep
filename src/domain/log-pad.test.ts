/**
 * The logging pad: first key replaces, weight keeps two decimals, RPE steps by half a point.
 */
import { assertEqual, test } from './test-support';
import { backspaceKey, nudgeLogValue, rpeHint, typeKey } from './log-pad';

test('the first digit replaces whatever was in the box', () => {
  assertEqual(typeKey('82.5', '6', 'weight', true), '6');
  assertEqual(typeKey('5', '1', 'reps', true), '1');
});

test('later digits append, and weight keeps one dot and two decimals', () => {
  assertEqual(typeKey('8', '2', 'weight', false), '82');
  assertEqual(typeKey('82', '.', 'weight', false), '82.');
  assertEqual(typeKey('82.', '5', 'weight', false), '82.5');
  assertEqual(typeKey('82.5', '5', 'weight', false), '82.55');
  assertEqual(typeKey('82.55', '1', 'weight', false), null);
  assertEqual(typeKey('82.5', '.', 'weight', false), null);
  assertEqual(typeKey('', '.', 'weight', false), '0.');
});

test('reps stay a whole number up to three digits', () => {
  assertEqual(typeKey('12', '.', 'reps', false), null);
  assertEqual(typeKey('0', '8', 'reps', false), '8');
  assertEqual(typeKey('999', '1', 'reps', false), null);
});

test('a decimal as the first weight key starts at zero', () => {
  assertEqual(typeKey('100', '.', 'weight', true), '0.');
  assertEqual(typeKey('8', '.', 'reps', true), null);
});

test('the first delete clears the field', () => {
  assertEqual(backspaceKey('82.5', true), '');
  assertEqual(backspaceKey('82.5', false), '82.');
  assertEqual(backspaceKey('8', false), '');
});

test('plus and minus step weight by a small plate and reps by one', () => {
  assertEqual(nudgeLogValue('80', 1, 'weight', 'kg'), '82.5');
  assertEqual(nudgeLogValue('80', -1, 'weight', 'kg'), '77.5');
  assertEqual(nudgeLogValue('100', 1, 'weight', 'lb'), '105');
  assertEqual(nudgeLogValue('', 1, 'reps', 'kg'), '1');
  assertEqual(nudgeLogValue('0', -1, 'weight', 'kg'), '0');
});

test('RPE steps by half a point and an empty box enters the scale', () => {
  assertEqual(nudgeLogValue('7.5', 1, 'rpe', 'kg'), '8');
  assertEqual(nudgeLogValue('7.5', -1, 'rpe', 'kg'), '7');
  assertEqual(nudgeLogValue('', 1, 'rpe', 'kg'), '6');
  assertEqual(nudgeLogValue('', -1, 'rpe', 'kg'), '10');
  assertEqual(nudgeLogValue('10', 1, 'rpe', 'kg'), '10');
  assertEqual(nudgeLogValue('0', -1, 'rpe', 'kg'), '0');
});

test('the effort line says how many reps were left', () => {
  assertEqual(rpeHint(null), 'How many reps were left?');
  assertEqual(rpeHint(7.5), 'Two reps left, maybe three.');
  assertEqual(rpeHint(10), 'No reps left.');
  assertEqual(rpeHint(5), 'Easier than a hard set. Several reps left.');
});
