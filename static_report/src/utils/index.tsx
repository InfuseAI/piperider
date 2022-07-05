import * as d3 from 'd3';
import fill from 'lodash/fill';
import zip from 'lodash/zip';
import { Text } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

import type {
  AssertionResult,
  ComparisonReportSchema,
  ComparsionSource,
} from '../types';
import { ColumnSchema, TableSchema } from '../sdlc/single-report-schema';

const tooltipDefaultStyle = {
  paddingTop: 'var(--chakra-space-2)',
  paddingBottom: 'var(--chakra-space-2)',
  paddingLeft: 'var(--chakra-space-4)',
  paddingRight: 'var(--chakra-space-4)',
  borderRadius: 'var(--chakra-radii-md)',
  color: 'var(--chakra-colors-white)',
  backgroundColor: 'var(--chakra-colors-blackAlpha-700)',
};

export function getChartTooltip({ target, style = {} as any }) {
  const tooltip = d3
    .select(target)
    .append('div')
    .style('visibility', 'hidden')
    .style('position', 'absolute')
    .style('z-index', '9')
    .style('padding-top', style?.paddingTop || tooltipDefaultStyle.paddingTop)
    .style(
      'padding-bottom',
      style?.paddingBottom || tooltipDefaultStyle.paddingBottom,
    )
    .style(
      'border-radius',
      style?.borderRadius || tooltipDefaultStyle.borderRadius,
    )
    .style(
      'padding-left',
      style?.paddingLeft || tooltipDefaultStyle.paddingLeft,
    )
    .style(
      'padding-right',
      style?.paddingRight || tooltipDefaultStyle.paddingRight,
    )
    .style('color', style?.color || tooltipDefaultStyle.color)
    .style(
      'background-color',
      style?.backgroundColor || tooltipDefaultStyle.backgroundColor,
    );

  return tooltip;
}

export function getReportAsserationStatusCounts(
  assertion: AssertionResult | undefined,
) {
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

export function getMissingValue(
  column: undefined | { total?: number; non_nulls?: number },
) {
  if (!column) {
    return '-';
  }

  const num = Number((column.total - column.non_nulls) / column.total) * 100;

  if (Math.floor(num) === 0) {
    return '<0.1%';
  } else {
    return `${num.toFixed(1)}%`;
  }
}

export function formatReportTime(time: string) {
  const adjustForUTCOffset = (date) => {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    );
  };

  return format(adjustForUTCOffset(parseISO(time)), 'yyyy/MM/dd HH:mm:ss');
}

export function formatNumber(
  num: number,
  locales = 'en-US',
  options?: Intl.NumberFormatOptions,
) {
  if (!Number.isSafeInteger(num)) {
    return '-';
  }

  return new Intl.NumberFormat(locales, options).format(num);
}

export function extractExpectedOrActual(value) {
  if (!value) {
    return '-';
  }

  if (typeof value === 'object') {
    return Object.keys(value).map((key) => (
      <Text key={key}>
        {typeof value[key] === 'string'
          ? value[key]
          : JSON.stringify(value[key])}
      </Text>
    ));
  }

  return value;
}

export function getSRCommonMetrics(column: ColumnSchema) {
  // show the most common values
  // * give null if type mismatch
  // * skip null value
  // * show top 2 if the values share the same counting, examples:
  //    (more than 2) a:100, b:100, c:100 => a, b, ...
  //    (2) a:100, b:100 => a
  //    (2) null:100, a:100, b:100 => a, b
  //    (2) null:101, a:100, b:100 => a, b
  //    (2) a:100, b:100 => a, b
  //    (1) a:100 => a
  //    (1) a:100, b:99, c:99 => a

  if (column.type !== 'string') {
    return null;
  }

  const data = zip(column.distribution.labels, column.distribution.counts)
    .filter((x) => x[0] !== null)
    .slice(0, 3);
  const topCount = data[0][1];
  const tops = data.filter((x) => x[1] === topCount).map((x) => x[0]);

  if (tops.length > 2) {
    return tops.slice(0, 2).join(', ') + ', ...';
  }
  return tops.join(', ');
}

// for comparison
export function nestComparisonValueByKey(
  base: TableSchema,
  input: TableSchema,
): Record<
  string,
  { base: Record<string, unknown>; input: Record<string, unknown> }
> {
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

export function getComparisonAssertions({
  data,
  reportName,
  type,
}: {
  data: ComparisonReportSchema;
  reportName: string;
  type: 'piperider' | 'dbt';
}) {
  const targets = {
    piperider: 'assertion_results',
    dbt: 'dbt_test_results',
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

export function getComparisonAssertionTests({
  assertion,
  from,
}: {
  assertion: AssertionResult | undefined;
  from: ComparsionSource;
}) {
  const { passed, failed } = getReportAsserationStatusCounts(assertion);

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

// FIXME: Temp Typing
export function getColumnDetails(
  columnData?: ComparisonReportSchema['base']['tables']['ACTION']['columns'],
) {
  if (!columnData) {
    return {
      hasNoNull: false,
      mismatch: null,
      valid: null,
      missing: null,
      validOfTotal: null,
      mismatchOfTotal: null,
      missingOfTotal: null,
    };
  }

  const { non_nulls, total, mismatched } = columnData as any;

  const hasNoNull = non_nulls === total;

  const mismatch = mismatched || 0;
  const valid = non_nulls - mismatch;
  const missing = total - non_nulls;

  const validOfTotal = valid / total;
  const mismatchOfTotal = mismatch / total;
  const missingOfTotal = missing / total;

  return {
    hasNoNull,
    mismatch,
    valid,
    missing,
    validOfTotal,
    mismatchOfTotal,
    missingOfTotal,
  };
}
