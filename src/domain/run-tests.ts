/**
 * Loads every domain test, then runs them. `npm test` starts here.
 */
import './drafts.test';
import './format.test';
import './metrics.test';
import './units.test';
import './workout-edits.test';
import { runAll } from './test-support';

runAll();
