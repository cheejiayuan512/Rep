---
name: verify
description: >-
  The fixed check order for Rep before a task is called done: typecheck, lint
  when one exists, unit tests, then browser tests for UI changes. Use after any
  code change, when asked to verify or check work, and before committing.
---

# Verify

Run the steps in this order. Stop at the first failure, report it, and fix it
before continuing. Do not jump ahead to tests to see whether the rest is fine.

## 1. Typecheck

```bash
npm run typecheck
```

That is `npx tsc --noEmit` for the app plus `tsc -p tsconfig.scripts.json` for
`scripts/`. `tsconfig.json` excludes `scripts/`, so plain `npx tsc --noEmit`
never checks the store and seed scripts.

## 2. Lint

```bash
npm run lint
```

Run this only when `lint` exists in `package.json` scripts, or when an
`eslint.config.*` or `.eslintrc*` file is present. Rep has no linter today. When
neither exists, skip the step and write `no linter configured` in the report.
Do not install or configure a linter as part of verification; that is its own
change.

## 3. Unit tests

```bash
npm test
```

That is `tsx src/domain/run-tests.ts`: every `*.test.ts` imported from that
file, then `runAll()`. It is not Jest, it has no watch mode, and it exits
non-zero on the first failed assertion. A new domain file needs an import in
`run-tests.ts` or its tests never run.

## 4. Browser tests (UI changes only)

```bash
npm run test:e2e
```

Playwright (`playwright.config.ts`) starts `npx expo start --web --port 8081`
itself and reuses a server already on that port. The first run on a machine
needs `npx playwright install chromium`. Run it when a change touches screens,
navigation, the logging pad, or a saved flow; skip it for domain-only changes
and say why it was skipped. Do not start Expo on 8081 in another terminal while
this runs.

## Report

Reply with one line per step and the exact failure when there is one:

```text
typecheck  pass
lint       skipped (no linter configured)
test       pass
test:e2e   skipped (domain-only change)
```

On failure include the command, the first error with `file:line`, and whether it
already failed before the change. Never call a task done while a step fails, and
do not "fix" a failure by deleting or loosening the test.
