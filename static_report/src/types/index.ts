import { z } from 'zod';
import {
  columnSchemaSchema,
  singleReportSchemaSchema,
  tableSchemaSchema,
} from './../sdlc/single-report-schema.z';
import {
  BusinessMetric,
  ColumnSchema,
  SingleReportSchema,
  TableSchema,
} from '../sdlc/single-report-schema';
import {
  DbtManifestSchema,
  Metric,
  SourceDefinition,
} from '../sdlc/dbt-manifest-schema';
import { CompColEntryItem } from '../lib';
import { RunResultOutput } from '../sdlc/dbt-run-results-schema';

export * from '../sdlc';

type TableNode = {
  name: string;
  unique_id?: string;
  resource_type: 'table';
};
export type DbtNode = (
  | DbtManifestSchema['nodes'][string]
  | SourceDefinition
  | TableNode
  | Metric
) & {
  __table?: SaferTableSchema;
  __queries?: BusinessMetric[];
  __columns?: CompColEntryItem[];
  __runResult?: RunResultOutput;
  [key: string]: any;
};

export interface SaferSRSchema extends Omit<SingleReportSchema, 'tables'> {
  tables: { [k: string]: SaferTableSchema | undefined };
}
export interface SaferTableSchema
  extends Omit<TableSchema, 'columns'>,
    Omit<DbtNode, 'columns'> {
  columns: { [k: string]: ColumnSchema | undefined };
}

export interface ComparisonReportSchema {
  base: SaferSRSchema;
  input: SaferSRSchema;
  implicit?: string[];
  explicit?: string[];
}

export type ComparsionSource = 'base' | 'target';

export type Comparable = {
  singleOnly?: boolean;
};

export type AssertionSource = 'piperider' | 'dbt';

export type ReportAssertionStatusCounts = {
  passed?: string | number;
  failed?: string | number;
  total?: string | number;
};
export interface ComparableData<T> {
  base?: T;
  target?: T;
  metadata?: {
    added?: number;
    deleted?: number;
    changed?: number;
  } & ComparableData<ReportAssertionStatusCounts>;
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
