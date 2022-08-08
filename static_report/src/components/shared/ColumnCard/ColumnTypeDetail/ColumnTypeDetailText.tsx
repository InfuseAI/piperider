import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { StatisticalMetrics } from '../ColumnMetrics/StatisticalMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { ZEROLENGTH } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const { zero_length } = columnDatum;
  const { zeroLengthOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          metaKey={'zero_length'}
          label={ZEROLENGTH}
          value={formatColumnValueWith(zeroLengthOfTotal, formatIntervalMinMax)}
          subvalue={zero_length}
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
