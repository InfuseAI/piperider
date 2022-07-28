import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { START, END } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailDatetime: React.FC<Props> = ({ columnDatum }) => {
  const { min, max } = columnDatum;

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum} />
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell label={START} value={min} />
        <Divider orientation="vertical" />
        <MetricCell label={END} value={max} />
      </Flex>
    </Flex>
  );
};
