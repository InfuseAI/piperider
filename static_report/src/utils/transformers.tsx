/**
 * "Transformers" -- these are your data re-shaping transformations, and doesn't return a formatted value and does not directly get presented in UI. Can be a precursor to "formatters"
 */

/**
 * Serializes data for UI components that are shared across both SR and CR (e.g. tables, columns, assertions etc)
 * In addition, will enrich the BaseTargetRecords with entity metadata regarding i.e. added, deleted, changed
 * @param base comparison's base schema-item
 * @param target comparison's target schema-item
 * @returns a record of base/target object
 */
export function transformAsNestedBaseTargetRecord<K, T>(
  base?: K,
  target?: K,
  options?: { metadata: boolean },
): Record<
  string,
  {
    base: (T & { changed?: boolean }) | undefined;
    target: (T & { changed?: boolean }) | undefined;
  } & {
    added: number;
    deleted: number;
    changed: number;
  }
> {
  const result = {};
  // To track meta on the entity entries
  const innerKey = '__meta__';
  const newBase = base || {};
  const newTarget = target || {};
  const baseEntries = Object.entries(newBase);
  const targetEntries = Object.entries(newTarget);
  let added = 0;
  let deleted = 0;

  baseEntries.forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
    }

    result[key]['base'] = value;

    if (!newTarget[key]) {
      deleted += 1;
      result[key]['base']['changed'] = true;
    }
  });

  // if no matching entity key is found, tally new entry
  targetEntries.forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = {};
      added += 1;
    }

    result[key]['target'] = value;

    if (!newBase[key]) {
      result[key]['target']['changed'] = true;
    }
  });

  if (options?.metadata) {
    result[innerKey] = {
      added,
      deleted,
      changed: added + deleted,
    };
  }

  return result;
}

export const zeroAsFallbackHandler = (v) => (v ? v : 0);

export interface EnrichedEntityData<Entity> {
  added: number;
  deleted: number;
  changed: number;
  columns:
    | (
        | (Entity & {
            key: string;
            type: string;
            changed: boolean;
          })
        | null
      )[];
}
