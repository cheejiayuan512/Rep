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
- Remove exercise deletes that exercise and its sets with no dialog.

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

After a domain change, run `npx tsx src/domain/metrics.test.ts` and `npx tsc --noEmit`.
