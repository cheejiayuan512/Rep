---
name: verify
description: >-
  The fixed check order for Rep before a task is called done: typecheck, lint,
  format check, unit tests, then browser tests for UI changes. Use after any
  code change, when asked to verify or check work, and before committing.
---

# Verify

Run the steps in this order. Stop at the first failure, report it, and fix it
before continuing. Do not jump ahead to tests to see whether the rest is fine.

## 1. Typecheck

```bash
npm run typecheck
```

That is `npx tsc --noEmit`. `tsconfig.json` excludes `scripts/`, so when
`tsconfig.scripts.json` is present, check that project as well:

```bash
npx tsc -p tsconfig.scripts.json
```

## 2. Lint

```bash
npm run lint
```

That is `expo lint` with `eslint.config.js` (`eslint-config-expo`). Warnings do
not fail the command and are not a reason to stop; errors are. The React
Compiler rules (`react-hooks/purity`, `refs`, `immutability`,
`set-state-in-effect`) are off because `app.json` does not enable the compiler.
Do not turn them back on to "clean up" a change.

## 3. Format

```bash
npm run format:check
```

Prettier with `.prettierrc`. Every file it lists is a failure; run
`npm run format` and rebuild, and never hand-format around it.

## 4. Unit tests

```bash
npm test
```

That is `tsx src/domain/run-tests.ts`: every `*.test.ts` imported from that
file, then `runAll()`. It is not Jest, it has no watch mode, and it exits
non-zero on the first failed assertion. A new domain file needs an import in
`run-tests.ts` or its tests never run.

## 5. Browser tests (UI changes only)

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
lint       pass (3 warnings)
format     pass
test       pass
test:e2e   skipped (domain-only change)
```

On failure include the command, the first error with `file:line`, and whether it
already failed before the change. Never call a task done while a step fails, and
do not "fix" a failure by deleting or loosening the test.
