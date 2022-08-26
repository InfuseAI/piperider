import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { MetricCell } from '../../ColumnMetrics/MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { FALSES, TRUES } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailBoolean: React.FC<Props> = ({ columnDatum }) => {
  const { trues, falses } = columnDatum;

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          label={FALSES}
          value={formatColumnValueWith(falses, formatNumber)}
          metaKey={'falses'}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={TRUES}
          value={formatColumnValueWith(trues, formatNumber)}
          metaKey={'trues'}
        />
      </DataCompositionMetrics>
      <Divider />
    </Flex>
  );
};
