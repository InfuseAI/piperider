import { ColumnSchema, Distribution } from '../sdlc/single-report-schema';
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

export type CRDistributionDatum = {
  label: string | null;
  base: number;
  target: number;
};
// for `type` equal to string, datetime
export function transformCRStringDateDistributions({
  base: baseDistribution,
  target: targetDistribution,
}: CRTargetData<Distribution>): CRDistributionDatum[] | null {
  // groupby base/target of a found label
  const mapIdxLookup = new Map<string, number>();
  if (!baseDistribution || !targetDistribution) return null;

  const initial = baseDistribution.labels.map((label, idx) => {
    mapIdxLookup.set(label || String(idx), idx);
    return {
      label,
      base: baseDistribution.counts[idx],
      target: 0,
    };
  });
  const result = targetDistribution.labels.reduce((accum, label, idx) => {
    const key = label || String(idx);
    const hasLabel = mapIdxLookup.has(key);
    const count = targetDistribution.counts[idx];

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

type TransSingleDistArgs = {
  baseCounts: number[];
  baseLabels: (string | null)[];
};
export function transformBaseDistribution({
  baseCounts,
  baseLabels,
}: TransSingleDistArgs): CRDistributionDatum[] {
  const result = baseCounts.map((count, idx) => ({
    label: baseLabels[idx],
    base: count,
    target: 0,
  }));

  return result;
}

export function getColumnDetails(columnData: ColumnSchema) {
  const { non_nulls, total, mismatched, distinct } = columnData;

  const hasNoNull = non_nulls === total;

  const mismatch = mismatched || 0;
  const valid = non_nulls - mismatch;
  const missing = total - non_nulls;

  const validOfTotal = valid / total;
  const mismatchOfTotal = mismatch / total;
  const missingOfTotal = missing / total;
  const distinctOfTotal = distinct / total;
  const totalOfTotal = total / total;

  return {
    hasNoNull,
    mismatch,
    valid,
    missing,
    distinctOfTotal,
    validOfTotal,
    mismatchOfTotal,
    missingOfTotal,
    totalOfTotal,
    total,
  };
}
