Humans new to the project should start at `README.md` and `docs/tour.md`.

This is Rep, a local Expo workout log. One exercise is one card. Sets, reps, weight, and RPE live on that card. Notes live on the exercise.

Read `.cursor/skills/workout-log/SKILL.md` before changing workouts, sets, records, units, or storage.

Read `.cursor/skills/store-release/SKILL.md` before publishing. The Apple key for this computer is in the gitignored `local.md` beside that skill. Read `.cursor/skills/release-automation/SKILL.md` before automating uploads. Read `.cursor/skills/expo-mcp/SKILL.md` before using the Expo MCP server.

## Layout

- `index.ts` registers `App.tsx`. This app does not use Expo Router. Do not add `src/app/`.
- Screens live in `src/features/`. Shared UI lives in `src/components/`.
- Navigation is React Navigation in `src/navigation/`: tabs Workout, History, Progress, Profile, plus a native stack. Routines open from Home. The exercise library opens from Profile.
- Redux in `src/state/` holds boot, unit, rest, the active workout id, and a revision counter. Workout rows are loaded from storage, not kept in Redux.
- Domain math is `src/domain/`. The document store is `src/data/`.

## Commands

This project uses npm (`package-lock.json`). Install native-compatible packages with Expo:

```bash
npx expo install <package>
npx expo start
npx tsc --noEmit
```

Run `npx tsc --noEmit` before declaring a task done.

## Expo

Expo APIs change every SDK. Read the `expo` major version in `package.json`, then use `https://docs.expo.dev/versions/v<major>.0.0/`. For other Expo docs, start at `https://docs.expo.dev/llms.txt`.

`ios/` and `android/` are generated. Configure native behavior in `app.json` and config plugins.
