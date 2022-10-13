import {
  AssertionSource,
  AssertionTest,
  ColumnSchema,
  ComparableData,
  ComparisonReportSchema,
  SaferSRSchema,
  SaferTableSchema,
} from '../types/index';
import create from 'zustand';
// import { devtools, persist } from 'zustand/middleware';
import { transformAsNestedBaseTargetRecord } from './transformers';
import { formatReportTime } from './formatters';
type ComparableReport = Partial<ComparisonReportSchema>; //to support single-run data structure
type ComparableMetadata = {
  added?: number;
  deleted?: number;
  changed?: number;
  mismatched?: boolean;
};
type EntryItem<T> = [string, T, ComparableMetadata];
export type CompColEntryItem = EntryItem<ComparableData<Partial<ColumnSchema>>>;
export type CompTableWithColEntryOverwrite = Omit<
  Partial<SaferTableSchema>,
  'columns'
> & {
  columns: CompColEntryItem[];
};
export type CompTableColEntryItem = EntryItem<
  ComparableData<CompTableWithColEntryOverwrite>
>;
export interface ReportState {
  rawData: ComparableReport;
  reportTime?: string;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tableColumnsOnly?: CompTableColEntryItem[];
  tableColumnAssertionsOnly?: ComparableData<
    EnrichedTableOrColumnAssertionTest[]
  >;
}

interface ReportSetters {
  setReportRawData: (input: ComparableReport) => void;
}

const getReportOnly = (rawData: ComparableReport) => {
  let resultObj = {} as ComparableData<Omit<SaferSRSchema, 'tables'>>;
  if (rawData.base) {
    const { tables, ...reportOnly } = rawData.base;
    resultObj = { base: reportOnly };
  }
  if (rawData.input) {
    const { tables, ...reportOnly } = rawData.input;
    resultObj = {
      ...resultObj,
      target: reportOnly,
    };
  }
  return resultObj;
};
const getReportTime = (rawData: ComparableReport) => {
  const baseTime = formatReportTime(rawData.base?.created_at);
  const targetTime = formatReportTime(rawData.input?.created_at);
  const result = targetTime ? `${baseTime} -> ${targetTime}` : baseTime;
  return result;
};

/**
 * returns an aligned, compared (base/target), and normalized entries for profiler's tables and columns, making it easier to iterate and render over them. Each entry is equipped with a 3-element entry item that contains [key, {base, target}, metadata].
 * Currently Assertions is not added to metadata yet.
 */
const getTableColumnsOnly = (rawData: ComparableReport) => {
  let isComparison = Boolean(rawData.base && rawData.input);
  const { __meta__: tablesMetadata, ...comparableTables } =
    transformAsNestedBaseTargetRecord<
      SaferSRSchema['tables'],
      SaferTableSchema
    >(rawData?.base?.tables, rawData?.input?.tables, { metadata: true });

  const tableColumnsResult = Object.entries(comparableTables).map(
    ([tableName, { base = {}, target = {} }]) => {
      const { __meta__: columnsMetadata, ...comparableColumns } =
        transformAsNestedBaseTargetRecord<
          SaferTableSchema['columns'],
          ColumnSchema
        >(base?.columns, target?.columns, { metadata: true });
      const compColEntries = Object.entries(comparableColumns).map(
        ([colName, { base, target }]) => {
          return [
            colName,
            { base, target },
            {
              mismatched: isComparison
                ? base?.name !== target?.name ||
                  base?.schema_type !== target?.schema_type
                : false,
            },
          ] as CompColEntryItem;
        },
      );

      // table's columns are mirror
      const entry = [
        tableName,
        {
          base: { ...base, columns: compColEntries },
          target: { ...target, columns: compColEntries },
        },
        columnsMetadata,
      ];
      return entry as CompTableColEntryItem;
    },
  );

  return tableColumnsResult;
};

/**
 * Returns a compared and flatteded table/column list of assertions, enriched with each member's belonging table names and column names
 */
type EnrichedAssertionTest = AssertionTest & {
  kind: AssertionSource;
  message?: string; //for dbt
};
export type EnrichedTableOrColumnAssertionTest = EnrichedAssertionTest & {
  isTableAssertion: boolean;
  tableName?: string;
  columnName?: string;
};
const _getKindMapper = (kind: AssertionSource) => (v) => ({ ...v, kind });
const _getFlattenedTestEntries = (table?: SaferTableSchema) => {
  //Flatten table assertions
  const enrichedPipeAssertionTests: EnrichedAssertionTest[] = (
    table?.piperider_assertion_result?.tests || []
  ).map(_getKindMapper('piperider'));

  const enrichedDbtAssertionTests: EnrichedAssertionTest[] = (
    table?.dbt_assertion_result?.tests || []
  ).map(_getKindMapper('dbt'));

  const flatTableAssertionTests: EnrichedTableOrColumnAssertionTest[] =
    enrichedPipeAssertionTests
      .concat(enrichedDbtAssertionTests)
      .map((v) => ({ isTableAssertion: true, tableName: table?.name, ...v }));

  //Flatten and join w/ column assertions
  const flatColumnPipeAssertions = Object.entries(
    table?.piperider_assertion_result?.columns || {},
  )
    .map(
      ([colKey, tests]) =>
        [colKey, tests.map(_getKindMapper('piperider'))] as [
          string,
          EnrichedAssertionTest[],
        ],
    )
    .reduce<EnrichedTableOrColumnAssertionTest[]>((accum, [colKey, tests]) => {
      const result = tests.map((v) => ({
        ...v,
        tableName: table?.name || '',
        columnName: colKey,
        isTableAssertion: false,
      }));
      return [...accum, ...result];
    }, []);

  const flatColumnDbtAssertions = Object.entries(
    table?.dbt_assertion_result?.columns || {},
  )
    .map(
      ([colKey, tests]) =>
        [colKey, tests.map(_getKindMapper('dbt'))] as [
          string,
          EnrichedAssertionTest[],
        ],
    )
    .reduce<EnrichedTableOrColumnAssertionTest[]>((accum, [colKey, tests]) => {
      const result = tests.map((v) => ({
        ...v,
        tableName: table?.name || '',
        columnName: colKey,
        isTableAssertion: false,
      }));
      return [...accum, ...result];
    }, []);

  const flatTableColAssertionEntries = [
    ...flatTableAssertionTests,
    ...flatColumnPipeAssertions,
    ...flatColumnDbtAssertions,
  ];
  return flatTableColAssertionEntries;
};
const getTaColumnbleAssertionsOnly = (rawData: ComparableReport) => {
  const comparableTables = transformAsNestedBaseTargetRecord<
    SaferSRSchema['tables'],
    SaferTableSchema
  >(rawData?.base?.tables, rawData?.input?.tables);
  const comparableTableEntries = Object.entries(comparableTables);

  //this needs to be reduce, if you want flatten
  const compTableAssertions = comparableTableEntries.reduce(
    (accum, [, { base, target }]) => {
      const flatBaseTests = _getFlattenedTestEntries(base);
      const flatTargetTests = _getFlattenedTestEntries(target);

      const tableAssertions = {
        base: accum.base?.concat(flatBaseTests),
        target: accum.target?.concat(flatTargetTests),
      };

      return tableAssertions;
    },
    { base: [], target: [] } as ComparableData<
      EnrichedTableOrColumnAssertionTest[]
    >,
  );
  const metadata = compTableAssertions.base
    ?.concat(compTableAssertions.target || [])
    .reduce(
      (accum, { status }) => ({
        total: accum.total + 1,
        passed: accum.passed + (status === 'passed' ? 1 : 0),
        failed: accum.failed + (status === 'failed' ? 1 : 0),
      }),
      {
        total: 0,
        passed: 0,
        failed: 0,
      },
    );
  compTableAssertions.metadata = metadata;
  return compTableAssertions;
};

//NOTE: `this` will not work in setter functions
export const useReportStore = create<ReportState & ReportSetters>()(function (
  set,
) {
  return {
    rawData: {},
    /** Entry point to get transformed report entities */
    setReportRawData(rawData) {
      /** Report */
      const reportOnly = getReportOnly(rawData);
      /** Report Time */
      const reportTime = getReportTime(rawData);
      /** Tables */
      const tableColumnsOnly = getTableColumnsOnly(rawData);
      /** Table-level Assertions (flattened) */

      const tableColumnAssertionsOnly = getTaColumnbleAssertionsOnly(rawData);

      const resultState: ReportState = {
        rawData,
        reportOnly,
        reportTime,
        tableColumnsOnly,
        tableColumnAssertionsOnly,
      };

      // final setter
      set(resultState);
    },
  };
});
