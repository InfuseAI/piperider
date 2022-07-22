import { z } from 'zod';
import {
  columnSchemaSchema,
  singleReportSchemaSchema,
  tableSchemaSchema,
} from './../sdlc/single-report-schema.z';
import { SingleReportSchema, TableSchema } from '../sdlc/single-report-schema';

export interface ComparisonReportSchema {
  base: SingleReportSchema;
  input: SingleReportSchema;
}

export type ComparsionSource = 'base' | 'input';

export type AssertionValue =
  | TableSchema['piperider_assertion_result']
  | TableSchema['dbt_assertion_result'];

export type ReportAssertionStatusCounts = {
  passed: string | number;
  failed: string | number;
};

export type CRAssertionTests = {
  level: string;
  column: string;
  from: ComparsionSource;
  name: string;
  status: 'passed' | 'failed';
  parameters?: {
    [k: string]: unknown;
  };
  tags?: string[];
  expected?: unknown;
  actual?: unknown;
};

export interface CRInputData<T> {
  base: T;
  input: T;
}

/**
 * This exists due to certain modifications needed on literal enum types (e.g. `type`); Also, for parts of the schema that are incorrect and need to be ignored
 */
const zWrapForComparison = (base, input) => z.object({ base, input });

export const ZColSchema = columnSchemaSchema
  .merge(
    z.object({
      type: z.enum([
        'string',
        'integer',
        'numeric',
        'datetime',
        'date',
        'time',
        'boolean',
        'other',
      ]),
    }),
  )
  .omit({
    stddev: true,
    p5: true,
    p25: true,
    p50: true,
    p75: true,
    p95: true,
    min: true,
    max: true,
    sum: true,
    avg: true,
  });
//OMISSION: schema is unstable

export const ZTableSchema = tableSchemaSchema.merge(
  z.object({ columns: z.record(ZColSchema) }),
);

export const ZComparisonTableSchema = zWrapForComparison(
  ZTableSchema,
  ZTableSchema,
);

export const ZSingleSchema = singleReportSchemaSchema.merge(
  z.object({ tables: z.record(ZTableSchema) }),
);

export const ZComparisonSchema = zWrapForComparison(
  ZSingleSchema,
  ZSingleSchema,
);
