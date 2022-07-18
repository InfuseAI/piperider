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

/**
 * This exists due to certain modifications needed on literal enum types (e.g. `type`); Also, for parts of the schema that are incorrect and need to be ignored
 */
const zWrapForComparison = (base, input) => z.object({ base, input });
export const ZColSchema = columnSchemaSchema.merge(
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
);

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
