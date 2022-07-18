import { z } from 'zod';
import {
  columnSchemaSchema,
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
 * This exists due to certain modifications needed on literal enum types (e.g. `type`)
 */
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
