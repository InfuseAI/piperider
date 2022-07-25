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
export const ColumnTypeDetailNumeric: React.FC<Props> = ({ columnDatum }) => {
  const { stddev, avg } = columnDatum;
  const { missing, mismatch } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={'MISSING'}
          value={formatColumnValueWith(missing, formatIntervalMinMax)}
          subvalue={missing}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={'MISMATCHED'}
          value={formatColumnValueWith(mismatch, formatIntervalMinMax)}
          subvalue={mismatch}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={'AVERAGE'}
          value={formatColumnValueWith(avg, formatNumber)}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={'STD DEVIATION'}
          value={formatColumnValueWith(stddev, formatNumber)}
        />
      </Flex>
      <Divider />
      {/* TODO: Add Quantiles chart here */}
    </Flex>
  );
};
