# Storage

`src/data/database.ts` keeps one JSON document in AsyncStorage at `rep.database.v1`. Web and Expo Go both use that document. Do not switch this back to `expo-sqlite`; the web worker cannot resolve its wasm package.

Reads and writes are serialized on a promise queue. `writeDatabase` clones, mutates, then persists. Screens call `src/data/repository.ts`, not AsyncStorage.

## Document

- `exercises`: library, including the seeded slugs in `src/data/seed-exercises.ts`. `attachment` is a cable attachment or `null`. `machineSetup` is the last stack brand (or a typed name) for machine and cable exercises, or `null`
- `routines` and `routineExercises`. `routineExercises.machineSetup` is the planned stack, or `null`
- `routineSets`: planned sets on a routine exercise. `weightKg` and `reps` (each `null` when blank), `setType`, `position`. Older documents lack the array; `normalizeStored` adds it empty
- `workouts`: `finishedAt: null` means in progress
- `workoutExercises`: `notes` is a string, `''` when empty. `restSeconds` is a number or `null` for the exercise's default rest. `attachment` is a cable attachment or `null`. `machineSetup` is the stack used in that session, or `null` when unknown. `supersetId` groups exercises, or `null`
- `routineExercises.supersetId` is the same kind of group on a routine, or `null`
- `sets`: `weightKg`, `reps`, `rpe` (`null` when blank), `durationSeconds` and `distanceKm` (`null` on a lifting set; seconds and kilometers on a cardio set), `setType` (`normal`, `warmup`, `drop`, or `failure`), `completed`
- `settings`: `weightUnit`, `warmupRestMultiplier` (0.25, 0.5, 0.75, or 1; default 0.5), `bodyweightKg` (kilograms or `null`), `ageYears` (14–80 or `null`; scales strength levels), `sex` (`male`, `female`, or `null`; picks the strength standards), `showRpe` (show the RPE column before any RPE is logged), and `settingsUpdatedAt` (one clock per setting). Older documents also carry an unused `restSeconds`
- `schemaVersion` is the shape of the file. The storage key stays `rep.database.v1`. `deviceId` is created once per install
- `updatedAt` on every exercise, routine, routine exercise, routine set, workout, workout exercise, and set. `writeDatabase` sets it when that row's other fields change. `0` means the row was already stored before change tracking. A workout with no clock of its own keeps `startedAt`; a routine keeps `createdAt`
- `deletions` remembers an id after the row is removed, so a later sync does not put it back. Putting the same id back (undo) drops that record

Old documents may omit `notes`, `rpe`, `restSeconds`, `attachment`, `machineSetup`, `warmupRestMultiplier`, `bodyweightKg`, `ageYears`, `sex`, `showRpe`, `routineSets`, `updatedAt`, `deletions`, or `settingsUpdatedAt`. `normalizeStored` fills those on load (seeded cable exercises get their seed attachment; missing setups become `null`; missing `showRpe` becomes true if any set has an RPE). Keep that path when adding a field. Copy the document with a spread so a key this version does not know survives the next save.

A file that is not a log throws `CorruptLogError` and is left on disk. Do not replace it with an empty document.

`writeDatabase` commits in memory and saves after a short delay. `flushDatabase` (or `saveNow` in the repository) waits for queued writes and saves immediately.

## Adding a field

1. Add it to the stored interface and to `normalizeStored` with a safe default.
2. Add it to the domain type and to `mapSet` or `toWorkoutExercise`.
3. Include it in every `db.sets.push` / `db.workoutExercises.push`.
4. If the user can type it, add draft text in `src/domain/drafts.ts` and flush it from the active workout screen before finish, discard, and blur.
5. Show it on the exercise card and on the finished workout detail.
