import { Divider, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { FALSES, TRUES, VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailBoolean: React.FC<Props> = ({ columnDatum }) => {
  const { trues, falses, valids } = columnDatum;
  const { validsOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="valids"
          label={VALIDS}
          value={formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
          subvalue={valids}
        />
      </DataCompositionMetrics>
      <Divider />
      <Text textAlign={'center'} fontWeight={'bold'} my={2}>
        Boolean Statistics
      </Text>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={TRUES}
          value={formatColumnValueWith(trues, formatNumber)}
          metaKey={'trues'}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={FALSES}
          value={formatColumnValueWith(falses, formatNumber)}
          metaKey={'falses'}
        />
      </Flex>
    </Flex>
  );
};
