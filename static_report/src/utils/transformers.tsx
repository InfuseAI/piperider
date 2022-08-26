import { ColorProps } from '@chakra-ui/styled-system';
import isNumber from 'lodash/isNumber';
import { AiOutlineFileText } from 'react-icons/ai';
import { BiText, BiQuestionMark } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { TbCircles, TbCircleHalf } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import { VscSymbolOperator } from 'react-icons/vsc';
import { FlatStackedBarChartProps } from '../components/shared/Charts/FlatStackedBarChart';
import {
  ZEROLENGTH,
  NONZEROLENGTH,
  NEGATIVES,
  ZEROS,
  POSITIVES,
  INVALIDS,
  NULLS,
  VALIDS,
} from '../components/shared/ColumnCard/ColumnTypeDetail/constants';
import { ColumnSchema } from '../sdlc/single-report-schema';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

/**
 * Serializes data for UI components that are shared across both SR and CR (e.g. tables, columns, assertions etc)
 * @param base comparison's base schema-item
 * @param target comparison's target schema-item
 * @returns a record of base/target object
 */
export function transformAsNestedBaseTargetRecord<K, T>(
  base?: K,
  target?: K,
): Record<string, { base: T | undefined; target: T | undefined }> {
  const result = {};

  Object.entries(base || {}).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['base'] = value;
  });

  Object.entries(target || {}).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['target'] = value;
  });

  return result;
}

/**
 * @param columnData
 * @returns the metrics of the column data. will return null when properties have missing operands
 */
export function getColumnDetails(columnData?: ColumnSchema) {
  const {
    nulls,
    non_nulls,
    total,
    invalids,
    distinct,
    valids,
    non_duplicates,
    duplicates,
    zero_length,
    non_zero_length,
    negatives,
    positives,
    zeros,
  } = columnData || {};

  const hasNoNull = non_nulls === total;
  const validsOfTotal = isNumber(valids) && total ? valids / total : null;
  const invalidsOfTotal = isNumber(invalids) && total ? invalids / total : null;
  const nullsOfTotal = isNumber(nulls) && total ? nulls / total : null;
  const distinctOfTotal = isNumber(distinct) && total ? distinct / total : null;
  const duplicatesOfTotal =
    isNumber(duplicates) && total ? duplicates / total : null;
  const nonDuplicatesOfTotal =
    isNumber(non_duplicates) && total ? non_duplicates / total : null;
  const nonZeroLengthOfTotal =
    isNumber(non_zero_length) && total ? non_zero_length / total : null;
  const zeroLengthOfTotal =
    isNumber(zero_length) && total ? zero_length / total : null;
  const negativesOfTotal =
    isNumber(negatives) && total ? negatives / total : null;
  const zerosOfTotal = isNumber(zeros) && total ? zeros / total : null;
  const positivesOfTotal =
    isNumber(positives) && total ? positives / total : null;
  const totalOfTotal = total ? total / total : null;

  return {
    positivesOfTotal,
    negativesOfTotal,
    zerosOfTotal,
    hasNoNull,
    nonZeroLengthOfTotal,
    zeroLengthOfTotal,
    distinctOfTotal,
    validsOfTotal,
    invalidsOfTotal,
    nullsOfTotal,
    duplicatesOfTotal,
    nonDuplicatesOfTotal,
    totalOfTotal,
  };
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
 * Determines the chart kind suitable for column.type
 * @param columnDatum
 * @returns a string literal describing the chart kind
 */
type ChartKind = 'topk' | 'histogram' | 'pie' | undefined;
export function getChartKindByColumnType(
  columnDatum?: ColumnSchema,
): ChartKind {
  if (!columnDatum) return;
  const { topk, histogram, trues, falses, type } = columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);
  const isPieKind = type === 'boolean' && trues && falses;
  const isCategoryKind =
    (type === 'string' || type === 'integer') && topk && isCategorical;
  const isHistogramKind =
    (type === 'numeric' ||
      type === 'integer' ||
      type === 'string' ||
      type === 'datetime') &&
    histogram;

  if (isPieKind) return 'pie';
  if (isCategoryKind) return 'topk';
  if (isHistogramKind) return 'histogram';
}

export type CRHistogramDatum = {
  label: string | null;
  base: number;
  target: number;
};

export const zeroAsFallbackHandler = (v) => (v ? v : 0);
/**
 *
 * @param columnDatum
 * @param compType defines if it's generic-type based composition metric (dynamic) or a general composition (static)
 * @returns
 */
export function transformCompositionAsFlatStackInput(
  columnDatum: ColumnSchema,
  compType: 'static' | 'dynamic',
): FlatStackedBarChartProps['data'] | undefined {
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
    const { nullsOfTotal, invalidsOfTotal, validsOfTotal } =
      getColumnDetails(columnDatum);

    return {
      labels: [VALIDS, INVALIDS, NULLS].map(zeroAsFallbackHandler),
      counts: [valids, invalids, nulls].map(zeroAsFallbackHandler),
      ratios: [validsOfTotal, nullsOfTotal, invalidsOfTotal].map(
        zeroAsFallbackHandler,
      ),
      colors: ['#63B3ED', '#D9D9D9', '#FF0861'],
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
  if (type === 'numeric' || type === 'integer') {
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
  if (type === 'numeric' || type === 'integer') {
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
