import { NO_VALUE } from '../Columns/constants';
import {
  AssertionValue,
  ReportAssertionStatusCounts,
  ComparisonReportSchema,
  ComparsionSource,
} from '../../../types';

export function getSingleAssertionStatusCounts(
  assertion: AssertionValue,
): ReportAssertionStatusCounts {
  if (!assertion) {
    return { passed: NO_VALUE, failed: NO_VALUE };
  }

  const tableStatus = assertion.tests.reduce(
    (acc, curr) => {
      if (curr.status === 'passed') {
        acc.passed += 1;
      } else if (curr.status === 'failed') {
        acc.failed += 1;
      }

      return acc;
    },
    { passed: 0, failed: 0 },
  );

  const columnStatus = Object.keys(assertion.columns).reduce(
    (acc, current) => {
      assertion.columns[current].forEach((item) => {
        if (item.status === 'passed') {
          acc.passed += 1;
        } else if (item.status === 'failed') {
          acc.failed += 1;
        }
      });

      return acc;
    },
    { passed: 0, failed: 0 },
  );

  return {
    passed: tableStatus.passed + columnStatus.passed,
    failed: tableStatus.failed + columnStatus.failed,
  };
}

/**
 * Get the accumulated summed assertion status counts (passed, failed, total) from list of assertion-values
 */
export function getAssertionStatusCountsFromList(assertions: AssertionValue[]) {
  const result = assertions.reduce<
    ReportAssertionStatusCounts & { total: string | number }
  >(
    (accum, curr) => {
      const { passed, failed } = getSingleAssertionStatusCounts(curr);

      // if source is string, curr-total should not include it later
      const passValue = resolveStatusCountValues(passed, accum.passed);
      const failValue = resolveStatusCountValues(failed, accum.failed);
      //to exclude accumulating existing, escape to 0 when NO_VALUE
      const currTotal = resolveStatusCountValues(
        passed !== NO_VALUE ? passValue : 0,
        failValue !== NO_VALUE ? failValue : 0,
      );

      const totalValue = resolveStatusCountValues(currTotal, accum.total);

      return {
        passed: passValue,
        failed: failValue,
        total: totalValue,
      };
    },
    { passed: NO_VALUE, failed: NO_VALUE, total: NO_VALUE },
  );
  return result;
}

/**
 * resolve util for handling assertion status counts (string | num)
 * where number types will always prevail
 * where string is typically a NO_VALUE
 */
function resolveStatusCountValues(
  source: string | number,
  target: string | number,
) {
  if (typeof source === 'number') {
    if (typeof target === 'number') {
      return source + target; // sum when both are nums
    }
    return source; // else overwrite as first-occurring num
  } else if (typeof target === 'number') {
    return target; // else always keep as num
  }
  return NO_VALUE;
}

//FIXME: REFACTOR REMOVE USAGE (CR-COL-DETAILS-PAGE)
export type ComparisonAssertions = {
  data: ComparisonReportSchema;
  tableName: string;
  type: 'piperider' | 'dbt';
};
export function getComparisonAssertions({
  data,
  tableName,
  type,
}: ComparisonAssertions) {
  const targets = {
    piperider: 'piperider_assertion_result',
    dbt: 'dbt_assertion_result',
  };

  const baseTables = { type: 'base', tables: data.base.tables[tableName] };
  const targetTables = {
    type: 'target',
    tables: data.input.tables[tableName], //legacy 'input' key
  };

  //Warning: targetTables.tables can be undefined when mismatched
  const assertions = [baseTables, targetTables].map((source) => {
    return getComparisonAssertionTests({
      assertion: source.tables && source.tables[targets[type]],
      from: source.type as ComparsionSource,
    });
  });

  return assertions;
}

type CRAssertionArgs = {
  assertion: AssertionValue;
  from: ComparsionSource;
};
export function getComparisonAssertionTests({
  assertion,
  from,
}: CRAssertionArgs) {
  const { passed, failed } = getSingleAssertionStatusCounts(assertion);

  if (!assertion) {
    return {
      passed,
      failed,
      tests: [],
    };
  }

  const table = assertion.tests.map((test) => ({
    ...test,
    level: 'Table',
    column: NO_VALUE,
    from,
  }));

  const columns = Object.keys(assertion.columns).map((column) => {
    const columnAssertion = assertion.columns[column];
    return columnAssertion.map((test) => ({
      ...test,
      level: 'Column',
      column,
      from,
    }));
  });

  return {
    passed,
    failed,
    tests: [...table, ...columns.flat()],
  };
}
