import fill from 'lodash/fill';
import zip from 'lodash/zip';
import { ColumnSchema } from '../sdlc/single-report-schema';

/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

//FUTURE: cleaner way?
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

// for `type` equal to string, datetime
export function transformDistribution({ base, input }) {
  const mapIndex = {};
  const result = [];

  for (let i = 0; i < base.labels.length; i++) {
    let label = base.labels[i];
    let count = base.counts[i];
    mapIndex[label] = i;
    result.push({
      label: label,
      base: count,
      input: 0,
    });
  }

  for (let i = 0; i < input.labels.length; i++) {
    let label = input.labels[i];
    let count = input.counts[i];

    if (mapIndex.hasOwnProperty(label)) {
      result[mapIndex[label]].input = count;
    } else {
      result.push({
        label: label,
        base: 0,
        input: count,
      });
    }
  }

  return result;
}

export function transformDistributionWithLabels({ base, input, labels }) {
  if (!base) {
    base = fill(Array(labels.length), 0);
  }

  if (!input) {
    input = fill(Array(labels.length), 0);
  }

  const z = zip(labels, base, input);
  const m = z.map(([label, base, input]) => ({
    label,
    base,
    input,
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
