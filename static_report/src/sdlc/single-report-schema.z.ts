// Generated by ts-to-zod
import { z } from 'zod';

export const distributionSchema = z.object({
  type: z.string(),
  labels: z.array(z.string().nullable()),
  counts: z.array(z.number()),
  bin_edges: z.array(z.union([z.number(), z.string()])).optional(),
});

export const assertionTestSchema = z.object({
  name: z.string(),
  status: z.union([z.literal('passed'), z.literal('failed')]),
  parameters: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
});

export const dbtAssertionResultSchema = z.object({
  tests: z.array(assertionTestSchema),
  columns: z.record(z.array(assertionTestSchema)),
});

export const dataSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export const columnSchemaSchema = z.object({
  total: z.number(),
  nulls: z.number(),
  non_nulls: z.number(),
  distinct: z.number(),
  distribution: distributionSchema.optional(),
  name: z.string(),
  description: z.string(),
  type: z.union([
    z.literal('string'),
    z.literal('integer'),
    z.literal('numeric'),
    z.literal('datetime'),
    z.literal('date'),
    z.literal('time'),
    z.literal('boolean'),
    z.literal('other'),
  ]),
  schema_type: z.string(),
  valid: z.number().optional(),
  mismatched: z.number().optional(),
  profile_duration: z.string().optional(),
  elapsed_milli: z.number().optional(),
  sum: z.number().optional(),
  avg: z.number().optional(),
  min: z.union([z.string(), z.number()]).optional(),
  max: z.union([z.string(), z.number()]).optional(),
  p5: z.number().optional(),
  p25: z.number().optional(),
  p50: z.number().optional(),
  p75: z.number().optional(),
  p95: z.number().optional(),
  stddev: z.number().optional(),
});

export const pipeRiderAssertionResultSchema = z.object({
  tests: z.array(assertionTestSchema),
  columns: z.record(z.array(assertionTestSchema)),
});

export const tableSchemaSchema = z.object({
  name: z.string(),
  description: z.string(),
  row_count: z.number(),
  col_count: z.number(),
  columns: z.record(columnSchemaSchema),
  piperider_assertion_result: pipeRiderAssertionResultSchema.nullable(),
  dbt_assertion_result: dbtAssertionResultSchema.optional().nullable(),
});

export const singleReportSchemaSchema = z.object({
  tables: z.record(tableSchemaSchema),
  id: z.string(),
  created_at: z.string(),
  datasource: dataSourceSchema,
});
