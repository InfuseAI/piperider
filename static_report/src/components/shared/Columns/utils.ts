import {
  NEGATIVE_VAL_COLOR,
  ZERO_VAL_COLOR,
  NON_ZERO_VAL_COLOR,
  INVALID_VAL_COLOR,
  NULL_VAL_COLOR,
} from './../../../utils/theme';
import { ColorProps } from '@chakra-ui/styled-system';
import { AiOutlineFileText } from 'react-icons/ai';
import { BiText, BiQuestionMark } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { TbCircleHalf } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import { VscSymbolOperator } from 'react-icons/vsc';
import { ColumnSchema } from '../../../sdlc';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
  formatNumber,
} from '../../../utils/formatters';
import { zeroAsFallbackHandler } from '../../../utils/transformers';
import { FlatStackedBarChartProps } from '../Charts/FlatStackedBarChart';
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
 * @param columnDatum
 * @returns a boolean indicating whether a column is categorical (e.g. topk)
 */
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
 * @param columnDatum
 * @param compType defines if it's generic-type based composition metric (dynamic) or a general composition (static)
 * @returns
 */
export function transformCompositionAsFlatStackInput(
  columnDatum?: ColumnSchema,
): FlatStackedBarChartProps['data'] | undefined {
  if (!columnDatum) return;
  const {
    nulls,
    nulls_p,
    invalids,
    invalids_p,
    valids,
    valids_p,
    negatives,
    negatives_p,
    zeros,
    zeros_p,
    positives,
    positives_p,
    non_zero_length,
    non_zero_length_p,
    zero_length,
    zero_length_p,
    type,
  } = columnDatum;

  const invalidNullLabels = [INVALIDS, NULLS];
  const invalidNullCounts = [invalids, nulls];
  const invalidNullColors = [INVALID_VAL_COLOR, NULL_VAL_COLOR];
  const invalidNullRatios = [invalids_p, nulls_p];

  // Text Compositions
  if (type === 'string') {
    return {
      labels: [ZEROLENGTH, NONZEROLENGTH, ...invalidNullLabels],
      counts: [zero_length, non_zero_length, ...invalidNullCounts].map(
        zeroAsFallbackHandler,
      ),
      ratios: [zero_length_p, non_zero_length_p, invalids_p, nulls_p].map(
        zeroAsFallbackHandler,
      ),
      colors: [ZERO_VAL_COLOR, NON_ZERO_VAL_COLOR, ...invalidNullColors],
    };
  }

  // Numeric/Integer Compositions
  if (containsColumnQuantile(type)) {
    const newCounts = [negatives, zeros, positives, ...invalidNullCounts].map(
      zeroAsFallbackHandler,
    );
    return {
      labels: [NEGATIVES, ZEROS, POSITIVES, ...invalidNullLabels],
      counts: newCounts,
      ratios: [negatives_p, zeros_p, positives_p, ...invalidNullRatios].map(
        zeroAsFallbackHandler,
      ),
      colors: [
        NEGATIVE_VAL_COLOR,
        ZERO_VAL_COLOR,
        NON_ZERO_VAL_COLOR,
        ...invalidNullColors,
      ],
    };
  }
  //default compositions will show 'valids instead
  return {
    labels: [VALIDS, ...invalidNullLabels].map(zeroAsFallbackHandler),
    counts: [valids, ...invalidNullCounts].map(zeroAsFallbackHandler),
    ratios: [valids_p, ...invalidNullRatios].map(zeroAsFallbackHandler),
    colors: ['#63B3ED', ...invalidNullColors],
  };
}

/**
 * Retrieves the color and icon component for the column's generic type. Will default to question mark icon when type doesn't match
 * @param columnDatum
 * @returns
 */
export function getIconForColumnType(columnDatum?: Partial<ColumnSchema>): {
  backgroundColor: ColorProps['color'];
  icon: any; //IconType not provided
} {
  const { type } = columnDatum || {};

  if (type === 'integer') {
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
 * will prioritize `<metric>_p` percentage values and fallback on UI logic calculations when undefined
 */
export function transformSRMetricsInfoList(
  metricsList: MetricNameMetakeyList,
  columnDatum?: ColumnSchema,
): MetricsInfoProps[] {
  if (!columnDatum) return [];
  return metricsList.map(([metakey, name]) => {
    const value = columnDatum[metakey];
    const pValue = columnDatum[metakey + '_p'];

    const count = Number(value);
    const percent = pValue >= 0 ? pValue : count / (columnDatum.samples || 0);

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
/**
  Conditional scenarios:
  
  1. base-only (% + count)
  2. base+target (count + count) <<<
  3. base||target (count || count) <<<
  
 * gets the list of metrics to display, based on metakey.
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
    columnType === 'datetime' ||
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
