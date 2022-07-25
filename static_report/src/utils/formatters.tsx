import zip from 'lodash/zip';
import { Text } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';

import type { ColumnSchema } from '../sdlc/single-report-schema';

/**
 * "Formatters" -- these are your data formatting that returns a formatted value for UI presentation (e.g. number, string, falsey)
 */
/**
 *
 * @param dateStr ISO date string
 * @returns a formatted date string in 'yyyy/MM/dd HH:mm:ss'
 */
export function formatReportTime(dateStr: string) {
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

  return format(adjustForUTCOffset(parseISO(dateStr)), 'yyyy/MM/dd HH:mm:ss');
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
 * @returns a formatted percentage string, based on its percentage proximity to either ends (<0.1% and >99.9%)
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

//FIXME: is this doing anything since expected|actual are booleans?
// SR side: No need for object record handling
// CR side: needs record handling
export function formatTestExpectedOrActual(value) {
  if (!value) {
    return '-';
  }

  // Needed due to comparison's get assertions DS
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

/**
  show the most common values (aka Mode)
  * give null if type mismatch
  * skip null value
  * show top 2 if the values share the same counting, examples:
     (more than 2) a:100, b:100, c:100 => a, b, ...
     (2) a:100, b:100 => a
     (2) null:100, a:100, b:100 => a, b
     (2) null:101, a:100, b:100 => a, b
     (2) a:100, b:100 => a, b
     (1) a:100 => a
     (1) a:100, b:99, c:99 => a
 */
export function getSRModeMetrics(column: ColumnSchema) {
  if (column.type !== 'string') {
    return null;
  }

  const data = zip(column.distribution?.labels, column.distribution?.counts)
    .filter((x) => x[0] !== null)
    .slice(0, 3);
  const topCount = data[0][1];
  const tops = data
    .filter((x) => x[1] === topCount)
    .map((x) => {
      const label = x[0];
      return label.length >= 40 ? label.slice(0, 40).concat('-') : label;
    });

  if (tops.length > 2) {
    return tops.slice(0, 2).join(', ') + ', ...';
  }
  return tops.join(', ');
}
/**
 * A method to handle falsey non-numbers (relevant for comparison reports with column shifts, where base/target values can be undefined)
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

/**
 *
 * @param input string to check for truncation with '...'
 * @param end position at which to truncate
 * @returns original or truncated string
 */
export function formatTruncateString(input: string, end: number) {
  return input.length >= end ? input.slice(0, end) + '...' : input;
}
