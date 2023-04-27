import { Flex, Text } from '@chakra-ui/react';
import isNumber from 'lodash/isNumber';

import { BooleanPieChart } from './BooleanPieChart';
import { HistogramChart } from './HistogramChart';
import { FlatBoxPlotChartProps } from './FlatBoxPlotChart';

import { TRUES, FALSES, NULLS, INVALIDS } from '../Columns/constants';
import { checkColumnCategorical, containsDataSummary } from '../Columns/utils';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ReactNode } from 'react';
import { TopKSummaryList } from './TopKSummaryList';

/**
 * Handles logic for rendering the right charts
 * @param columnDatum
 * @param chartKindOverride an optional flag to override the default logic (e.g. auto categorizing generic types based on distinct)
 * @returns *Chart Component
 */
export function getDataChart(
  columnDatum?: ColumnSchema,
  chartKindOverride?: ChartKind,
) {
  const {
    samples = 0,
    type,
    schema_type,
    histogram,
    topk,
    trues,
    falses,
    nulls,
    invalids,
    valids,
    min,
    max,
  } = columnDatum || {};

  const chartKind = chartKindOverride || getChartKindByColumnType(columnDatum);

  //TopK dataset
  if (chartKind === 'topk' && topk) {
    return <TopKSummaryList topk={topk} valids={valids || 0} />;
  }

  //histogram dataset
  if (chartKind === 'histogram' && histogram && type) {
    const dynamicHistogramData =
      type !== 'string'
        ? columnDatum?.histogram
        : columnDatum?.histogram_length;
    //BUG: race-condition when time-series is used /w animation here
    return (
      <HistogramChart
        data={{ histogram: dynamicHistogramData, min, max, type, samples }}
      />
    );
  }
  //pie dataset
  if (
    chartKind === 'pie' &&
    isNumber(trues) &&
    isNumber(falses) &&
    isNumber(nulls) &&
    isNumber(invalids)
  ) {
    const counts = [trues, falses, nulls, invalids];
    const labels = [TRUES, FALSES, NULLS, INVALIDS].map(
      (v) => v.charAt(0) + v.slice(1).toLowerCase(),
    );
    const ratios = counts.map((v) => v / samples);
    return <BooleanPieChart data={{ counts, labels, ratios }} />;
  }
  return renderChartUnavailableMsg({ valids, schema_type });
}

export function getChartUnavailMsg(
  valids?: ColumnSchema['valids'],
  infinite?: boolean,
  schema_type?: ColumnSchema['schema_type'],
) {
  if (infinite) {
    return `Chart rendering unavailable for datasets have infinite values`;
  }

  return Boolean(valids)
    ? `Chart rendering unavailable for (type: ${schema_type})`
    : `There are insufficient valid data points in this dataset`;
}

export function renderChartUnavailableMsg({
  valids,
  infinite,
  schema_type,
  messageOverwrite,
}: {
  valids?: ColumnSchema['valids'];
  infinite?: boolean;
  schema_type?: ColumnSchema['schema_type'];
  messageOverwrite?: ReactNode;
}) {
  const noRenderMessage = getChartUnavailMsg(valids, infinite, schema_type);
  return (
    <Flex h={'inherit'} minH={'100%'} w={'100%'} fontStyle="italic">
      <Text textAlign={'left'} w={'inherit'} color={'gray.400'}>
        {messageOverwrite ?? noRenderMessage}
      </Text>
    </Flex>
  );
}

export function getBoxPlotKeyData({
  p25,
  p50,
  p75,
  max,
  min,
}: FlatBoxPlotChartProps['quantileData']) {
  return {
    min: Number(min),
    q1: Number(p25),
    mean: Number(p50),
    q3: Number(p75),
    max: Number(max),
  };
}

/**
 * Determines the chart kind suitable for column.type
 * @param columnDatum
 * @returns a string literal describing the chart kind
 */
export type ChartKind = 'topk' | 'histogram' | 'pie' | undefined;
export function getChartKindByColumnType(
  columnDatum?: ColumnSchema,
): ChartKind {
  if (!columnDatum) return;
  const { topk, histogram, trues, falses, type } = columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);
  const isPieKind = type === 'boolean' && isNumber(trues) && isNumber(falses);
  const isCategoryKind = topk && isCategorical;
  const isHistogramKind = containsDataSummary(type) && histogram;

  if (isPieKind) return 'pie';
  if (isCategoryKind) return 'topk';
  if (isHistogramKind) return 'histogram';
}

/**
 * Chart.js utility for skipped data points (null | NaN)
 * @param ctx
 * @param value
 */
export const skipped = (ctx, value) =>
  ctx.p0.skip || ctx.p1.skip ? value : undefined;

export type BMChartTypes =
  | 'line'
  | 'stacked-line'
  | 'y-bar'
  | 'stacked-y-bar'
  | 'x-bar'
  | 'stacked-x-bar';
