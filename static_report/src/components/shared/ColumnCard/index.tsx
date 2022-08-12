import { Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import {
  checkColumnCategorical,
  getColumnTypeChartData,
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

  return (
    <Flex
      direction={'column'}
      bg={'gray.300'}
      width={{ xl: '32%', lg: '45%', md: '100%', base: '100%' }}
      border="1px solid"
      borderColor={'gray.300'}
      h={[700]}
      my={3}
      rounded={'lg'}
      overflowX={'hidden'}
    >
      <ColumnCardHeader columnDatum={columnDatum} />
      <ColumnCardDataVisualContainer
        title={title}
        allowModalPopup={Boolean(getColumnTypeChartData(columnDatum))}
      >
        {_getDataChart(columnDatum)}
      </ColumnCardDataVisualContainer>
      <ColumnCardBodyContainer>
        {_getColumnBodyContentUI(columnDatum)}
      </ColumnCardBodyContainer>
    </Flex>
  );
}

/**
 * Handles logic for rendering the right charts
 * @param columnDatum
 * @returns *Chart Component
 */
function _getDataChart(columnDatum: ColumnSchema) {
  const { total, type, histogram, topk, trues, falses, nulls, invalids } =
    columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);

  if ((type === 'string' || type === 'integer') && topk && isCategorical) {
    return <CategoricalBarChart data={topk} total={total || 0} />;
  }
  if (
    (type === 'numeric' ||
      type === 'integer' ||
      type === 'string' ||
      type === 'datetime') &&
    histogram
  ) {
    return <HistogramChart data={histogram} type={type} total={total ?? 0} />;
  }
  if (type === 'boolean') {
    const counts = [trues, falses, nulls, invalids].map((v) => (v ? v : 0));
    const labels = [TRUES, FALSES, NULLS, INVALIDS].map(
      (v) => v.charAt(0) + v.slice(1).toLowerCase(),
    );
    const ratios = counts.map((v) => v / Number(total));
    return <BooleanPieChart data={{ counts, labels, ratios }} />;
  }

  return (
    <Flex h={230} alignItems={'center'} w={'100%'}>
      <Text textAlign={'center'} w={'inherit'}>
        No data available
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
