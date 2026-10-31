/**
 * Loads every domain test, then runs them. `npm test` starts here.
 */
import '../data/database.test';
import './drafts.test';
import './exercise-families.test';
import './exercise-finder.test';
import './format.test';
import './fuzzy-search.test';
import './guide-art.test';
import './hevy-import.test';
import './log-export.test';
import './log-import.test';
import './log-pad.test';
import './machine-setup.test';
import './metrics.test';
import './movement-pose.test';
import './one-rep-max.test';
import './profile.test';
import './rest.test';
import './stats.test';
import './strength.test';
import './units.test';
import './workout-edits.test';
import './workout-name.test';
import { runAll } from './test-support';

runAll();
