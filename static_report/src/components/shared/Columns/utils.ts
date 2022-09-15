import { ColorProps } from '@chakra-ui/styled-system';
import isNumber from 'lodash/isNumber';
import { AiOutlineFileText } from 'react-icons/ai';
import { BiText, BiQuestionMark } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { TbCircles, TbCircleHalf } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import { VscSymbolOperator } from 'react-icons/vsc';
import { ColumnSchema } from '../../../sdlc';
import {
  zeroAsFallbackHandler,
  formatIntervalMinMax,
  formatAsAbbreviatedNumber,
  formatNumber,
} from '../../../utils';
import { FlatStackedBarChartProps } from '../Charts';
import { MetricMetaKeys, MetricsInfoProps } from './ColumnMetrics';
import {
  VALIDS,
  INVALIDS,
  NULLS,
  ZEROLENGTH,
  NONZEROLENGTH,
  NEGATIVES,
  ZEROS,
  POSITIVES,
  NO_VALUE,
} from './constants';

/**
 * @param columnData
 * @returns the metrics of the column data. will return null when properties have missing operands
 */
export function getColumnMetricRatio(
  metakey: MetricMetaKeys,
  columnData?: ColumnSchema,
) {
  const { [metakey]: metavalue, total } = columnData || {};

  const result = isNumber(metavalue) && total ? metavalue / total : null;

  return result;
}

export function checkColumnCategorical(columnDatum?: ColumnSchema): boolean {
  if (columnDatum) {
    const { distinct, type } = columnDatum;
    return typeof distinct === 'number'
      ? distinct <= 100 && (type === 'string' || type === 'integer')
      : false; //this is arbitrary
  }
  return false;
}
/**
 *
 * @param columnDatum
 * @param compType defines if it's generic-type based composition metric (dynamic) or a general composition (static)
 * @returns
 */
export function transformCompositionAsFlatStackInput(
  columnDatum?: ColumnSchema,
  compType: 'static' | 'dynamic' = 'static',
): FlatStackedBarChartProps['data'] | undefined {
  if (!columnDatum) return;
  const {
    nulls,
    invalids,
    valids,
    negatives,
    zeros,
    positives,
    non_zero_length,
    zero_length,
    total,
    type,
  } = columnDatum;

  if (compType === 'static') {
    const nullsOfTotal = getColumnMetricRatio('nulls', columnDatum);
    const invalidsOfTotal = getColumnMetricRatio('invalids', columnDatum);
    const validsOfTotal = getColumnMetricRatio('valids', columnDatum);

    return {
      labels: [VALIDS, INVALIDS, NULLS].map(zeroAsFallbackHandler),
      counts: [valids, invalids, nulls].map(zeroAsFallbackHandler),
      ratios: [validsOfTotal, invalidsOfTotal, nullsOfTotal].map(
        zeroAsFallbackHandler,
      ),
      colors: ['#63B3ED', '#FF0861', '#D9D9D9'],
    };
  }
  if (type === 'string') {
    const newCounts = [zero_length, non_zero_length].map(zeroAsFallbackHandler);
    return {
      labels: [ZEROLENGTH, NONZEROLENGTH],
      counts: newCounts,
      ratios: newCounts.map((v) => v / (total || 0)),
      colors: ['#FFCF36', '#002A53'],
    };
  }
  if (containsColumnQuantile(type)) {
    const newCounts = [negatives, zeros, positives].map(zeroAsFallbackHandler);
    return {
      labels: [NEGATIVES, ZEROS, POSITIVES],
      counts: newCounts,
      ratios: newCounts.map((v) => v / (total || 0)),
      colors: ['#FFCF36', '#D9D9D9', '#002A53'],
    };
  }
}

/**
 * Retrieves the color and icon component for the column's generic type. Will default to question mark icon when type doesn't match
 * @param columnDatum
 * @returns
 */
export function getIconForColumnType(columnDatum?: ColumnSchema): {
  backgroundColor: ColorProps['color'];
  icon: any; //IconType not provided
} {
  const { type } = columnDatum || {};
  const isCategorical = checkColumnCategorical(columnDatum);

  if (isCategorical && type === 'string') {
    return {
      backgroundColor: 'purple.500',
      icon: TbCircles,
    };
  }
  if (isCategorical && type === 'integer') {
    return { backgroundColor: 'orange.500', icon: TiSortNumerically };
  }
  if (type === 'string') {
    return { backgroundColor: 'blue.500', icon: BiText };
  }
  if (containsColumnQuantile(type)) {
    return { backgroundColor: 'red.500', icon: VscSymbolOperator };
  }
  if (type === 'datetime') {
    return { backgroundColor: 'teal.500', icon: BsCalendarDate };
  }
  if (type === 'boolean') {
    return { backgroundColor: 'pink.500', icon: TbCircleHalf };
  }
  if (type === 'other') {
    return { backgroundColor: 'limegreen', icon: AiOutlineFileText };
  }
  return { backgroundColor: 'gray.500', icon: BiQuestionMark };
}

export type MetricNameMetakeyList = [MetricMetaKeys, string][];
/**
  Conditional scenarios:
  
  1. base-only (% + count) <<<
  2. base+target (count + count)
  3. base||target (count || count)
  
 * gets the list of metrics to display, based on metakey
 */
export function transformSRMetricsInfoList(
  metricsList: MetricNameMetakeyList,
  columnDatum?: ColumnSchema,
): MetricsInfoProps[] {
  if (!columnDatum) return [];
  return metricsList.map(([metakey, name]) => {
    const count = Number(columnDatum[metakey as string]);
    const percent = count / Number(columnDatum.total);

    return {
      name,
      metakey,
      firstSlot: isNaN(count) ? NO_VALUE : formatIntervalMinMax(percent),
      secondSlot: isNaN(count) ? NO_VALUE : formatAsAbbreviatedNumber(count),
      tooltipValues: { secondSlot: formatNumber(count) },
    };
  });
}
/**
  Conditional scenarios:
  
  1. base-only (% + count)
  2. base+target (count + count) <<<
  3. base||target (count || count) <<<
  
 * gets the list of metrics to display, based on metakey
 */
export function transformCRMetricsInfoList(
  metricsList: MetricNameMetakeyList,
  baseColumnDatum?: ColumnSchema,
  targetColumnDatum?: ColumnSchema,
  valueFormat: 'count' | 'percent' = 'percent',
): MetricsInfoProps[] {
  if (!baseColumnDatum && !targetColumnDatum) return [];

  const base = transformSRMetricsInfoList(metricsList, baseColumnDatum);
  const target = transformSRMetricsInfoList(metricsList, targetColumnDatum);

  const result = base.map((baseMetricItem, index) => {
    const { firstSlot: targetPercent, secondSlot: targetCount } =
      target[index] || {};
    const targetValue = valueFormat === 'percent' ? targetPercent : targetCount;

    const { firstSlot: basePercent, secondSlot: baseCount } =
      baseMetricItem || {};
    const baseValue = valueFormat === 'percent' ? basePercent : baseCount;

    return {
      ...baseMetricItem,
      firstSlot: baseValue || NO_VALUE,
      secondSlot: targetValue || NO_VALUE,
      tooltipValues: {},
    };
  });
  return result;
}

/**
 * contains* methods for determining whether to render certain column metric groups
 */

/**
 * checks if a column type supports quantile/numeral data
 */
export function containsColumnQuantile(columnType?: ColumnSchema['type']) {
  return columnType === 'numeric' || columnType === 'integer';
}
/**
 * checks if a column type supports ALL summary data e.g. avg, stddev, etc
 */
export function containsDataSummary(columnType?: ColumnSchema['type']) {
  return (
    columnType === 'integer' ||
    columnType === 'string' ||
    columnType === 'datetime' ||
    columnType === 'numeric'
  );
}
export function containsAvgSDSummary(columnType?: ColumnSchema['type']) {
  return (
    columnType === 'numeric' ||
    columnType === 'integer' ||
    columnType === 'string'
  );
}
export function containsMinMaxSummary(columnType?: ColumnSchema['type']) {
  return (
    columnType === 'numeric' ||
    columnType === 'integer' ||
    columnType === 'string'
  );
}
export function containsDistinctDuplicateSummary(
  columnType?: ColumnSchema['type'],
) {
  return (
    columnType === 'integer' ||
    columnType === 'string' ||
    columnType === 'datetime'
  );
}
