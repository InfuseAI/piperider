import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailDatetime: React.FC<Props> = ({ columnDatum }) => {
  const { min, max } = columnDatum;
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
        <MetricCell label={'START'} value={min} />
        <Divider orientation="vertical" />
        <MetricCell label={'END'} value={max} />
      </Flex>
    </Flex>
  );
};
