import { NONDUPLICATE_ROWS } from './../Columns/constants';
import { TableMetaKeys } from './../Columns/ColumnMetrics/MetricsInfo';
import { FlatStackedBarChartProps } from './../Charts/FlatStackedBarChart';
import { NO_VALUE } from '../Columns/constants';
import {
  AssertionValue,
  ReportAssertionStatusCounts,
  ComparisonReportSchema,
  ComparsionSource,
  SaferTableSchema,
} from '../../../types';
import { DUPLICATE_ROWS } from './constant';
import { MetricsInfoProps } from '../Columns';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
  formatNumber,
} from '../../../utils/formatters';

export function getSingleAssertionStatusCounts(
  assertion: AssertionValue,
): ReportAssertionStatusCounts {
  if (!assertion) {
    return { passed: NO_VALUE, failed: NO_VALUE };
  }

  const tableStatus = assertion.tests.reduce(
    (acc, curr) => {
      if (curr.status === 'passed') {
        acc.passed += 1;
      } else if (curr.status === 'failed') {
        acc.failed += 1;
      }

      return acc;
    },
    { passed: 0, failed: 0 },
  );

  const columnStatus = Object.keys(assertion.columns).reduce(
    (acc, current) => {
      assertion.columns[current].forEach((item) => {
        if (item.status === 'passed') {
          acc.passed += 1;
        } else if (item.status === 'failed') {
          acc.failed += 1;
        }
      });

      return acc;
    },
    { passed: 0, failed: 0 },
  );

  return {
    passed: tableStatus.passed + columnStatus.passed,
    failed: tableStatus.failed + columnStatus.failed,
  };
}

/**
 * Get the accumulated summed assertion status counts (passed, failed, total) from list of assertion-values
 */
export function getAssertionStatusCountsFromList(assertions: AssertionValue[]) {
  const result = assertions.reduce<
    ReportAssertionStatusCounts & { total: string | number }
  >(
    (accum, curr) => {
      const { passed, failed } = getSingleAssertionStatusCounts(curr);

      // if source is string, curr-total should not include it later
      const passValue = resolveStatusCountValues(passed, accum.passed);
      const failValue = resolveStatusCountValues(failed, accum.failed);
      //to exclude accumulating existing, escape to 0 when NO_VALUE
      const currTotal = resolveStatusCountValues(
        passed !== NO_VALUE ? passValue : 0,
        failValue !== NO_VALUE ? failValue : 0,
      );

      const totalValue = resolveStatusCountValues(currTotal, accum.total);

      return {
        passed: passValue,
        failed: failValue,
        total: totalValue,
      };
    },
    { passed: NO_VALUE, failed: NO_VALUE, total: NO_VALUE },
  );
  return result;
}

/**
 * resolve util for handling assertion status counts (string | num)
 * where number types will always prevail
 * where string is typically a NO_VALUE
 */
function resolveStatusCountValues(
  source: string | number,
  target: string | number,
) {
  if (typeof source === 'number') {
    if (typeof target === 'number') {
      return source + target; // sum when both are nums
    }
    return source; // else overwrite as first-occurring num
  } else if (typeof target === 'number') {
    return target; // else always keep as num
  }
  return NO_VALUE;
}

//FIXME: REFACTOR REMOVE USAGE (CR-COL-DETAILS-PAGE)
export type ComparisonAssertions = {
  data: ComparisonReportSchema;
  tableName: string;
  type: 'piperider' | 'dbt';
};
export function getComparisonAssertions({
  data,
  tableName,
  type,
}: ComparisonAssertions) {
  const targets = {
    piperider: 'piperider_assertion_result',
    dbt: 'dbt_assertion_result',
  };

  const baseTables = { type: 'base', tables: data.base.tables[tableName] };
  const targetTables = {
    type: 'target',
    tables: data.input.tables[tableName], //legacy 'input' key
  };

  //Warning: targetTables.tables can be undefined when mismatched
  const assertions = [baseTables, targetTables].map((source) => {
    return getComparisonAssertionTests({
      assertion: source.tables && source.tables[targets[type]],
      from: source.type as ComparsionSource,
    });
  });

  return assertions;
}

type CRAssertionArgs = {
  assertion: AssertionValue;
  from: ComparsionSource;
};
export function getComparisonAssertionTests({
  assertion,
  from,
}: CRAssertionArgs) {
  const { passed, failed } = getSingleAssertionStatusCounts(assertion);

  if (!assertion) {
    return {
      passed,
      failed,
      tests: [],
    };
  }

  const table = assertion.tests.map((test) => ({
    ...test,
    level: 'Table',
    column: NO_VALUE,
    from,
  }));

  const columns = Object.keys(assertion.columns).map((column) => {
    const columnAssertion = assertion.columns[column];
    return columnAssertion.map((test) => ({
      ...test,
      level: 'Column',
      column,
      from,
    }));
  });

  return {
    passed,
    failed,
    tests: [...table, ...columns.flat()],
  };
}

/**
 * Provides Flat stack input data transform for table.duplicate_rows
 * @param tableDatum
 */
export function transformTableAsFlatStackInput(
  tableDatum?: SaferTableSchema,
): FlatStackedBarChartProps['data'] | undefined {
  if (typeof tableDatum?.duplicate_rows !== 'number') return;

  const { duplicate_rows = 0, row_count = 0, samples } = tableDatum || {};
  const total = samples || row_count; //fallback to row_count for unsampled rows
  const nonDuplicateRatio = (total - duplicate_rows) / total;
  const duplicateRowRatio = duplicate_rows / total;

  return {
    labels: [NONDUPLICATE_ROWS, DUPLICATE_ROWS],
    counts: [total, duplicate_rows],
    ratios: [nonDuplicateRatio, duplicateRowRatio],
    colors: ['#63B3ED', '#FF0861'],
  };
}

export type TableMetakeyList = [TableMetaKeys, string][];
/**
  Conditional scenarios:
  
  1. base-only (% + count) <<<
  2. base+target (count + count)
  3. base||target (count || count)
  
 * gets the list of metrics to display, based on metakey
 */
export function transformSRTableMetricsInfoList(
  metricsList: TableMetakeyList,
  tableDatum?: SaferTableSchema,
): MetricsInfoProps[] {
  if (!tableDatum) return [];
  return metricsList.map(([metakey, name]) => {
    const value = tableDatum[metakey];
    const count = Number(value);
    const percent = count / Number(tableDatum.row_count);

    return {
      name,
      metakey,
      firstSlot: isNaN(count) ? NO_VALUE : formatIntervalMinMax(percent),
      secondSlot: isNaN(count)
        ? value || NO_VALUE
        : formatAsAbbreviatedNumber(count),
      tooltipValues: {
        secondSlot: isNaN(count) ? value || NO_VALUE : formatNumber(count),
      },
    };
  });
}
