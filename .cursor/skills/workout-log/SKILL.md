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
- The Rest chip sets `WorkoutExercise.restSeconds` (null uses the default). A new workout copies the last rest picked for that exercise.
- When the rest timer starts, a local notification is scheduled for its end (`src/components/rest-notification.ts`). Skip, finish, and discard cancel it.
- On iOS the same timer is a Live Activity on the Lock Screen and in the Dynamic Island (`src/components/rest-activity.tsx`, started through `rest-live-activity.ts`). The layout function runs in the widget extension: only `@expo/ui/swift-ui` views, no hooks, nothing from outside the function.
- A completed set that beats every earlier set (history plus earlier sets in this workout) gets a star, and so does its card title. The toast lists every record kind the set beat.
- The exercise picker folds variants of one movement into a row (`src/domain/exercise-families.ts`). Search expands every family.

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
| Profile level, badges, weekly chart | `src/domain/profile.ts` and `src/features/profile/profile-screen.tsx` |

After a domain change, run `npm test` and `npx tsc --noEmit`.
