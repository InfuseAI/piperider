import {
  ColumnSchema,
  ComparableData,
  ComparisonReportSchema,
  SaferSRSchema,
  SaferTableSchema,
} from './../../../types/index';
import create from 'zustand';
// import { devtools, persist } from 'zustand/middleware';
import { transformAsNestedBaseTargetRecord } from '../../../utils/transformers';
import { formatReportTime } from '../../../utils/formatters';
type ComparableReport = Partial<ComparisonReportSchema>;
export type TableEntryItem = [
  string,
  ComparableData<Omit<SaferTableSchema, 'columns'>>,
];
export type TableColEntryItem = {
  base: [string, ColumnSchema | undefined][];
  target: [string, ColumnSchema | undefined][];
}[];
export interface ReportState {
  rawData: ComparableReport;
  reportTime?: string;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tablesOnly?: TableEntryItem[];
  tableColumnsOnly?: TableColEntryItem[];
}

interface ReportSetters {
  setReportRawData: (input: ComparableReport) => void;
  setReportTime: (baseCreatedAt?: string, targetCreatedAt?: string) => void;
}

export const useReportStore = create<ReportState & ReportSetters>()(function (
  set,
) {
  return {
    rawData: {},
    setReportRawData(rawData) {
      //should initialize entire report data, if available
      let resultState: ReportState = { rawData };

      /** Report */
      if (rawData.base) {
        const { tables, ...reportOnly } = rawData.base;
        resultState.reportOnly = { base: reportOnly };
      }
      if (rawData.input) {
        const { tables, ...reportOnly } = rawData.input;
        resultState.reportOnly = { target: reportOnly };
      }
      /** Report Time */
      const baseTime = formatReportTime(rawData.base?.created_at);
      const targetTime = formatReportTime(rawData.input?.created_at);
      const result = targetTime ? `${baseTime} -> ${targetTime}` : baseTime;
      set({ reportTime: result });

      /** Tables */
      const comparableTables = transformAsNestedBaseTargetRecord<
        SaferSRSchema['tables'],
        SaferTableSchema
      >(rawData?.base?.tables, rawData?.input?.tables);
      const tableEntries = Object.entries(comparableTables);
      resultState.tablesOnly = tableEntries;

      /** Table-Columns */
      // key: tableName, val: column-entries-for-table
      const tableColumnsOnly = tableEntries.map(
        ([tableName, { base, target }]) => {
          let valueResult = {
            base: Object.entries(base?.columns || {}),
            target: Object.entries(target?.columns || {}),
          };
          return [tableName, valueResult];
        },
      );
      //FIXME: WTF?
      resultState.tableColumnsOnly = tableColumnsOnly;

      // final setter
      set(resultState);
    },
    setReportTime(baseCreatedAt, targetCreatedAt) {
      const baseTime = formatReportTime(baseCreatedAt);
      const targetTime = formatReportTime(targetCreatedAt);
      const result = targetTime ? `${baseTime} -> ${targetTime}` : baseTime;
      set({ reportTime: result });
    },
  };
});

//FIXME: use this. to separate calls granularly
//FIXME: session-store mutate-on-demand (vs. always re-create store)
