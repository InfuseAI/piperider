import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { BOOLEANCOUNT, FALSES, INVALIDS, NULLS, TRUES } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailBoolean: React.FC<Props> = ({ columnDatum }) => {
  const { nulls, trues, falses, invalids } = columnDatum;
  const { invalidsOfTotal } = getColumnDetails(columnDatum);

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
          label={INVALIDS}
          value={formatColumnValueWith(invalidsOfTotal, formatIntervalMinMax)}
          subvalue={invalids}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={TRUES}
          value={formatColumnValueWith(trues, formatNumber)}
          subvalue={BOOLEANCOUNT}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={FALSES}
          value={formatColumnValueWith(falses, formatNumber)}
          subvalue={BOOLEANCOUNT}
        />
      </Flex>
    </Flex>
  );
};
