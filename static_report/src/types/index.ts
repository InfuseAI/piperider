import { z } from 'zod';
import {
  columnSchemaSchema,
  singleReportSchemaSchema,
  tableSchemaSchema,
} from './../sdlc/single-report-schema.z';
import { SingleReportSchema, TableSchema } from '../sdlc/single-report-schema';

export interface ComparisonReportSchema {
  base: SingleReportSchema;
  input: SingleReportSchema; //old code: future key will be `target`
}

export type ComparsionSource = 'base' | 'target';

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

export interface CRTargetData<T> {
  base: T;
  target: T;
}

/**
 * console.error only when error exists, for z.safeParse()
 * @param result Zod ReturnType
 */
export const zReport = (result) => {
  result.error && console.error(result.error);
};

/**
 * This exists due to certain modifications needed on literal enum types (e.g. `type`); Also, for parts of the schema that are incorrect and need to be ignored
 * @param base the baseline value
 * @param target the `target` -- this value compared against your base
 * @param flag a flag that allows for escaping the newer `target`, and looking up with `input
 * @returns Zod validation object with {base, target}
 */
const zWrapForComparison = (base, target, flag?: boolean) =>
  z.object({ base, [flag ? 'input' : 'target']: target });

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

//TODO: temp bypass flag until `input` -> `target` on schema.json
export const ZComparisonTableSchema = (flag?: boolean) =>
  zWrapForComparison(ZTableSchema, ZTableSchema, flag);

export const ZSingleSchema = singleReportSchemaSchema.merge(
  z.object({ tables: z.record(ZTableSchema) }),
);

//TODO: temp bypass flag until `input` -> `target` on schema.json
export const ZComparisonSchema = (flag?: boolean) =>
  zWrapForComparison(ZSingleSchema, ZSingleSchema, flag);
