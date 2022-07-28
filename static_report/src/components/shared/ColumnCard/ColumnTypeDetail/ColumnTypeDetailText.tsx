import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import {
  AVG,
  DISTINCTS,
  MAX,
  MIN,
  NONZEROLENGTH,
  NULLS,
  STDDEV,
  TEXTCOUNT,
  TEXTLENGTH,
  ZEROLENGTH,
} from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailText: React.FC<Props> = ({ columnDatum }) => {
  const {
    distinct,
    nulls,
    stddev,
    avg,
    non_zero_length,
    zero_length,
    min,
    max,
  } = columnDatum;
  const { distinctOfTotal } = getColumnDetails(columnDatum);
  console.log(columnDatum);

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
          subvalue={TEXTLENGTH}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={STDDEV}
          value={formatColumnValueWith(stddev, formatNumber)}
          subvalue={TEXTLENGTH}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={MIN}
          value={formatColumnValueWith(min, formatNumber)}
          subvalue={TEXTLENGTH}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={MAX}
          value={formatColumnValueWith(max, formatNumber)}
          subvalue={TEXTLENGTH}
        />
      </Flex>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={NONZEROLENGTH}
          value={formatColumnValueWith(non_zero_length, formatNumber)}
          subvalue={TEXTCOUNT}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={ZEROLENGTH}
          value={formatColumnValueWith(zero_length, formatNumber)}
          subvalue={TEXTCOUNT}
        />
      </Flex>
    </Flex>
  );
};
