---
name: workout-log
description: >-
  Domain rules for the Rep workout log: sets, reps, kilograms, RPE, notes,
  personal records, charts, and the AsyncStorage document. Use when editing
  workouts, routines, history, progress, exercises, units, or src/data.
---

# Workout log

Rep is local-only. There is no account, feed, or server.

## Card

One exercise is one card (`src/components/exercise-block.tsx`).

- Notes: multiline text on the exercise, max 500 characters. The box stays shut until the lifter opens it, or when notes already exist.
- Each set row: previous load, weight, reps, complete. RPE is a column only after the lifter turns **Show RPE** on in Profile, or after any set in the log has an RPE. Tap Previous to copy that load into the current weight and reps. Swipe the row left to delete it (`src/components/set-row.tsx` wraps `src/components/swipe-to-delete.tsx`, PanResponder plus Animated; the app has no gesture-handler root). Past half the row width deletes; a shorter swipe reveals the red Delete set button. Screen readers get a `delete` accessibility action. Previous lines up warmup with warmup and working set with working set.
- Tap the set number to toggle warmup.
- A blank workout shows Quick add chips (`src/components/quick-add.tsx`, `listQuickAddExercises`): exercises weighted by how recently and often they were trained, then `STARTER_EXERCISES`, up to 8, minus those already in the workout. Once a card exists, only **Add exercise** adds more.
- Add set copies the previous row's weight and reps, and leaves RPE empty.
- Remove exercise deletes that exercise and its sets with no dialog. Deleting a set or an exercise shows an Undo toast for 5 seconds instead.
- Drag the three dots on a card to reorder, same as a routine. Screen readers get Move up / Move down.
- The Rest chip sets `WorkoutExercise.restSeconds`. Null uses the exercise's default from `src/domain/rest.ts`: heavy compound 3:00, compound 2:00, isolation 1:30, calves/core 1:00, classed by seed id, then name keywords and equipment. A new workout copies the last rest picked for that exercise.
- Warmup sets rest `exercise rest × (m + (1 − m) × ratio²)`, where `m` is `settings.warmupRestMultiplier` (¼, ½, ¾, 1; default ½) and `ratio` is `warmupLoadRatio`: the warmup's kg over the heaviest working set on the card, or last session's when none is entered. Rounded to 5 s, at least 15 s. The multiplier is one app-wide setting, changed only from Profile.
- The workout opens as a full-screen modal. The down chevron or a downward swipe leaves it in progress. **Discard** sits under the cards and deletes the session.
- Finish replaces the workout screen with `WorkoutComplete` (`src/features/workout/workout-complete-screen.tsx`), built from `getWorkoutRecap`: stats, PRs, XP before and after, badges whose tier went up, and each exercise's session 1RM. **Done** is the primary action. **Undo finish** and **View workout** are quiet text. Undo finish reopens the session.
- -15 / +15 on the rest bar change only the running rest, never `restSeconds` or a default.
- Warmups stay above working sets, lightest first (blank last). Toggling W or changing a warmup's weight reorders the card and saves positions. Working sets keep their order and are numbered without warmups.
- Swap (header icon) opens the picker in `mode: 'swap'` and calls `swapWorkoutExercise`. Rest and attachment reset to the new exercise's; untouched sets are refilled from its last session, and checked-off sets stay. Remove is the close icon. The card shows equipment only, not the muscle group. The rest chip is the clock (`1:00`); the screen-reader name still says "Rest timer 1:00, default" when unset.
- Cable exercises carry an attachment (`cableAttachments` in `types.ts`). `Exercise.attachment` is the default for a new workout; `WorkoutExercise.attachment` is this session's. Changing it on a card updates both.
- Machine and cable cards carry a setup (`machineSetup`): Precor, Life Fitness, Hammer Strength, Generic, a typed brand, or Unknown brand (null). `Exercise.machineSetup` is the default for a new workout or routine; the card's value is this session's. Changing it updates both. Previous, PRs, and the exercise chart only compare the same setup. Free weights have no chip. Old sets stay Unknown brand until named. Previous reads `20 × 12 · Life Fitness`.
- The setup panel (`machineSetupOptions` in `src/domain/machine-setup.ts`) lists used stacks first with their last load. Tapping one calls `switchWorkoutExerciseSetup`: unchecked sets refill from that stack's last session (or one blank set); checked-off sets stay. Undo for 5 seconds restores the previous stack and numbers.
- When the rest timer starts, a local notification is scheduled for its end (`src/components/rest-notification.ts`). Skip, finish, and discard cancel it.
- While a workout is open, it is shown outside the app the whole time, not only during rest (`src/components/workout-live-activity.ts`): next set, rest countdown or elapsed time, and Done. `src/features/workout/workout-activity-sync.ts` builds the props, keeps the running rest (so the rest bar survives leaving the screen), and handles Done when the workout screen is closed by checking off the next set (`findNextSet`), starting its rest, and saving now. With the screen open, the screen handles Done.
- On iOS that is a Live Activity (`src/components/workout-activity.tsx`, native name still `RestActivity`). The layout function runs in the widget extension: only `@expo/ui/swift-ui` views, no hooks, nothing from outside the function. The rest end is the stale date, so the layout falls back to elapsed time without the app. Done is a `Button` with `target="complete-set"` (iOS 17+), heard through `addUserInteractionListener`.
- On Android it is an ongoing notification from the local module `modules/rest-live-update` (Kotlin) with a "Done set" action through `WorkoutActionReceiver`. Android 16 promotes it to a Live Update chip; older versions show a pinned notification. It switches from countdown to elapsed time by itself when rest ends. It is silent; the expo-notifications alert still makes the sound.
- A completed set that beats every earlier set (history plus earlier sets in this workout) gets a star on that set only. The toast lists every record kind the set beat.
- The exercise picker folds variants of one movement into a row (`src/domain/exercise-families.ts`). Search expands every family.
- Exercise search is `fuzzyFilter` (`src/domain/fuzzy-search.ts`): aliases (db, bb, ohp, rdl…), prefix, substring, subsequence, and small edit distance, with muscle and equipment words at lower weight. The picker, exercise library, and Progress search all use it.
- An exercise appears in a workout or routine at most once. In the picker, tapping an added exercise removes it again, unless it already has a completed set (then it stays and the card's Remove is the way out).
- History detail has Edit and Duplicate. Edit opens the finished workout in the same workout screen with Done instead of Finish/Discard, no rest timer, and no PR toast; stars compare only against earlier workouts. Duplicate starts a new workout with the same exercises, notes, rest, and set weight/reps, nothing checked off, RPE empty.
- The picker only adds and removes. Renaming, recategorizing, and deleting exercises happen in the exercise library on Profile. Only unused custom exercises can be deleted; built-ins never.
- History detail numbers working sets 1..n and marks warmups `W`, so warmups do not shift the count.

## Routines

- The routine editor (`src/features/routines/routine-editor-screen.tsx`) looks like a workout: one card per exercise (`routine-exercise-card.tsx`) with planned sets. Each set has weight and reps (both optional) and can be a warmup. No RPE, notes, or check-off.
- Drag the three dots on a card to reorder (`src/components/sortable-list.tsx`, cards of any height). Screen readers get Move up / Move down actions on the handle.
- Swipe a card left to remove the exercise; swipe a set left to delete the set. Both delete right away and show Undo for 5 seconds.
- Adding an exercise to a routine copies its last session's sets as the plan, or one blank set.
- Starting a routine copies its planned sets into the workout, unchecked, RPE empty. An exercise with no planned sets (routines from before sets existed) falls back to its last session.

## Storage speed

- `readDatabase` returns the shared committed document. Treat it as read-only; mutate only inside `writeDatabase`.
- `writeDatabase` commits in memory right away and persists to AsyncStorage after a 400 ms debounce. `flushDatabase` runs when the app leaves the foreground.
- The repository caches lookup maps per committed document (`indexOf`). Navigate before dispatching `dataChanged` so the next screen does not wait on a reload.
- Read functions are built with `reader()`, so each also has `.now(...)` that reads the loaded document synchronously (`peekDatabase`). Screens start from `.now` (or `useStored(reader, ...args)` in `src/state/hooks.ts`) so the first frame has data instead of an empty state. Only show "missing" states after a real load.

## Profile and settings

- kg / lb, warmup rest, Show RPE, bodyweight, age, and sex are set only in Profile → Settings. Other screens read the unit; they do not toggle it. Show RPE disappears after any set has an RPE, because the column stays on.
- 20 levels (`LEVEL_FLOORS` in `src/domain/profile.ts`) with titles. Show "Level N of 20", the title, XP in this level, and XP to the next. `XP_RULES` lists how XP is earned and is shown under "How XP works".
- 20 badges with three tiers each. `BADGE_INFO` holds the title, unit, and description shown when a badge is tapped. Kg badges are formatted in the user's unit; `strong` steps are strength level indexes.
- Strength levels (`src/domain/strength.ts`, `StrengthLevelsScreen`) need `settings.bodyweightKg` and `settings.sex`. `settings.ageYears` (14–80) scales the table: peak 24–39, younger and older expected 1RMs are lower. Missing age leaves the table as-is. They use the best Epley e1RM from working sets of 10 reps or fewer, bodyweight-multiple standards scaled by bodyweight^⅔, and map Beginner…Elite to the 5th/20th/50th/80th/95th percentile of lifters. Say "lifters", not "everyone": most untrained people sit below Beginner.

## Numbers

- Canonical weight is kilograms on `SetRecord.weightKg`.
- Typed weights keep two decimals (`parseDecimal`) so 8.75 or 1.25 kg plates survive saving and Add set. `formatWeight` shows up to two decimals for logged loads; `formatEstimate` shows one for calculated values like e1RM. Chart ticks and averages use `formatDecimal(value, 1)`.
- RPE is `number | null` on the set. Parse with `parseRpe` (0–10, one decimal). Blank clears it.
- Bodyweight is `0` kg. It counts reps and does not produce an estimated 1RM.
- Estimated 1RM is Epley: `weight * (1 + reps / 30)`. One rep equals the weight.
- Record priority when completing a set: 1RM, heaviest weight, volume, reps, then easier RPE. An RPE PR needs a prior working set at the same weight and the same or more reps, and this RPE at least 0.5 lower. The first RPE is stored, not announced.
- Epsilon is 0.05 kg for weight and 1RM, and 0.5 kg for volume.
- History, volume, and charts use finished workouts only. In-progress workouts are excluded.

## Where to change things

| Change | Start here |
| --- | --- |
| New set or exercise field | [storage.md](storage.md), then drafts and the set row |
| Record or chart math | `src/domain/metrics.ts` and `src/domain/metrics.test.ts` |
| Active logging UI | `src/features/workout/active-workout-screen.tsx` |
| Finished session UI | `src/features/history/workout-detail-screen.tsx` |
| Workout CSV import | `src/domain/log-import.ts` (detect Hevy / Strong / Jefit / FitNotes), Hevy columns in `hevy-import.ts`, then `importWorkoutCsv` in the repository |
| Profile level, badges, weekly chart | `src/domain/profile.ts` and `src/features/profile/profile-screen.tsx`; badge art in `src/components/badge-icons.tsx` |
| Home week stats, Analysis screen | `src/domain/stats.ts`, then `src/features/progress/analysis-screen.tsx` |
| 1RM calculator formulas | `src/domain/one-rep-max.ts` (Epley, Brzycki, Lombardi; up to 20 reps). `estimateFromSets` is the whole-session blend |
| Rest defaults and warmup rest | `src/domain/rest.ts` and `src/domain/rest.test.ts` |
| What shipped in each build | `CHANGELOG.md`: add a section with every release |
| Exercise library editing | `updateExercise` in the repository and `src/features/exercises/` (opened from Profile) |
| Keyboard hide chip | `src/components/keyboard-done-bar.tsx`, mounted once in `App.tsx`. iOS is `InputAccessoryView` (a root overlay sits behind the workout modal). Android sits above the resized window. |

After a domain change, run `npm test` and `npx tsc --noEmit`.
