import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { AVG, DISTINCTS, NULLS, STDDEV } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const { distinct, nulls, stddev, avg } = columnDatum;
  const { distinctOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={NULLS}
          value={formatColumnValueWith(nulls, formatIntervalMinMax)}
          subvalue={nulls}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={DISTINCTS}
          value={formatColumnValueWith(distinctOfTotal, formatIntervalMinMax)}
          subvalue={distinct}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={AVG}
          value={formatColumnValueWith(avg, formatNumber)}
          subvalue={'Text Length'}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={STDDEV}
          value={formatColumnValueWith(stddev, formatNumber)}
          subvalue={'Text Length'}
        />
      </Flex>
    </Flex>
  );
};
