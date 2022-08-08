import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { QuantilesChart } from '../../QuantilesChart';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { StatisticalMetrics } from '../ColumnMetrics/StatisticalMetrics';
import { NEGATIVES, ZEROS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailNumeric: React.FC<Props> = ({ columnDatum }) => {
  const { negatives, zeros } = columnDatum;
  const { negativesOfTotal, zerosOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="negatives"
          label={NEGATIVES}
          value={formatColumnValueWith(negativesOfTotal, formatIntervalMinMax)}
          subvalue={negatives}
        />
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="zeros"
          label={ZEROS}
          value={formatColumnValueWith(zerosOfTotal, formatIntervalMinMax)}
          subvalue={zeros}
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
