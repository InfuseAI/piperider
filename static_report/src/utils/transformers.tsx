import fill from 'lodash/fill';
import zip from 'lodash/zip';
import { ColumnSchema, Distribution } from '../sdlc/single-report-schema';
import { CRTargetData } from '../types';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

export function transformAsNestedBaseTargetRecord<K, T>(
  base: K,
  target: K,
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
  label: string;
  base: number;
  target: number;
};
// for `type` equal to string, datetime
export function transformCRStringDateDistributions({
  base,
  target,
}: CRTargetData<Distribution>): CRDistributionDatum[] {
  // groupby base/target of a found label
  const mapIdxLookup = new Map<string, number>();

  const initial = base.labels.map((label, idx) => {
    mapIdxLookup.set(label, idx);
    return {
      label,
      base: base.counts[idx],
      target: 0,
    };
  });
  const result = target.labels.reduce((accum, label, idx, arr) => {
    const hasLabel = mapIdxLookup.has(label);
    const count = target.counts[idx];

    if (hasLabel) {
      const lookupIdx = mapIdxLookup.get(label);
      accum[lookupIdx].target = count;
      return accum;
    }

    const newLabelItem = { label, base: 0, target: count };
    return [...accum, newLabelItem];
  }, initial);

  return result;
}

type TransSingleDistArgs = { baseCounts: number[]; baseLabels: string[] };
export function transformBaseDistribution({
  baseCounts,
  baseLabels,
}: TransSingleDistArgs): CRDistributionDatum[] {
  const emptyCounts = fill(Array(baseLabels.length), 0);

  const z = zip<string, number>(baseLabels, baseCounts || emptyCounts);
  const m = z.map(([label, base]) => ({
    label,
    base,
    target: 0,
  }));

  return m;
}

export function getColumnDetails(columnData: ColumnSchema) {
  const { non_nulls, total, nulls, distinct } = columnData;

  const hasNoNull = non_nulls === total;

  const mismatch = nulls || 0;
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
