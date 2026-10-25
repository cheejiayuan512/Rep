# Follow one logged set

This is the path of a single bench-press set, from the button on the home screen to the chart. Open the files in this order.

## 1. Home screen

`src/features/workout/workout-home-screen.tsx`

**Start empty workout** calls `startEmptyWorkout()` in `src/data/repository.ts`. That writes a workout whose `finishedAt` is empty, which means it is still in progress. The app then opens the `ActiveWorkout` screen and passes the new workout's id.

## 2. Pick an exercise

`src/features/workout/exercise-picker-screen.tsx`

The list comes from `src/data/seed-exercises.ts`, plus any custom exercise you create. Choosing **Barbell Bench Press** and tapping **Done** adds that exercise onto the open workout, with one empty set.

## 3. The card

`src/components/exercise-block.tsx` is one exercise. `src/components/set-row.tsx` is one set inside it.

The notes box belongs to the exercise. Weight, reps, and RPE belong to the set. The text you type is a string. The saved value is a number, or empty.

## 4. Typing is not saved on every letter immediately

`src/features/workout/active-workout-screen.tsx`

While you type, the screen keeps the text in a draft (`src/domain/drafts.ts`). About 300 milliseconds after you pause, `updateSetNumbers` writes kilograms, reps, and RPE. Finishing the workout also flushes anything still waiting, so the last keystrokes are not lost.

The elapsed time and the rest countdown live in `src/components/elapsed-clock.tsx` and `src/components/rest-bar.tsx`. Each one ticks once a second on its own, so the set inputs do not redraw on that tick.

Weight is converted with `weightTextToKg` in `src/domain/units.ts`. If the display unit is lb, this divides by about 2.205 before saving. The screen converts it back when it draws.

## 5. Checking the set

Tapping the check mark calls `updateSetCompleted`. If the set has at least one rep, it counts. Warmup sets (tap the set number until it says `W`) do not count toward records or volume.

`src/domain/metrics.ts` decides whether to show a personal-record banner. A banner appears only when this set beats an older one. Your first-ever set is stored, and it shows up on Progress, but it is not announced as a record.

## 6. Finish

**Finish** sets `finishedAt` to the current time. History and Progress only read workouts that have that timestamp. The down chevron or a downward swipe leaves the workout in progress. Discard, under the cards, deletes it.

## 7. Looking back

- `src/features/history/history-screen.tsx` lists finished workouts by month.
- `src/features/history/workout-detail-screen.tsx` shows the notes and each set, including RPE.
- `src/features/progress/exercise-progress-screen.tsx` turns those sets into the four record cards and the chart.

The chart's estimated one-rep max uses the Epley formula in `estimateOneRepMax`: `weight * (1 + reps / 30)`. A single rep is just the weight.

## Where the file actually is

`src/data/database.ts` keeps the whole log as one JSON document in AsyncStorage, under the key `rep.database.v1`. On web that is the browser's localStorage. On a phone it is the app's private storage. Nothing is uploaded.
