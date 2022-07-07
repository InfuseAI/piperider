import {
  DbtAssertionResult,
  PipeRiderAssertionResult,
  SingleReportSchema,
  TableSchema,
} from '../sdlc/single-report-schema';

export interface ComparisonReportSchema {
  base: SingleReportSchema;
  input: SingleReportSchema;
}

export type ComparsionSource = 'base' | 'input';

export type AssertionValue = TableSchema['piperider_assertion_result'] &
  TableSchema['dbt_assertion_result'];
