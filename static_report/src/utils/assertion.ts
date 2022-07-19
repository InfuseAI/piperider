import { TableSchema } from '../sdlc/single-report-schema';
import {
  ZTableSchema,
  AssertionValue,
  ReportAssertionStatusCounts,
  ComparisonReportSchema,
  ComparsionSource,
} from '../types';

/**
 * Get the report assertions by giving piperider and dbt assertions.
 */
export function getReportAggregateAssertions(
  piperiderAssertions: TableSchema['piperider_assertion_result'],
  dbtAssertion?: TableSchema['dbt_assertion_result'],
) {
  let passed = 0;
  let failed = 0;

  ZTableSchema.shape.piperider_assertion_result.parse(piperiderAssertions);

  const { passed: piperiderPassed, failed: piperiderFailed } =
    getSingleAssertionStatusCounts(piperiderAssertions);

  if (Number.isInteger(piperiderPassed)) {
    passed += piperiderPassed as number;
  }

  if (Number.isInteger(piperiderFailed)) {
    passed += piperiderFailed as number;
  }

  if (dbtAssertion) {
    ZTableSchema.shape.dbt_assertion_result.parse(dbtAssertion);
    const { passed: dbtPassed, failed: dbtFailed } =
      getSingleAssertionStatusCounts(dbtAssertion);

    if (Number.isInteger(dbtPassed)) {
      passed += dbtPassed as number;
    }

    if (Number.isInteger(dbtFailed)) {
      failed += dbtFailed as number;
    }
  }

  return {
    passed,
    failed,
  };
}

export function getSingleAssertionStatusCounts(
  assertion: AssertionValue,
): ReportAssertionStatusCounts {
  if (!assertion) {
    return { passed: '-', failed: '-' };
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

export type ComparisonAssertions = {
  data: ComparisonReportSchema;
  reportName: string;
  type: 'piperider' | 'dbt';
};
export function getComparisonAssertions({
  data,
  reportName,
  type,
}: ComparisonAssertions) {
  const targets = {
    piperider: 'piperider_assertion_result',
    dbt: 'dbt_assertion_result',
  };

  const baseTables = { type: 'base', tables: data.base.tables[reportName] };
  const inputTables = { type: 'input', tables: data.input.tables[reportName] };

  const assertions = [baseTables, inputTables].map((source) =>
    getComparisonAssertionTests({
      assertion: source.tables[targets[type]],
      from: source.type as ComparsionSource,
    }),
  );

  return assertions;
}

//FIXME: Rename -- hard to understand
export type ComparisonAssertionTests = {
  passed: string | number;
  failed: string | number;
  tests: {
    level: string;
    column: string;
    from: ComparsionSource;
    name: string;
    status: 'passed' | 'failed';
    parameters: Record<string, unknown>;
    expected: Record<string, unknown>;
    actual: number;
    tags: unknown[];
  }[];
};

export function getComparisonAssertionTests({
  assertion,
  from,
}: {
  assertion: AssertionValue;
  from: ComparsionSource;
}) {
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
    column: '-',
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
