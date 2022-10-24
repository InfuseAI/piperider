import { NO_VALUE, NONDUPLICATE_ROWS } from './../Columns/constants';
import { TableMetaKeys } from './../Columns/ColumnMetrics/MetricsInfo';
import { FlatStackedBarChartProps } from './../Charts/FlatStackedBarChart';
import {
  AssertionTest,
  ReportAssertionStatusCounts,
  SaferTableSchema,
} from '../../../types';
import { DUPLICATE_ROWS } from './constant';
import { MetricsInfoProps } from '../Columns';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
  formatNumber,
} from '../../../utils/formatters';
import { INFO_VAL_COLOR, NULL_VAL_COLOR } from '../../../utils/theme';

/**
 * Get the accumulated summed assertion status counts (passed, failed, total) from list of assertion-tests
 */
export function getAssertionStatusCountsFromList(assertions: AssertionTest[]) {
  const result = assertions.reduce<
    ReportAssertionStatusCounts & { total: string | number }
  >(
    (accum, curr) => {
      const passed = curr.status === 'passed' ? 1 : 0;
      const failed = curr.status === 'failed' ? 1 : 0;

      // if source is string, curr-total should not include it later
      const passValue = resolveStatusCountSumValues(passed, accum.passed);
      const failValue = resolveStatusCountSumValues(failed, accum.failed);
      //to exclude accumulating existing, escape to 0 when NO_VALUE
      const currTotal = resolveStatusCountSumValues(
        passValue !== NO_VALUE ? passValue : 0,
        failValue !== NO_VALUE ? failValue : 0,
      );

      const totalValue = resolveStatusCountSumValues(currTotal, accum.total);

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
function resolveStatusCountSumValues(
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

/**
 * Provides Flat stack input data transform for table.duplicate_rows
 * @param tableDatum
 */
export function transformTableAsFlatStackInput(
  tableDatum?: SaferTableSchema,
): FlatStackedBarChartProps['data'] | undefined {
  if (typeof tableDatum?.duplicate_rows !== 'number') return;

  const {
    duplicate_rows = 0,
    samples = 0,
    samples_p = 0,
    duplicate_rows_p = 0,
  } = tableDatum || {};

  const nonDuplicateRatio = samples_p - duplicate_rows_p;
  return {
    labels: [DUPLICATE_ROWS, NONDUPLICATE_ROWS],
    counts: [duplicate_rows, samples],
    ratios: [duplicate_rows_p, nonDuplicateRatio],
    colors: [INFO_VAL_COLOR, NULL_VAL_COLOR],
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
