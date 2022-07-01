import * as d3 from 'd3';
import fill from 'lodash/fill';
import zip from 'lodash/zip';
import mergeWith from 'lodash/mergeWith';
import { Text } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

import type { AssertionResult } from '../types';
import type { ComparisonReportSchema } from '../sdlc/comparison-report-schema';

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
  num,
  locales = 'en-US',
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locales, options).format(num);
}

export function extractExpectedOrActual(value) {
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

// for comparison
export function nestComparisonValueByKey(
  base: ComparisonReportSchema['base']['tables'],
  input: ComparisonReportSchema['input']['tables'],
): Record<
  string,
  { base: Record<string, unknown>; input: Record<string, unknown> }
> {
  const helper = (acc, [key, value]) => {
    acc[key] = value;
    return acc;
  };
  const _base = Object.entries(base).reduce(helper, {});
  const _input = Object.entries(input).reduce(helper, {});

  return mergeWith(_base, _input, (base, input) => ({
    base,
    input,
  }));
}

export function getComparisonAssertionTests({
  assertion,
  from,
}: {
  assertion: AssertionResult | undefined;
  from: 'base' | 'input';
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
  columnData: ComparisonReportSchema['base']['tables']['ACTION']['columns']['DATE'],
) {
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
