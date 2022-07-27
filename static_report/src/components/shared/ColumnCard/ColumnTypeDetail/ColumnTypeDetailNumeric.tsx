import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { QuantilesChart } from '../../QuantilesChart';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailNumeric: React.FC<Props> = ({ columnDatum }) => {
  const { stddev, avg } = columnDatum;
  const { missing, invalids } = getColumnDetails(columnDatum);

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
          label={'INVALID'}
          value={formatColumnValueWith(invalids, formatIntervalMinMax)}
          subvalue={invalids}
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
      <Flex mt={2}>
        <QuantilesChart columnDatum={columnDatum} />
      </Flex>
    </Flex>
  );
};
