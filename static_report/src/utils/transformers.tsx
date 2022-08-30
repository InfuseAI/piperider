import { AiOutlineFileText } from 'react-icons/ai';
import { BiText, BiQuestionMark } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { VscSymbolOperator } from 'react-icons/vsc';
import { TbCircleHalf, TbCircles } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import { ColorProps } from '@chakra-ui/react';

import { ColumnSchema } from '../sdlc/single-report-schema';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
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

export function getColumnDetails(columnData: ColumnSchema) {
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
    negatives,
    zeros,
  } = columnData;

  const hasNoNull = non_nulls === total;

  const validsOfTotal = valids && total ? valids / total : null;
  const invalidsOfTotal = invalids && total ? invalids / total : null;
  const nullsOfTotal = nulls && total ? nulls / total : null;
  const distinctOfTotal = distinct && total ? distinct / total : null;
  const duplicatesOfTotal = duplicates && total ? duplicates / total : null;
  const nonDuplicatesOfTotal =
    non_duplicates && total ? non_duplicates / total : null;
  const zeroLengthOfTotal = zero_length && total ? zero_length / total : null;
  const negativesOfTotal = negatives && total ? negatives / total : null;
  const zerosOfTotal = zeros && total ? zeros / total : null;
  const totalOfTotal = total ? total / total : null;

  return {
    negativesOfTotal,
    zerosOfTotal,
    hasNoNull,
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

export function getIconForColumnType(columnDatum: ColumnSchema | undefined): {
  backgroundColor: ColorProps['color'];
  icon: any; //IconType not provided
} {
  if (!columnDatum) {
    return { icon: null, backgroundColor: 'inherit' };
  }

  const { type } = columnDatum;
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
