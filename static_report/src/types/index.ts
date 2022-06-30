// TODO: refined types

export interface Assertion {
  name: string;
  status: 'passed' | 'failed';
  parameters: Record<string, unknown>;
  expected: Record<string, unknown>;
  actual: number;
  tags: unknown[];
}

export interface AssertionResult {
  tests: Assertion[];
  columns: Record<string, Assertion[]>;
}
