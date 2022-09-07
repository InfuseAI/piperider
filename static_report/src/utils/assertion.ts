import { NO_VALUE } from '../components/shared/Columns/constants';
import { AssertionTest } from '../sdlc/single-report-schema';
import {
  dbtAssertionResultSchema,
  pipeRiderAssertionResultSchema,
} from '../sdlc/single-report-schema.z';
import {
  AssertionValue,
  ReportAssertionStatusCounts,
  ComparisonReportSchema,
  ComparsionSource,
  zReport,
  SaferTableSchema,
} from '../types';

export function getAssertions(assertions: AssertionTest[]) {
  const total = assertions.length;
  const failed = assertions.reduce((acc, test) => {
    if (test.status === 'failed') {
      acc++;
    }
    return acc;
  }, 0);
  const passed = total - failed;

  return {
    total,
    passed,
    failed,
  };
}

/**
 * Get the report assertions by giving piperider and dbt assertions.
 */
export function getReportAggregateAssertions(
  piperiderAssertions?: SaferTableSchema['piperider_assertion_result'],
  dbtAssertion?: SaferTableSchema['dbt_assertion_result'],
) {
  let passed = 0;
  let failed = 0;

  zReport(
    pipeRiderAssertionResultSchema
      .optional()
      .nullable()
      .safeParse(piperiderAssertions),
  );

  const { passed: piperiderPassed, failed: piperiderFailed } =
    getSingleAssertionStatusCounts(piperiderAssertions);

  if (Number.isInteger(piperiderPassed)) {
    passed += piperiderPassed as number;
  }

  if (Number.isInteger(piperiderFailed)) {
    failed += piperiderFailed as number;
  }

  if (dbtAssertion) {
    zReport(
      dbtAssertionResultSchema.optional().nullable().safeParse(dbtAssertion),
    );
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
    total: passed + failed,
  };
}

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
  const targetTables = {
    type: 'target',
    tables: data.input.tables[reportName], //legacy 'input' key
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
