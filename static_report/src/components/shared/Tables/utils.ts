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

export function getAssertionStatusCountsFromList(assertions: AssertionValue[]) {
  const result = assertions.reduce<
    ReportAssertionStatusCounts & { total: string | number }
  >(
    (accum, curr) => {
      const { passed, failed } = getSingleAssertionStatusCounts(curr);

      const isPassedNum = typeof passed === 'number';
      const isFailedNum = typeof failed === 'number';

      const passValue =
        isPassedNum && typeof accum.passed === 'number'
          ? passed + accum.passed
          : passed;
      const failValue =
        isFailedNum && typeof accum.failed === 'number'
          ? failed + accum.failed
          : failed;
      const totalValue =
        isFailedNum && isPassedNum && typeof accum.total === 'number'
          ? passed + failed + accum.total
          : NO_VALUE;

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
