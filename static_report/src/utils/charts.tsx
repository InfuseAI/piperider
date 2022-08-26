import { Flex, Text } from '@chakra-ui/react';
import { BooleanPieChart } from '../components/shared/Charts/BooleanPieChart';
import { CategoricalBarChart } from '../components/shared/Charts/CategoricalBarChart';
import { HistogramChart } from '../components/shared/Charts/HistogramChart';
import {
  TRUES,
  FALSES,
  NULLS,
  INVALIDS,
} from '../components/shared/ColumnCard/ColumnTypeDetail/constants';
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
  columnDatum: ColumnSchema,
  baseColumnRef?: ColumnSchema,
  chartKindOverride?: ChartKind,
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
  } = columnDatum;

  const hasSameTypeName =
    type === baseColumnRef?.type && name === baseColumnRef?.name;

  const chartKind =
    chartKindOverride ||
    getChartKindByColumnType(hasSameTypeName ? baseColumnRef : columnDatum);

  //TopK dataset
  if (chartKind === 'topk' && topk) {
    return <CategoricalBarChart data={topk} total={total || 0} />;
  }
  //histogram dataset
  if (chartKind === 'histogram' && histogram) {
    return <HistogramChart data={{ histogram, min, max, type, total }} />;
  }
  //pie dataset
  if (chartKind === 'pie') {
    const counts = [trues, falses, nulls, invalids].map((v) => (v ? v : 0));
    const labels = [TRUES, FALSES, NULLS, INVALIDS].map(
      (v) => v.charAt(0) + v.slice(1).toLowerCase(),
    );
    const ratios = counts.map((v) => v / Number(total));
    return <BooleanPieChart data={{ counts, labels, ratios }} />;
  }

  const noRenderMessage = Boolean(valids)
    ? `Chart rendering unavailable for (type: ${schema_type})`
    : `There are insufficient valid data points in this dataset`;
  return (
    <Flex h={230} alignItems={'center'} w={'100%'}>
      <Text textAlign={'center'} w={'inherit'}>
        {noRenderMessage}
      </Text>
    </Flex>
  );
}
