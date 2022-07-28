import { Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import { SRBarChart } from '../../SingleReport/SRBarChart';
import { ColumnCardBodyContainer } from './ColumnCardBodyContainer';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisualContainer';
import { ColumnCardHeader } from './ColumnCardHeader';
import { ColumnTypeDetailBoolean } from './ColumnTypeDetail/ColumnTypeDetailBoolean';
import { ColumnTypeDetailCategorical } from './ColumnTypeDetail/ColumnTypeDetailCategorical';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailText } from './ColumnTypeDetail/ColumnTypeDetailText';

interface Props {
  columnDatum: ColumnSchema;
}
export function ColumnCard({ columnDatum }: Props) {
  ZColSchema.parse(columnDatum);
  const { name: title, description } = columnDatum;

  return (
    <Flex
      direction={'column'}
      bg={'gray.300'}
      width="400px"
      h={[700]}
      my={3}
      rounded={'lg'}
      overflowX={'hidden'}
    >
      <ColumnCardHeader title={title} description={description} />
      <ColumnCardDataVisualContainer title={title}>
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
  const { topk, histogram, distinct, type } = columnDatum;

  const isCategorical =
    distinct <= 100 && (type === 'string' || type === 'integer'); //this is arbitrary
  const chartData = isCategorical ? topk?.values : histogram.labels;
  const valueCounts = isCategorical ? topk?.counts : histogram.counts;

  // isCategorical && console.log('CATEGORICAL', columnDatum);
  // !isCategorical && console.log('NONCATEGORICAL', columnDatum);

  return chartData ? (
    <>
      {/* <h1>{isCategorical ? 'Category' : 'Non-Category'}</h1> */}
      <SRBarChart
        data={chartData.map((label, i) => ({
          label,
          value: valueCounts[i],
          total: columnDatum.total,
        }))}
      />
    </>
  ) : (
    <Text>No data available</Text>
  );
}

/**
 * Handles the logic for rendering the right Column Details
 * @param columnDatum
 * @returns ColumnTypeDetail* Component
 */
function _getColumnBodyContentUI(columnDatum: ColumnSchema) {
  const { type, distinct } = columnDatum;
  const isCategorical = distinct <= 100; //this is arbitrary
  if (type === 'boolean')
    return <ColumnTypeDetailBoolean columnDatum={columnDatum} />;

  if (type === 'string' && !isCategorical)
    return <ColumnTypeDetailText columnDatum={columnDatum} />;

  if (type === 'datetime')
    return <ColumnTypeDetailDatetime columnDatum={columnDatum} />;

  if ((type === 'string' || type === 'integer') && isCategorical)
    return <ColumnTypeDetailCategorical columnDatum={columnDatum} />;

  if (type === 'numeric' || (type === 'integer' && !isCategorical))
    return <ColumnTypeDetailNumeric columnDatum={columnDatum} />;

  return <Text>The column type: {type} cannot be displayed</Text>;
}
