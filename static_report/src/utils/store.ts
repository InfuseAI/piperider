import zip from 'lodash/zip';
import {
  AssertionTest,
  ColumnSchema,
  ComparableData,
  ComparisonReportSchema,
  SaferSRSchema,
  SaferTableSchema,
} from '../types/index';
import create from 'zustand';
import { transformAsNestedBaseTargetRecord } from './transformers';
import { formatReportTime } from './formatters';
import { getAssertionStatusCountsFromList } from '../components/Tables';
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
export type ComparedAssertionTestValue = Partial<AssertionTest> | null;
// FIXME: IMPORT ME FROM REGEN'ED SCHEMA TYPINGS
export type DBTBusinessMetricItem = {
  name: string;
  params: {
    dimensions: unknown[];
    grain: string;
  };
  headers: string[];
  data: unknown[][]; //2d-array: rows of table cells
};
// FIXME: IMPORT ME FROM REGEN'ED SCHEMA TYPINGS
export type DBTBusinessMetricGroupItem = {
  name: string;
  label: string;
  description: string;
  results: DBTBusinessMetricItem[];
};
export interface ReportState {
  rawData: ComparableReport;
  reportTitle?: string;
  reportTime?: string;
  reportDisplayTime?: string;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tableColumnsOnly?: CompTableColEntryItem[];
  assertionsOnly?: ComparableData<ComparedAssertionTestValue[]>;
  BMOnly?: ComparableData<DBTBusinessMetricGroupItem[]>;
}

interface ReportSetters {
  setReportRawData: (input: ComparableReport) => void;
}

// //REMOVE: BASE
// const MOCK_BM_LIST = [
//   {
//     name: 'Daily',
//     params: {
//       dimensions: [],
//       grain: 'day',
//     },
//     headers: ['day', 'active_user'],
//     data: [
//       ['2012-12-01', 1], // <-- is data[0] always datetime str?
//       ['2012-12-02', 2],
//       ['2012-12-03', 3],
//       ['2012-12-04', 4],
//     ],
//   },
//   {
//     name: 'Weekly',
//     params: {
//       dimensions: [],
//       grain: 'week',
//     },
//     headers: ['day', 'active_user'],
//     data: [
//       ['2012-12-01', 0],
//       ['2012-12-08', 5],
//       ['2012-12-15', 3],
//       ['2012-12-22', 7],
//     ],
//   },
//   {
//     name: 'Monthly',
//     params: {
//       dimensions: [],
//       grain: 'month',
//     },
//     headers: ['day', 'active_user'],
//     data: [
//       ['2012-12-01', 10],
//       ['2013-01-01', 20],
//       ['2013-02-01', 40],
//       ['2013-03-01', 80],
//     ],
//   },
//   {
//     name: 'Yearly',
//     params: {
//       dimensions: [],
//       grain: 'year',
//     },
//     headers: ['day', 'active_user'],
//     data: [
//       ['2012-12-01', 0],
//       ['2013-12-01', 10],
//       ['2014-12-01', 100],
//       ['2015-12-01', 80],
//     ],
//   },
// ];
// const MOCK_BM_GROUP_LIST: DBTBusinessMetricGroupItem[] = [
//   {
//     name: 'active_user',
//     label: 'active user',
//     description: 'This is the active user',
//     results: MOCK_BM_LIST,
//   },
// ];

// //REMOVE: Target
// const MOCK_BM_LIST_2 = MOCK_BM_LIST.map(({ data, ...rest }) => ({
//   data: data.map(([datetime, val]) => [datetime, Number(val) * Math.random()]),
//   ...rest,
// }));
// const MOCK_BM_GROUP_LIST_2 = MOCK_BM_GROUP_LIST.map(({ results, ...rest }) => ({
//   results: MOCK_BM_LIST_2,
//   ...rest,
// }));

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
const getReportDisplayTime = (rawData: ComparableReport) => {
  const baseTime = formatReportTime(rawData.base?.created_at);
  const targetTime = formatReportTime(rawData.input?.created_at);
  const result = targetTime ? `${baseTime} ➡️ ${targetTime}` : baseTime;
  return result;
};
const getReportTime = (rawData: ComparableReport) => {
  const baseTime = rawData.base?.created_at ?? undefined;
  const targetTime = rawData.input?.created_at ?? undefined;

  const result = targetTime ?? baseTime;

  if (!result) return undefined;

  return result;
};
const getReportTitle = (rawData: ComparableReport) => {
  const baseName = rawData.base?.datasource.name;
  const targetName = rawData.input?.datasource.name;
  const title = targetName ?? baseName;

  return title;
};

/**
 * returns an aligned, compared (base/target), and normalized entries for profiler's tables and columns, making it easier to iterate and render over them. Each entry is equipped with a 3-element entry item that contains [key, {base, target}, metadata].
 * Currently Assertions is not added to metadata yet.
 */
const getTableColumnsOnly = (rawData: ComparableReport) => {
  const isComparison = Boolean(rawData.base && rawData.input);
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
      const entry: CompTableColEntryItem = [
        tableName,
        {
          base: { ...base, columns: compColEntries },
          target: target.name
            ? { ...target, columns: compColEntries }
            : undefined,
        },
        columnsMetadata,
      ];
      return entry;
    },
  );

  return tableColumnsResult;
};

const getAssertionsOnly = (rawData: ComparableReport) => {
  // Formulate aligned-pairs, even if there is a misalign:
  // If undefined on either side, align complement as null value
  // else align pairs as per unique id
  const comparedAssertionMap = new Map<
    string,
    [ComparedAssertionTestValue?, ComparedAssertionTestValue?]
  >();
  const baseTests = rawData?.base?.tests;
  const targetTests = rawData?.input?.tests;

  //base-pass (init) - set-always (value)
  baseTests?.forEach((v) => {
    comparedAssertionMap.set(v.id, [v]);
  });

  //target-pass (pair) - set (null | value)
  targetTests?.forEach((v) => {
    const foundValue = comparedAssertionMap.get(v.id);
    if (foundValue) {
      //pair-found, add as second-element
      foundValue.push(v);
      comparedAssertionMap.set(v.id, foundValue);
    } else {
      //pair-missing, fill first-element as null, then add second-element as value
      comparedAssertionMap.set(v.id, [null, v]);
    }
  });

  // prepare aligned/filled-tests for store
  const alignedBaseTests: ComparedAssertionTestValue[] = [];
  const alignedTargetTests: ComparedAssertionTestValue[] = [];
  for (const [base, target] of Array.from(comparedAssertionMap.values())) {
    alignedBaseTests.push(base ?? null);
    alignedTargetTests.push(target ?? null);
  }

  const comparableAssertionTests: ReportState['assertionsOnly'] = {
    base: alignedBaseTests,
    target: alignedTargetTests,
  };

  const baseMetadata = getAssertionStatusCountsFromList(baseTests || []);
  const targetMetadata = getAssertionStatusCountsFromList(targetTests || []);
  comparableAssertionTests.metadata = {
    base: baseMetadata,
    target: targetMetadata,
  };

  return comparableAssertionTests;
};

const getBusinessMetrics = (rawData: ComparableReport) => {
  const { base, input } = rawData;

  const baseBMValue = (base?.metrics ?? []).map((group) => {
    const results = group.results.map((result) => ({
      ...result,
      data: zip(...result.data),
    }));

    return { ...group, results };
  });

  const targetBMValue = (input?.metrics ?? []).map((group) => {
    const results = group.results.map((result) => ({
      ...result,
      data: zip(...result.data),
    }));

    return { ...group, results };
  });

  return { base: baseBMValue, input: targetBMValue };
};

export const useReportStore = create<ReportState & ReportSetters>()(function (
  set,
) {
  return {
    rawData: {},
    /** Entry point to get transformed report entities */
    setReportRawData(rawData) {
      /** Report */
      const reportOnly = getReportOnly(rawData);
      /** Report Display Time */
      const reportDisplayTime = getReportDisplayTime(rawData);
      /** Report Time */
      const reportTime = getReportTime(rawData);
      /** Report Title */
      const reportTitle = getReportTitle(rawData);
      /** Tables */
      const tableColumnsOnly = getTableColumnsOnly(rawData);
      /** Table-level Assertions (flattened) */
      const assertionsOnly = getAssertionsOnly(rawData);
      /** Report Business Metrics (BM) */
      const BMOnly = getBusinessMetrics(rawData);

      const resultState: ReportState = {
        rawData,
        reportOnly,
        reportTime,
        reportTitle,
        reportDisplayTime,
        tableColumnsOnly,
        assertionsOnly,
        BMOnly,
      };

      // final setter
      set(resultState);
    },
  };
});

/**
 * Transforms 2D-Array rows into another 2D-Array columns
 * @param dataRowList
 * @returns 2D array of columns (lodash zip)
 */
