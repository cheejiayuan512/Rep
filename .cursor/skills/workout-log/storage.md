# Storage

`src/data/database.ts` keeps one JSON document in AsyncStorage at `rep.database.v1`. Web and Expo Go both use that document. Do not switch this back to `expo-sqlite`; the web worker cannot resolve its wasm package.

Reads and writes are serialized on a promise queue. `writeDatabase` clones, mutates, then persists. Screens call `src/data/repository.ts`, not AsyncStorage.

## Document

- `exercises`: library, including the seeded slugs in `src/data/seed-exercises.ts`
- `routines` and `routineExercises`
- `workouts`: `finishedAt: null` means in progress
- `workoutExercises`: `notes` is a string, `''` when empty. `restSeconds` is a number or `null` for the default rest
- `sets`: `weightKg`, `reps`, `rpe` (`null` when blank), `setType` (`normal` or `warmup`), `completed`
- `settings`: `weightUnit`, `restSeconds` (default 90)

Old documents may omit `notes`, `rpe`, or `restSeconds`. `normalizeStored` fills those on load. Keep that path when adding a field.

## Adding a field

1. Add it to the stored interface and to `normalizeStored` with a safe default.
2. Add it to the domain type and to `mapSet` or `toWorkoutExercise`.
3. Include it in every `db.sets.push` / `db.workoutExercises.push`.
4. If the user can type it, add draft text in `src/domain/drafts.ts` and flush it from the active workout screen before finish, discard, and blur.
5. Show it on the exercise card and on the finished workout detail.
