import { Flex, Text } from '@chakra-ui/react';
import isNumber from 'lodash/isNumber';
import { BooleanPieChart } from '../components/shared/Charts/BooleanPieChart';
import { CategoricalBarChart } from '../components/shared/Charts/CategoricalBarChart';
import { HistogramChart } from '../components/shared/Charts/HistogramChart';
import {
  TRUES,
  FALSES,
  NULLS,
  INVALIDS,
} from '../components/shared/Columns/constants';
import { ColumnSchema } from '../sdlc/single-report-schema';
import { ChartKind, getChartKindByColumnType } from './transformers';

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
    total,
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
        total={total || 0}
        animationOptions={hasAnimation ? {} : false}
      />
    );
  }
  //histogram dataset
  if (chartKind === 'histogram' && histogram && type) {
    //BUG: race-condition when time-series is used /w animation here
    return (
      <HistogramChart
        data={{ histogram, min, max, type, total }}
        animationOptions={false}
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
    const ratios = counts.map((v) => v / Number(total));
    return (
      <BooleanPieChart
        data={{ counts, labels, ratios }}
        animationOptions={hasAnimation ? {} : false}
      />
    );
  }
  return renderChartUnavailableMsg(valids, schema_type);
}

export function renderChartUnavailableMsg(
  valids?: ColumnSchema['valids'],
  schema_type?: ColumnSchema['schema_type'],
) {
  const noRenderMessage = Boolean(valids)
    ? `Chart rendering unavailable for (type: ${schema_type})`
    : `There are insufficient valid data points in this dataset`;
  return (
    <Flex
      h={'inherit'}
      minH={'100%'}
      alignItems={'center'}
      w={'100%'}
      bg={'blackAlpha.300'}
    >
      <Text alignSelf={'center'} textAlign={'center'} w={'inherit'}>
        {noRenderMessage}
      </Text>
    </Flex>
  );
}
