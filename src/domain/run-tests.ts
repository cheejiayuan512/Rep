/**
 * Loads every domain test, then runs them. `npm test` starts here.
 */
import './drafts.test';
import './exercise-families.test';
import './exercise-finder.test';
import './format.test';
import './fuzzy-search.test';
import './hevy-import.test';
import './metrics.test';
import './one-rep-max.test';
import './profile.test';
import './rest.test';
import './stats.test';
import './strength.test';
import './units.test';
import './workout-edits.test';
import { runAll } from './test-support';

runAll();
