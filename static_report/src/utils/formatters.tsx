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
  * give null if type invalids
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
export function formatModeMetrics(column: ColumnSchema) {
  const tops = column.topk.values.slice(0, 3);

  if (tops.length > 3) {
    return tops.slice(0, 3).join(', ') + ', ...';
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
/**
    <10? = Display 1 Digit, or 1 Digit + 1 Decimal -- round@single-decimal

    <1,000? = Display 0 Decimal Places (e.g. 614) --round@single-digit

    <10,000? = Display in 1,000s (Ks) (e.g. 4.5K) --round@single-decimal^

    <100,000? = Display in 1,000,000s (Ms) (e.g. 5.2M) --round@single-decimal^
    <1,000,000,000? = Display in 1,000,000s (Ms) (e.g. 956M) --round@single-decimal^
    
    >=1,000,000,000? = Use E notation to 1 digit. (e.g. 3ᴇ9, 6ᴇ12) --pure scientific method
    ## only ever 1 DP or 0 DP (depending on magnitude), not more. ##

    Round down if Min Value (e.g. 6.8 => 6) 
    Round up if Max Value (e.g. 6.8 => 7)
 * @param input 
 * @returns 
 */
export function formatAsAbbreviatedNumber(
  input: number | string,
  rounding?: string,
) {
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;
  const hundredThousand = thousand * 1000;
  // handle rounding on Min/Max values (up|down)
  const _edgeRound = (num: number) => {
    if (rounding === 'up') return Math.ceil(num);
    if (rounding === 'down') return Math.floor(num);
    return num;
  };

  // type guard for numbers (e.g. datetime strings)
  if (typeof input !== 'number') return input;
  else {
    // avoid conditional checks for negative ranges
    // (use this only for qualifying amount groups)
    const inputAsPositive = Math.abs(input);

    // format as scientific e-notation when really big
    if (inputAsPositive >= billion)
      return new Intl.NumberFormat('en-US', {
        notation: 'scientific',
        maximumFractionDigits: 1,
      }).format(_edgeRound(input));
    // format as 'M' for million between 100k and 1000k
    else if (inputAsPositive >= hundredThousand && inputAsPositive < billion)
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'liter', //just a placeholder
        unitDisplay: 'narrow',
        maximumFractionDigits: 1,
      })
        .format(_edgeRound(input / million))
        .replace('L', 'M');
    // format as 'K' for thousand between 1k and 99.9k
    else if (inputAsPositive >= thousand && inputAsPositive < hundredThousand)
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'liter', //just a placeholder
        unitDisplay: 'narrow',
        maximumFractionDigits: 1,
      })
        .format(_edgeRound(input / thousand))
        .replace('L', 'K');
    // format the hundred's as no-decimal value
    else if (inputAsPositive >= 10 && inputAsPositive < thousand)
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(_edgeRound(input));
    // format the single's with 1-decimal value
    else if (inputAsPositive >= 0 && inputAsPositive < 10)
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
      }).format(_edgeRound(input));
  }

  //else
  return null;
}
