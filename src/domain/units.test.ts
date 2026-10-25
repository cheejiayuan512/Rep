/**
 * Typing weight, reps, and RPE, and converting pounds back to kilograms.
 */
import { assertClose, assertEqual, test } from './test-support';
import { formatChartTick, formatWeight, kgToDisplay, parseDecimal, parseReps, parseRpe, repsTextToNumber, rpeTextToNumber, weightTextToKg } from './units';

test('100 kg is about 220.46 lb on screen', () => {
  assertClose(kgToDisplay(100, 'lb'), 220.46226218);
  assertEqual(formatWeight(kgToDisplay(100, 'lb')), '220.46');
});

test('small plates keep two decimals through save and display', () => {
  assertEqual(weightTextToKg('8.75', 'kg', null), 8.75);
  assertEqual(formatWeight(8.75), '8.75');
  assertEqual(formatWeight(81.25), '81.25');
  assertEqual(formatWeight(82.5), '82.5');
  assertEqual(formatWeight(kgToDisplay(weightTextToKg('17.5', 'lb', null) ?? 0, 'lb')), '17.5');
});

test('225 lb saved as kilograms converts back', () => {
  const kilograms = weightTextToKg('225', 'lb', null);
  assertClose(kilograms ?? 0, 225 / 2.2046226218);
  assertEqual(formatWeight(kgToDisplay(kilograms ?? 0, 'lb')), '225');
});

test('blank weight clears the saved number', () => {
  assertEqual(weightTextToKg('', 'kg', 80), null);
  assertEqual(weightTextToKg('   ', 'kg', 80), null);
});

test('a weight that is not a number keeps the previous value', () => {
  assertEqual(weightTextToKg('abc', 'kg', 80), 80);
});

test('commas are accepted as decimal points', () => {
  assertEqual(parseDecimal('82,5'), 82.5);
});

test('reps must be a whole number', () => {
  assertEqual(parseReps('8'), 8);
  assertEqual(parseReps('8.5'), null);
  assertEqual(repsTextToNumber('8.5', 5), 5);
  assertEqual(repsTextToNumber('', 5), null);
});

test('RPE is optional and stays between 0 and 10', () => {
  assertEqual(parseRpe(''), null);
  assertEqual(parseRpe('8.5'), 8.5);
  assertEqual(parseRpe('8,5'), 8.5);
  assertEqual(parseRpe('11'), null);
  assertEqual(rpeTextToNumber('nope', 7), 7);
  assertEqual(rpeTextToNumber('', 7), null);
});

test('chart ticks shorten thousands', () => {
  assertEqual(formatChartTick(107.7), '107.7');
  assertEqual(formatChartTick(1500), '1.5k');
  assertEqual(formatWeight(80), '80');
});
