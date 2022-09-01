import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnMetricRatio } from '../../../../utils/transformers';
import { MetricCell } from '../../ColumnMetrics/MetricCell';
import { DataCompositionMatrix } from '../ColumnMatrices/DataCompositionMatrix';
import { StatisticalMatrix } from '../ColumnMatrices/StatisticalMatrix';
import { UniquenessMetrics } from '../ColumnMatrices/UniquenessMatrix';
import { ZEROLENGTH } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const { zero_length } = columnDatum;
  const zeroLengthOfTotal = getColumnMetricRatio('zero_length', columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMatrix columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          metaKey={'zero_length'}
          label={ZEROLENGTH}
          value={formatColumnValueWith(zeroLengthOfTotal, formatIntervalMinMax)}
          subvalue={zero_length}
        />
      </DataCompositionMatrix>
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <StatisticalMatrix columnDatum={columnDatum} />
      <Divider />
      <Flex justify={'space-evenly'}></Flex>
    </Flex>
  );
};
