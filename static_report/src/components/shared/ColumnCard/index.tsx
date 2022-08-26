import { Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'wouter';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import {
  checkColumnCategorical,
  getChartKindByColumnType,
} from '../../../utils/transformers';
import { BooleanPieChart } from '../Charts/BooleanPieChart';
import { CategoricalBarChart } from '../Charts/CategoricalBarChart';
import { HistogramChart } from '../Charts/HistogramChart';
import { ColumnCardBodyContainer } from './ColumnCardBodyContainer';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisualContainer';
import { ColumnCardHeader } from './ColumnCardHeader';
import { ColumnTypeDetailBoolean } from './ColumnTypeDetail/ColumnTypeDetailBoolean';
import { ColumnTypeDetailCategorical } from './ColumnTypeDetail/ColumnTypeDetailCategorical';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailOther } from './ColumnTypeDetail/ColumnTypeDetailOther';
import { ColumnTypeDetailText } from './ColumnTypeDetail/ColumnTypeDetailText';
import { FALSES, INVALIDS, NULLS, TRUES } from './ColumnTypeDetail/constants';

interface Props {
  columnDatum: ColumnSchema;
}
export function ColumnCard({ columnDatum }: Props) {
  ZColSchema.parse(columnDatum);
  const { name: title } = columnDatum;
  const [parentLocation] = useLocation();

  return (
    <Flex
      direction={'column'}
      bg={'gray.300'}
      width={{ xl: '32%', lg: '45%', md: '100%', base: '100%' }}
      border="1px solid"
      borderColor={'gray.300'}
      my={3}
      rounded={'lg'}
    >
      <ColumnCardHeader columnDatum={columnDatum} />
      <ColumnCardDataVisualContainer
        title={title}
        allowModalPopup={Boolean(getChartKindByColumnType(columnDatum))}
      >
        {getDataChart(columnDatum)}
      </ColumnCardDataVisualContainer>
      <ColumnCardBodyContainer>
        {_getColumnBodyContentUI(columnDatum)}
      </ColumnCardBodyContainer>
      <Flex justifyContent={'center'} p={3}>
        <Link href={`${parentLocation}/columns/${title}`}>
          <Text as={'a'} color="gray.700">
            Details
          </Text>
        </Link>
      </Flex>
    </Flex>
  );
}

/**
 * Handles logic for rendering the right charts
 * @param columnDatum
 * @param baseColumnRef an optional column reference for comparing `target` against `base` columns, to ensure that the chart kind is consistent across comparisons members
 * @returns *Chart Component
 */
export function getDataChart(
  columnDatum: ColumnSchema,
  baseColumnRef?: ColumnSchema,
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

  //FIXME: Override flag?
  const chartKind = getChartKindByColumnType(
    hasSameTypeName ? baseColumnRef : columnDatum,
  );

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

/**
 * Handles the logic for rendering the right Column Details
 * @param columnDatum
 * @returns ColumnTypeDetail* Component
 */
function _getColumnBodyContentUI(columnDatum: ColumnSchema) {
  const { type } = columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);

  if ((type === 'string' || type === 'integer') && isCategorical)
    return <ColumnTypeDetailCategorical columnDatum={columnDatum} />;
  if (type === 'numeric' || type === 'integer')
    return <ColumnTypeDetailNumeric columnDatum={columnDatum} />;
  if (type === 'boolean')
    return <ColumnTypeDetailBoolean columnDatum={columnDatum} />;
  if (type === 'string')
    return <ColumnTypeDetailText columnDatum={columnDatum} />;
  if (type === 'datetime')
    return <ColumnTypeDetailDatetime columnDatum={columnDatum} />;
  if (type === 'other')
    return <ColumnTypeDetailOther columnDatum={columnDatum} />;

  return (
    <Text textAlign={'center'} w={'inherit'}>
      The column type: {type} cannot be displayed
    </Text>
  );
}
