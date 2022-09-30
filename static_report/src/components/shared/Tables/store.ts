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
type ComparableReport = Partial<ComparisonReportSchema>;

type ReportState = {
  rawData: ComparableReport;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tablesOnly?: [string, ComparableData<Omit<SaferTableSchema, 'columns'>>][];
  tableColumnsOnly?: (
    | string
    | {
        base: [string, ColumnSchema | undefined][];
        target: [string, ColumnSchema | undefined][];
      }
  )[][];
};

interface ReportSetters {
  setReportRawData: (input: ComparableReport) => void;
}

export const useReportStore = create<ReportState & ReportSetters>()((set) => ({
  rawData: {},
  setReportRawData(rawData) {
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
    resultState.tableColumnsOnly = tableColumnsOnly;

    // final setter
    set(resultState);
  },
}));

//FIXME: use this. to separate calls granularly
//FIXME: session-store mutate-on-demand (vs. always re-create store)
