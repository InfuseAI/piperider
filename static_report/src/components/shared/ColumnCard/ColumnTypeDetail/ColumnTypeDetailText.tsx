import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const { distinct, invalids, valids, nulls, stddev, avg } = columnDatum;
  const { distinctOfTotal, invalidsOfTotal, validsOfTotal } =
    getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={'NULLS'}
          value={formatColumnValueWith(nulls, formatIntervalMinMax)}
          subvalue={nulls}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={'DISTINCT'}
          value={formatColumnValueWith(distinctOfTotal, formatIntervalMinMax)}
          subvalue={distinct}
        />
      </Flex>
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={'VALID'}
          value={formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
          subvalue={valids}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={'INVALID'}
          value={formatColumnValueWith(invalidsOfTotal, formatIntervalMinMax)}
          subvalue={invalids}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={'AVERAGE'}
          value={formatColumnValueWith(avg, formatNumber)}
          subvalue={'Text Length'}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={'STANDARD DEVIATION'}
          value={formatColumnValueWith(stddev, formatNumber)}
          subvalue={'Text Length'}
        />
      </Flex>
    </Flex>
  );
};
