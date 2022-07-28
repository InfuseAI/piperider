import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { StatisticalMetrics } from '../ColumnMetrics/StatisticalMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { NONZEROLENGTH, ZEROLENGTH } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const { non_zero_length, zero_length } = columnDatum;

  console.log(columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          label={NONZEROLENGTH}
          value={formatColumnValueWith(non_zero_length, formatNumber)}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={ZEROLENGTH}
          value={formatColumnValueWith(zero_length, formatNumber)}
        />
      </DataCompositionMetrics>
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <StatisticalMetrics columnDatum={columnDatum} />
      <Divider />
      <Flex justify={'space-evenly'}></Flex>
    </Flex>
  );
};
