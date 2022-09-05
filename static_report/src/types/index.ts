import { z } from 'zod';
import {
  columnSchemaSchema,
  singleReportSchemaSchema,
  tableSchemaSchema,
} from './../sdlc/single-report-schema.z';
import {
  ColumnSchema,
  SingleReportSchema,
  TableSchema,
} from '../sdlc/single-report-schema';

export interface SaferSRSchema extends Omit<SingleReportSchema, 'tables'> {
  tables: { [k: string]: SaferTableSchema | undefined };
}
export interface SaferTableSchema extends Omit<TableSchema, 'columns'> {
  columns: { [k: string]: ColumnSchema | undefined };
}

export interface ComparisonReportSchema {
  base: SaferSRSchema;
  input: SaferSRSchema;
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
  base?: T;
  target?: T;
}

/**
 * console.warn only when error exists, for z.safeParse()
 * @param result Zod ReturnType
 */
export const zReport = (result) => {
  result.error && console.warn(result.error);
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

export const ZColSchema = columnSchemaSchema.optional();

export const ZTableSchema = tableSchemaSchema
  .merge(z.object({ columns: z.record(ZColSchema.optional()) }))
  .optional();

//TODO: temp bypass flag until `input` -> `target` on schema.json
export const ZComparisonTableSchema = (flag?: boolean) =>
  zWrapForComparison(ZTableSchema, ZTableSchema, flag);

export const ZSingleSchema = singleReportSchemaSchema.merge(
  z.object({ tables: z.record(ZTableSchema.optional()) }),
);

//TODO: temp bypass flag until `input` -> `target` on schema.json
export const ZComparisonSchema = (flag?: boolean) =>
  zWrapForComparison(ZSingleSchema, ZSingleSchema, flag);
