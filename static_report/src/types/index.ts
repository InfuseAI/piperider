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

/**
 * This exists due to certain modifications needed on literal enum types (e.g. `type`); Also, for parts of the schema that are incorrect and need to be ignored
 */
const zWrapForComparison = (base, input) => z.object({ base, input });

//FIXME: omit type of tests.<i>.(expected | actual)
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
    //FIXME: remove later once schema is stable
    stddev: true,
    p5: true,
    p25: true,
    p50: true,
    p75: true,
    p95: true,
  });

export const ZTableSchema = tableSchemaSchema
  .merge(z.object({ columns: z.record(ZColSchema) }))
  .omit({ columns: true });

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
