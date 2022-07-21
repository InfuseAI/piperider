import fill from 'lodash/fill';
import zip from 'lodash/zip';
import { ColumnSchema, Distribution } from '../sdlc/single-report-schema';
import { CRInputData } from '../types';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

export function nestComparisonValueByKey<T>(
  base: any,
  input: any,
): Record<string, { base: T; input: T }> {
  const result = {};

  Object.entries(base).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['base'] = value;
  });

  Object.entries(input).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }
    result[key]['input'] = value;
  });

  return result;
}

export type CRDistributionDatum = {
  label: string;
  base: number;
  input: number;
};
// for `type` equal to string, datetime
export function transformCRStringDateDistributions({
  base,
  input,
}: CRInputData<Distribution>): CRDistributionDatum[] {
  // groupby base/input of a found label
  const mapIdxLookup = new Map<string, number>();

  const initial = base.labels.map((label, idx) => {
    mapIdxLookup.set(label, idx);
    return {
      label,
      base: base.counts[idx],
      input: 0,
    };
  });
  const result = input.labels.reduce((accum, label, idx, arr) => {
    const hasLabel = mapIdxLookup.has(label);
    const count = input.counts[idx];

    if (hasLabel) {
      const lookupIdx = mapIdxLookup.get(label);
      accum[lookupIdx].input = count;
      return accum;
    }

    const newLabelItem = { label, base: 0, input: count };
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
    input: 0,
  }));

  return m;
}

export function getColumnDetails(columnData: ColumnSchema) {
  const { non_nulls, total, mismatched } = columnData;

  const hasNoNull = non_nulls === total;

  const mismatch = mismatched || 0;
  const valid = non_nulls - mismatch;
  const missing = total - non_nulls;

  const validOfTotal = valid / total;
  const mismatchOfTotal = mismatch / total;
  const missingOfTotal = missing / total;
  const totalOfTotal = total / total;

  return {
    hasNoNull,
    mismatch,
    valid,
    missing,
    validOfTotal,
    mismatchOfTotal,
    missingOfTotal,
    totalOfTotal,
    total,
  };
}
