import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { MetricCell } from '../../MetricCell';
import { QuantilesChart } from '../../QuantilesChart';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { StatisticalMetrics } from '../ColumnMetrics/StatisticalMetrics';
import { NEGATIVES, POSITIVES, ZEROS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailNumeric: React.FC<Props> = ({ columnDatum }) => {
  const { negatives, zeros, positives } = columnDatum;

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          label={NEGATIVES}
          value={formatColumnValueWith(negatives, formatNumber)}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={ZEROS}
          value={formatColumnValueWith(zeros, formatNumber)}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={POSITIVES}
          value={formatColumnValueWith(positives, formatNumber)}
        />
      </DataCompositionMetrics>
      <Divider />
      <Divider />
      <StatisticalMetrics columnDatum={columnDatum} />
      <Divider />
      <Flex mt={2}>
        <QuantilesChart columnDatum={columnDatum} />
      </Flex>
    </Flex>
  );
};
