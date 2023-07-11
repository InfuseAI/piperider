import zip from 'lodash/zip';
import {
  AssertionTest,
  BusinessMetric,
  ColumnSchema,
  ComparableData,
  ComparisonReportSchema,
  DbtNode,
  SaferSRSchema,
} from '../types/index';
import create from 'zustand';
import { formatReportTime } from './formatters';
import { getAssertionStatusCountsFromList } from '../components/Tables';
import {
  LineageGraphData,
  SidebarTreeItem,
  buildDatabaseTree,
  buildDbtNodes,
  buildLineageGraph,
  buildProjectTree,
} from './dbt';
import { getDownstreamSet } from './graph';
import { DbtManifestSchema } from '../sdlc/dbt-manifest-schema';

export type ComparableReport = Partial<ComparisonReportSchema>; //to support single-run data structure
export type ChangeStatus = 'modified' | 'added' | 'removed' | 'implicit' | null;
type ComparableMetadata = {
  /**
   * Dbt node
   */
  added?: number; // count of added columns
  deleted?: number; // count of deleted columns
  changed?: number; // count of changed columns
  impacted?: boolean; // is the explicit changes or their downstreams
  changeStatus?: ChangeStatus;

  /**
   * Column
   */
  mismatched?: boolean; // the column is mismatched
};
type EntryItem<T> = [string, T, ComparableMetadata];
export type CompColEntryItem = EntryItem<ComparableData<Partial<ColumnSchema>>>;

export type CompTableColEntryItem = EntryItem<ComparableData<Partial<DbtNode>>>;

export type ComparedAssertionTestValue = Partial<AssertionTest> | null;

export interface ReportState {
  rawData: ComparableReport;

  /**
   * Try if no dbt manfiest
   */
  isLegacy?: boolean;

  /* Transformed data */
  reportTitle?: string;
  reportTime?: string;
  reportDisplayTime?: string;
  reportOnly?: ComparableData<Omit<SaferSRSchema, 'tables'>>;
  tableColumnsOnly?: CompTableColEntryItem[];
  assertionsOnly?: ComparableData<ComparedAssertionTestValue[]>;
  BMOnly?: ComparableData<BusinessMetric[]>;
  isCloudReport?: boolean;
  /**
   * Sidebar trees
   */
  projectTree?: SidebarTreeItem[];
  databaseTree?: SidebarTreeItem[];

  /**
   * Change sets
   */
  explicit?: Set<string>;
  impacted?: Set<string>;
  implicit?: Set<string>;

  /**
   * Lineage graph
   */
  lineageGraph?: LineageGraphData;
}

interface ReportSetters {
  setReportRawData: (input: ComparableReport) => void;
  expandTreeForPath: (path: string) => void;
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
  const baseName = rawData.base?.datasource?.name;
  const targetName = rawData.input?.datasource?.name;
  const title = targetName ?? baseName;

  return title;
};

/**
 * returns an aligned, compared (base/target), and normalized entries for profiler's tables and columns, making it easier to iterate and render over them. Each entry is equipped with a 3-element entry item that contains [key, {base, target}, metadata].
 * Currently Assertions is not added to metadata yet.
 */
const getTableColumnsOnly = (rawData: ComparableReport) => {
  const mergeKeys = (base: string[], target: string[]) => {
    // Merge keys from base, target tables. Unlike default union, it preserves the order for column rename, added, removed.

    // return _.union(primary, secondary);

    const results: string[] = [];
    while (base.length > 0 && target.length > 0) {
      if (base[0] === target[0]) {
        results.push(base[0]);
        base.shift();
        target.shift();
      } else if (target.includes(base[0])) {
        const idx = target.indexOf(base[0]);
        for (let i = 0; i < idx; i++) {
          if (!results.includes(target[i])) {
            results.push(target[i]);
          }
        }
        results.push(base[0]);
        base.shift();
        target.splice(0, idx + 1);
      } else if (results.includes(base[0])) {
        base.shift();
      } else {
        results.push(base[0]);
        base.shift();
      }
    }

    base.forEach((key) => {
      if (!results.includes(key)) {
        results.push(key);
      }
    });

    target.forEach((key) => {
      if (!results.includes(key)) {
        results.push(key);
      }
    });

    return results;
  };

  const baseNodes = buildDbtNodes(rawData?.base) ?? {};
  const targetNodes = buildDbtNodes(rawData?.input) ?? {};
  const nodeKeys = mergeKeys(Object.keys(baseNodes), Object.keys(targetNodes));
  const implicitSet = rawData?.implicit
    ? new Set(rawData?.implicit)
    : new Set();
  const explicitSet = rawData?.explicit
    ? new Set(rawData?.explicit)
    : new Set();
  const impactedSet = rawData?.explicit
    ? getDownstreamSet(rawData?.explicit, (uniqueId) => {
        const manifest = rawData?.input?.dbt?.manifest as
          | DbtManifestSchema
          | undefined;
        return manifest?.child_map?.[uniqueId] ?? [];
      })
    : new Set();

  return nodeKeys.map((nodeKey) => {
    const base = baseNodes[nodeKey];
    const target = targetNodes[nodeKey];
    const baseColumns = base?.__table?.columns ?? {};
    const targetColumns = target?.__table?.columns ?? {};
    const keys = mergeKeys(
      Object.keys(baseColumns),
      Object.keys(targetColumns),
    );
    let added = 0;
    let deleted = 0;
    let changed = 0;
    let changeStatus: ComparableMetadata['changeStatus'] = null;
    let impacted = false;

    const columns: CompColEntryItem[] = [];
    keys.forEach((key) => {
      const base = baseColumns[key];
      const target = targetColumns[key];
      let mismatched = false;

      if (!base) {
        added += 1;
        mismatched = true;
      } else if (!target) {
        deleted += 1;
        mismatched = true;
      } else if (
        base.name !== target.name ||
        base.schema_type !== target.schema_type
      ) {
        changed += 1;
        mismatched = true;
      }

      columns.push([key, { base, target }, { mismatched }]);
    });

    if (base) {
      base.__columns = columns;
    }

    if (target) {
      target.__columns = columns;
    }

    if (!base) {
      changeStatus = 'added';
    } else if (!target) {
      changeStatus = 'removed';
    } else if (explicitSet.has(`${nodeKey}`)) {
      changeStatus = 'modified';
    } else if (implicitSet.has(`${nodeKey}`)) {
      changeStatus = 'implicit';
    }

    if (impactedSet.has(nodeKey) || changeStatus === 'added') {
      impacted = true;
    }

    return [
      nodeKey,
      { base, target },
      { added, deleted, changed, changeStatus, impacted },
    ] as CompTableColEntryItem;
  });
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

type DataColumn = (string | number | null)[][];
const getBusinessMetrics = (rawData: ComparableReport) => {
  const { base, input } = rawData;

  const baseBMValue = (base?.metrics ?? []).map((group) => {
    const zippedDataColumns = zip(...group.data) as DataColumn;
    return { ...group, data: zippedDataColumns };
  });

  const targetBMValue = (input?.metrics ?? []).map((group) => {
    const zippedDataColumns = zip(...group.data) as DataColumn;
    return { ...group, data: zippedDataColumns };
  });

  return { base: baseBMValue, target: targetBMValue };
};

const getIsCloudReport = (rawData: ComparableReport) => {
  const { base } = rawData;
  return base?.cloud ? true : false;
};

export const useReportStore = create<ReportState & ReportSetters>()(
  (set, get) => ({
    rawData: {},
    /** Entry point to get transformed report entities */
    setReportRawData: (rawData) => {
      const tableColumnsOnly = getTableColumnsOnly(rawData);
      const fallback = rawData.input || rawData.base;
      const isLegacy = !fallback?.dbt?.manifest;
      const resultState: ReportState = {
        /**
         * Raw Report Data
         * Single:     {base: singleRun}
         * Comparison: {base: compareBase, target: compareTarget}
         */
        rawData,
        isLegacy,

        /** Report Metadata */
        reportTime: getReportTime(rawData),
        reportDisplayTime: getReportDisplayTime(rawData),
        reportTitle: getReportTitle(rawData),
        /*Report */
        reportOnly: getReportOnly(rawData),
        tableColumnsOnly,
        assertionsOnly: getAssertionsOnly(rawData),
        BMOnly: getBusinessMetrics(rawData),
        isCloudReport: getIsCloudReport(rawData),
        /* Sidebar Trees */
        projectTree: buildProjectTree(tableColumnsOnly, isLegacy),
        databaseTree: buildDatabaseTree(tableColumnsOnly),
        /* Lineage Graph */
        lineageGraph: buildLineageGraph(tableColumnsOnly),
      };

      // final setter
      set(resultState);
    },

    expandTreeForPath: (path) => {
      const { projectTree, databaseTree } = get();
      function expandSelected(item: SidebarTreeItem) {
        if (path && item.path === path) {
          return true;
        }
        for (const child of item.items || []) {
          const childrenSelected = expandSelected(child);
          if (childrenSelected) {
            item.expanded = true;
            return true;
          }
        }
        return false;
      }
      projectTree?.forEach((item) => {
        expandSelected(item);
      });
      databaseTree?.forEach((item) => {
        expandSelected(item);
      });
    },
  }),
);
