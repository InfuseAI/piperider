import * as d3 from 'd3';
import fill from 'lodash/fill';
import zip from 'lodash/zip';
import { Text } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

import type {
  AssertionValue,
  ComparisonReportSchema,
  ComparsionSource,
} from '../types';
import { ColumnSchema } from '../sdlc/single-report-schema';

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

export type ReportAsserationStatusCounts = {
  passed: string | number;
  failed: string | number;
};
export function getReportAsserationStatusCounts(
  assertion: AssertionValue,
): ReportAsserationStatusCounts {
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

/**
 *
 * @param num number type input
 * @param locales locale string
 * @param options
 * @returns a formatted string number, based on locale & options
 */
export function formatNumber(
  num: number,
  locales = 'en-US',
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locales, options).format(num);
}

/**
 * @param num fractional number type input
 * @returns a formatted interval string, based on its percentage position
 */
export function formatIntervalMinMax(num: number) {
  // *  should show <0.1 % if the value is between (0%, 0.1%]
  const isLowerBound = num > 0 && num <= 0.001;
  // *  should show >99.9% if the value is between [99.9%, 100%) .
  const isUpperBound = num < 1 && num >= 0.999;

  const formatter = (newArg = num) =>
    formatNumber(newArg, 'en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
    });

  if (isLowerBound) {
    const result = formatter(0.001);
    return `<${result}`;
  } else if (isUpperBound) {
    const result = formatter(0.999);
    return `>${result}`;
  }
  return formatter();
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
/**
 * A method to handle falsey non-numbers (relevant for comparison reports with column shifts, where base/input values can be undefined)
 * @param input any value that will be checked as number
 * @param fn any function to format the valid number
 * @param emptyLabel
 * @returns
 */
export function formatColumnValueWith(
  input,
  fn: Function,
  emptyLabel = '-',
): string {
  return isNaN(input) ? emptyLabel : fn(input);
}
