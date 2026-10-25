# Storage

`src/data/database.ts` keeps one JSON document in AsyncStorage at `rep.database.v1`. Web and Expo Go both use that document. Do not switch this back to `expo-sqlite`; the web worker cannot resolve its wasm package.

Reads and writes are serialized on a promise queue. `writeDatabase` clones, mutates, then persists. Screens call `src/data/repository.ts`, not AsyncStorage.

## Document

- `exercises`: library, including the seeded slugs in `src/data/seed-exercises.ts`. `attachment` is a cable attachment or `null`. `machineSetup` is the last stack brand (or a typed name) for machine and cable exercises, or `null`
- `routines` and `routineExercises`. `routineExercises.machineSetup` is the planned stack, or `null`
- `routineSets`: planned sets on a routine exercise. `weightKg` and `reps` (each `null` when blank), `setType`, `position`. Older documents lack the array; `normalizeStored` adds it empty
- `workouts`: `finishedAt: null` means in progress
- `workoutExercises`: `notes` is a string, `''` when empty. `restSeconds` is a number or `null` for the exercise's default rest. `attachment` is a cable attachment or `null`. `machineSetup` is the stack used in that session, or `null` when unknown
- `sets`: `weightKg`, `reps`, `rpe` (`null` when blank), `setType` (`normal` or `warmup`), `completed`
- `settings`: `weightUnit`, `warmupRestMultiplier` (0.25, 0.5, 0.75, or 1; default 0.5), `bodyweightKg` (kilograms or `null`), `sex` (`male`, `female`, or `null`; picks the strength standards), `showRpe` (show the RPE column before any RPE is logged). Older documents also carry an unused `restSeconds`

Old documents may omit `notes`, `rpe`, `restSeconds`, `attachment`, `machineSetup`, `warmupRestMultiplier`, `bodyweightKg`, `sex`, or `showRpe`. `normalizeStored` fills those on load (seeded cable exercises get their seed attachment; missing setups become `null`; missing `showRpe` becomes true if any set has an RPE). Keep that path when adding a field.

`writeDatabase` commits in memory and saves after a short delay. `flushDatabase` (or `saveNow` in the repository) waits for queued writes and saves immediately.

## Adding a field

1. Add it to the stored interface and to `normalizeStored` with a safe default.
2. Add it to the domain type and to `mapSet` or `toWorkoutExercise`.
3. Include it in every `db.sets.push` / `db.workoutExercises.push`.
4. If the user can type it, add draft text in `src/domain/drafts.ts` and flush it from the active workout screen before finish, discard, and blur.
5. Show it on the exercise card and on the finished workout detail.
