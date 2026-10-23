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

- Notes: multiline text on the exercise, max 500 characters.
- Each set row: previous load, weight, reps, RPE, complete, delete.
- Tap the set number to toggle warmup.
- Add set copies the previous row's weight and reps, and leaves RPE empty.
- Remove exercise deletes that exercise and its sets with no dialog. Deleting a set or an exercise shows an Undo toast for 5 seconds instead.
- Hold an exercise name to reorder. The workout becomes a drag list, then Done saves the order.
- The Rest chip sets `WorkoutExercise.restSeconds`. Null uses the exercise's default from `src/domain/rest.ts`: heavy compound 3:00, compound 2:00, isolation 1:30, calves/core 1:00, classed by seed id, then name keywords and equipment. A new workout copies the last rest picked for that exercise.
- Warmup sets rest `exercise rest × settings.warmupRestMultiplier` (¼, ½, ¾, 1; default ½), rounded to 5 s. The multiplier is one app-wide setting, changed from any card's rest picker.
- -15 / +15 on the rest bar change only the running rest, never `restSeconds` or a default.
- Warmups stay above working sets: toggling W reorders the card and saves positions. Working sets are numbered without warmups.
- Swap (card header) opens the picker in `mode: 'swap'` and calls `swapWorkoutExercise`. Rest and attachment reset to the new exercise's; untouched sets are refilled from its last session, and checked-off sets stay.
- Cable exercises carry an attachment (`cableAttachments` in `types.ts`). `Exercise.attachment` is the default for a new workout; `WorkoutExercise.attachment` is this session's. Changing it on a card updates both.
- When the rest timer starts, a local notification is scheduled for its end (`src/components/rest-notification.ts`). Skip, finish, and discard cancel it.
- While a workout is open, it is shown outside the app the whole time, not only during rest (`src/components/workout-live-activity.ts`): next set, rest countdown or elapsed time, and Done. `src/features/workout/workout-activity-sync.ts` builds the props, keeps the running rest (so the rest bar survives leaving the screen), and handles Done when the workout screen is closed by checking off the next set (`findNextSet`), starting its rest, and saving now. With the screen open, the screen handles Done.
- On iOS that is a Live Activity (`src/components/workout-activity.tsx`, native name still `RestActivity`). The layout function runs in the widget extension: only `@expo/ui/swift-ui` views, no hooks, nothing from outside the function. The rest end is the stale date, so the layout falls back to elapsed time without the app. Done is a `Button` with `target="complete-set"` (iOS 17+), heard through `addUserInteractionListener`.
- On Android it is an ongoing notification from the local module `modules/rest-live-update` (Kotlin) with a "Done set" action through `WorkoutActionReceiver`. Android 16 promotes it to a Live Update chip; older versions show a pinned notification. It switches from countdown to elapsed time by itself when rest ends. It is silent; the expo-notifications alert still makes the sound.
- A completed set that beats every earlier set (history plus earlier sets in this workout) gets a star, and so does its card title. The toast lists every record kind the set beat.
- The exercise picker folds variants of one movement into a row (`src/domain/exercise-families.ts`). Search expands every family.
- An exercise appears in a workout or routine at most once. In the picker, tapping an added exercise removes it again, unless it already has a completed set (then it stays and the card's Remove is the way out).
- History detail has Edit and Duplicate. Edit opens the finished workout in the same workout screen with Done instead of Finish/Discard, no rest timer, and no PR toast; stars compare only against earlier workouts. Duplicate starts a new workout with the same exercises, notes, rest, and set weight/reps, nothing checked off, RPE empty.
- The picker only adds and removes. Renaming, recategorizing, and deleting exercises happen in the Exercises tab. Only unused custom exercises can be deleted; built-ins never.
- History detail numbers working sets 1..n and marks warmups `W`, so warmups do not shift the count.

## Storage speed

- `readDatabase` returns the shared committed document. Treat it as read-only; mutate only inside `writeDatabase`.
- `writeDatabase` commits in memory right away and persists to AsyncStorage after a 400 ms debounce. `flushDatabase` runs when the app leaves the foreground.
- The repository caches lookup maps per committed document (`indexOf`). Navigate before dispatching `dataChanged` so the next screen does not wait on a reload.

## Numbers

- Canonical weight is kilograms on `SetRecord.weightKg`.
- RPE is `number | null` on the set. Parse with `parseRpe` (0–10, one decimal). Blank clears it.
- Bodyweight is `0` kg. It counts reps and does not produce an estimated 1RM.
- Estimated 1RM is Epley: `weight * (1 + reps / 30)`. One rep equals the weight.
- Record priority when completing a set: 1RM, heaviest weight, volume, then reps.
- Epsilon is 0.05 kg for weight and 1RM, and 0.5 kg for volume.
- History, volume, and charts use finished workouts only. In-progress workouts are excluded.

## Where to change things

| Change | Start here |
| --- | --- |
| New set or exercise field | [storage.md](storage.md), then drafts and the set row |
| Record or chart math | `src/domain/metrics.ts` and `src/domain/metrics.test.ts` |
| Active logging UI | `src/features/workout/active-workout-screen.tsx` |
| Finished session UI | `src/features/history/workout-detail-screen.tsx` |
| Hevy CSV import | `src/domain/hevy-import.ts`, then `importHevyCsv` in the repository |
| Profile level, badges, weekly chart | `src/domain/profile.ts` and `src/features/profile/profile-screen.tsx`; badge art in `src/components/badge-icons.tsx` |
| Home week stats, Analysis screen | `src/domain/stats.ts`, then `src/features/progress/analysis-screen.tsx` |
| 1RM calculator formulas | `src/domain/one-rep-max.ts` (Epley, Brzycki, Lombardi; up to 20 reps). `estimateFromSets` is the whole-session blend |
| Rest defaults and warmup rest | `src/domain/rest.ts` and `src/domain/rest.test.ts` |
| What shipped in each build | `CHANGELOG.md`: add a section with every release |
| Exercise library editing | `updateExercise` in the repository and `src/features/exercises/` |

After a domain change, run `npm test` and `npx tsc --noEmit`.
