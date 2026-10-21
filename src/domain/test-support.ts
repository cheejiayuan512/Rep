/**
 * Tiny test helper so the domain checks can run with `npm test`.
 * A test is a name plus a function. If the function throws, that test failed.
 */
interface TestCase {
  name: string;
  run: () => void;
}

const cases: TestCase[] = [];

export function test(name: string, run: () => void): void {
  cases.push({ name, run });
}

export function assertEqual<T>(actual: T, expected: T): void {
  if (same(actual, expected)) {
    return;
  }

  throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
}

function same(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) {
    return true;
  }
  if (typeof actual !== 'object' || typeof expected !== 'object' || actual == null || expected == null) {
    return false;
  }

  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function assertClose(actual: number, expected: number, epsilon = 0.0001): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`expected ${expected} but got ${actual}`);
  }
}

export function assertTrue(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertThrows(run: () => void, messagePart: string): void {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(messagePart)) {
      throw new Error(`expected error containing ${JSON.stringify(messagePart)} but got ${JSON.stringify(message)}`);
    }
    return;
  }
  throw new Error(`expected an error containing ${JSON.stringify(messagePart)}`);
}

export function runAll(): void {
  const failures: string[] = [];
  for (const item of cases) {
    try {
      item.run();
      console.log(`ok  ${item.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.name}: ${message}`);
      console.error(`fail  ${item.name}`);
      console.error(`      ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${cases.length} tests failed`);
  }

  console.log(`${cases.length} tests passed`);
}
