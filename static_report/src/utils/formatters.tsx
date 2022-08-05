import { Text, Tooltip } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';
import { NO_VALUE } from '../components/shared/ColumnCard/ColumnTypeDetail/constants';

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
    return NO_VALUE;
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
export function formatTopKMetrics({ topk }: ColumnSchema) {
  if (!topk) return {};
  const { counts, values } = topk;
  const trailingEllipsis = values.length < 2 ? '' : ', ...';
  const topValues = `${values[0]}${trailingEllipsis}`;
  const topCounts = `${counts[0]}`;

  return {
    topValues,
    topCounts,
  };
}
/**
 * A method to handle falsey non-numbers (relevant for comparison reports with column shifts, where base/target values can be undefined)
 * @param input any value that will be checked as number
 * @param fn any function to format the valid number
 * @param emptyLabel
 * @returns
 */
export function formatColumnValueWith(
  input: any,
  fn: Function,
  emptyLabel = NO_VALUE,
): string {
  if (typeof input === 'string') return input;
  return isNaN(input) ? emptyLabel : fn(input);
}

/**
 *
 * @param input string to check for truncation with '...'
 * @param end position at which to truncate
 * @returns original or tooltip-wrapped truncated string
 */
export function formatTruncateString(input: string, end: number) {
  const shouldTruncate = input.length >= end;
  return shouldTruncate ? (
    <Tooltip label={input}>{input.slice(0, end) + '...'}</Tooltip>
  ) : (
    input
  );
}
/**
 * base < -2 => 2dp, scientific (small decimals)
 * base < 0 => 3dp (big decimals)
 * base < 3 => 2dp (ones, tens, hundreds)
 * base < 6 => 1dp, K (thousands)
 * base < 9 => 1dp, M (millions)
 * base < 12 => 1dp, T (trillions)
 * base < 15 => 1dp, B (billions)
 * base >= 15 => 0dp, B (billions)
 * @param input
 * @returns a formatted number by abbreviation, based on its order of magnitude
 */
export function formatAsAbbreviatedNumber(input: number | string) {
  // type guard for numbers (e.g. datetime strings)
  if (typeof input !== 'number') return input;
  else {
    // convert negatives
    const inputAsPositive = Math.abs(input);

    const twoDecimal = 10 ** -2;
    const thousand = 10 ** 3;
    const million = 10 ** 6;
    const billion = 10 ** 9;
    const trillion = 10 ** 12;
    const trillionPlus = 10 ** 15;

    const isLargeFractionals = inputAsPositive >= twoDecimal;
    const isOnesTensHundreds = inputAsPositive >= 1;
    const isThousands = inputAsPositive >= thousand;
    const isMillions = inputAsPositive >= million;
    const isBillions = inputAsPositive >= billion;
    const isSmallTrillions = inputAsPositive >= trillion;
    const isLargeTrillions = inputAsPositive >= trillionPlus;

    // format as 'T' and beyond (trillions+)
    if (isLargeTrillions || isSmallTrillions)
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'liter', //just a placeholder
        unitDisplay: 'narrow',
        maximumFractionDigits: isLargeTrillions ? 0 : 2,
      })
        .format(input / 1.0e12)
        .replace('L', 'T');
    // format as 'B', 'M', 'K' (billions to thousands)
    else if (isBillions || isMillions || isThousands) {
      const lookup = {
        base: isBillions ? billion : isMillions ? million : thousand,
        unit: isBillions ? 'B' : isMillions ? 'M' : 'K',
      };
      return new Intl.NumberFormat('en-US', {
        style: 'unit',
        unit: 'liter', //just a placeholder
        unitDisplay: 'narrow',
        maximumFractionDigits: 1,
      })
        .format(input / lookup.base)
        .replace('L', lookup.unit);
    }
    // format as unlabeled (1 to 999)
    else if (isOnesTensHundreds)
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(input);
    // format as fractionals (< 1)
    else
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: isLargeFractionals ? 3 : 2,
        notation:
          isLargeFractionals || inputAsPositive === 0
            ? 'standard'
            : 'scientific',
      }).format(input);
  }
}
