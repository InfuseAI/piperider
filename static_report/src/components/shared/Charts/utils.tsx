import { Flex, Text } from '@chakra-ui/react';
import isNumber from 'lodash/isNumber';

import { BooleanPieChart } from './BooleanPieChart';
import { CategoricalBarChart } from './CategoricalBarChart';
import { HistogramChart } from './HistogramChart';
import { FlatBoxPlotChartProps } from './FlatBoxPlotChart';

import { TRUES, FALSES, NULLS, INVALIDS } from '../Columns/constants';
import { checkColumnCategorical, containsDataSummary } from '../Columns/utils';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ReactNode } from 'react';

/**
 * Handles logic for rendering the right charts
 * @param columnDatum
 * @param baseColumnRef an optional column reference for comparing `target` against `base` columns, to ensure that the chart kind is consistent across comparisons members
 * @param chartKindOverride an optional flag to override the default logic (e.g. auto categorizing generic types based on distinct)
 * @returns *Chart Component
 */
export function getDataChart(
  columnDatum?: ColumnSchema,
  baseColumnRef?: ColumnSchema,
  chartKindOverride?: ChartKind,
  hasAnimation?: boolean,
) {
  const {
    samples,
    name,
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
    total,
  } = columnDatum || {};

  const hasSameTypeName =
    type === baseColumnRef?.type && name === baseColumnRef?.name;

  const chartKind =
    chartKindOverride ||
    getChartKindByColumnType(hasSameTypeName ? baseColumnRef : columnDatum);

  //TopK dataset
  if (chartKind === 'topk' && topk) {
    return (
      <CategoricalBarChart
        data={topk}
        total={samples || total || 0}
        animation={hasAnimation ? {} : false}
      />
    );
  }
  //histogram dataset
  if (chartKind === 'histogram' && histogram && type) {
    //BUG: race-condition when time-series is used /w animation here
    return <HistogramChart data={{ histogram, min, max, type, samples }} />;
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
    const ratios = counts.map((v) => v / Number(samples));
    return (
      <BooleanPieChart
        data={{ counts, labels, ratios }}
        animation={hasAnimation ? {} : false}
      />
    );
  }
  return renderChartUnavailableMsg({ valids, schema_type });
}

export function getChartUnavailMsg(
  valids?: ColumnSchema['valids'],
  schema_type?: ColumnSchema['schema_type'],
) {
  return Boolean(valids)
    ? `Chart rendering unavailable for (type: ${schema_type})`
    : `There are insufficient valid data points in this dataset`;
}

export function renderChartUnavailableMsg({
  valids,
  schema_type,
  messageOverwrite,
}: {
  valids?: ColumnSchema['valids'];
  schema_type?: ColumnSchema['schema_type'];
  messageOverwrite?: ReactNode;
}) {
  const noRenderMessage = getChartUnavailMsg(valids, schema_type);
  return (
    <Flex
      h={'inherit'}
      minH={'100%'}
      alignItems={'center'}
      w={'100%'}
      bg={'blackAlpha.300'}
    >
      <Text alignSelf={'center'} textAlign={'center'} w={'inherit'}>
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
