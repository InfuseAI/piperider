import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnMetricRatio } from '../../../../utils/transformers';
import { MetricCell } from '../../ColumnMetrics/MetricCell';
import { QuantilesMatrix } from '../../ColumnMetrics/QuantilesMatrix';
import { DataCompositionMatrix } from '../ColumnMatrices/DataCompositionMatrix';
import { StatisticalMatrix } from '../ColumnMatrices/StatisticalMatrix';
import { NEGATIVES, ZEROS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailNumeric: React.FC<Props> = ({ columnDatum }) => {
  const { negatives, zeros } = columnDatum;
  const negativesOfTotal = getColumnMetricRatio('negatives', columnDatum);
  const zerosOfTotal = getColumnMetricRatio('zeros', columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMatrix columnDatum={columnDatum}>
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
      </DataCompositionMatrix>
      <Divider />
      <Divider />
      <StatisticalMatrix columnDatum={columnDatum} />
      <Divider />
      <Flex mt={2}>
        <QuantilesMatrix columnDatum={columnDatum} />
      </Flex>
    </Flex>
  );
};
