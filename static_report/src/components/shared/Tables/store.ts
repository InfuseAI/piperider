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
type EntryItem<T> = [string, T];
export type CompColEntryItem = EntryItem<ComparableData<Partial<ColumnSchema>>>;
export type CompTableWithColEntryOverwrite = Omit<
  Partial<SaferTableSchema>,
  'columns'
> & {
  columns: CompColEntryItem[];
};
//FIXME: Augment Columns.meta/Tables.meta + icons (add to comparable layer, alongside base|target)
export type CompTableColEntryItem = EntryItem<
  ComparableData<CompTableWithColEntryOverwrite>
>;
export interface ReportState {
  rawData: ComparableReport;
  reportTime?: string;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tableColumnsOnly?: CompTableColEntryItem[];
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
      >(rawData?.base?.tables, rawData?.input?.tables, { metadata: true });
      const compTableEntries = Object.entries(comparableTables);

      /** Table-Columns */
      const tableColumnsResult = compTableEntries.map(
        ([tableName, { base = {}, target = {} }]) => {
          const comparableColumns = transformAsNestedBaseTargetRecord<
            SaferTableSchema['columns'],
            ColumnSchema
          >(base?.columns, target?.columns, { metadata: true });
          const compColEntries = Object.entries(comparableColumns);

          // re-map table entry
          const tableEntryValue: ComparableData<CompTableWithColEntryOverwrite> =
            {
              base: { ...base, columns: compColEntries },
              target: { ...target, columns: compColEntries },
            };
          const result = [tableName, tableEntryValue] as CompTableColEntryItem;
          return result;
        },
      );
      resultState.tableColumnsOnly = tableColumnsResult;

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
