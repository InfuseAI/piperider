import { ColumnSchema, Histogram } from '../sdlc/single-report-schema';
import { CRTargetData } from '../types';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

export function transformAsNestedBaseTargetRecord<K, T>(
  base?: K,
  target?: K,
): Record<string, { base: T; target: T }> {
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

export type CRHistogramDatum = {
  label: string | null;
  base: number;
  target: number;
};
// for `type` equal to string, datetime
export function transformCRStringDateHistograms({
  base: baseHistogram,
  target: targetHistogram,
}: CRTargetData<Histogram>): CRHistogramDatum[] | null {
  // groupby base/target of a found label
  const mapIdxLookup = new Map<string, number>();
  if (!baseHistogram || !targetHistogram) return null;

  const initial = baseHistogram.labels.map((label, idx) => {
    mapIdxLookup.set(label || String(idx), idx);
    return {
      label,
      base: baseHistogram.counts[idx],
      target: 0,
    };
  });
  const result = targetHistogram.labels.reduce((accum, label, idx) => {
    const key = label || String(idx);
    const hasLabel = mapIdxLookup.has(key);
    const count = targetHistogram.counts[idx];

    if (hasLabel) {
      const lookupIdx = mapIdxLookup.get(key) as number;
      accum[lookupIdx].target = count;
      return accum;
    }

    const newLabelItem = { label, base: 0, target: count };
    return [...accum, newLabelItem];
  }, initial);

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
    type === 'string' || (type === 'integer' && topk && isCategorical);
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
