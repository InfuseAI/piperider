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

export const zeroAsFallbackHandler = (v) => (v ? v : 0);
