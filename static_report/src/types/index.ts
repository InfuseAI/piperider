import { SingleReportSchema } from '../sdlc/single-report-schema';

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

export interface ComparisonReportSchema {
  base: SingleReportSchema;
  input: SingleReportSchema;
}

export type ComparsionSource = 'base' | 'input';
