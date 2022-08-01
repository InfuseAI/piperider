import { Flex, Divider, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { MetricCell } from '../../MetricCell';
import {
  AVG,
  MAX,
  MIN,
  STDDEV,
  TEXTLENGTH,
  PLUSMINUS,
} from '../ColumnTypeDetail/constants';

type Props = { columnDatum: ColumnSchema };
export function StatisticalMetrics({ columnDatum }: Props) {
  const { avg, stddev, min, max } = columnDatum;

  const isTextType = columnDatum.type === 'string';
  const subvalue = isTextType ? TEXTLENGTH : '';

  return (
    <Flex direction={'column'}>
      <Text textAlign={'center'} fontWeight={'bold'} my={2}>
        General Statistics
      </Text>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={AVG}
          value={formatColumnValueWith(avg, formatNumber)}
          subvalue={subvalue}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={STDDEV}
          value={PLUSMINUS + formatColumnValueWith(stddev, formatNumber)}
          subvalue={subvalue}
        />
        <Divider orientation="vertical" />
      </Flex>
      <Divider />
      {/* Maybe hide when typeof numerical? */}
      <Flex justify={'space-evenly'}>
        <MetricCell
          label={MIN}
          value={formatColumnValueWith(min, formatNumber)}
          subvalue={subvalue}
        />
        <Divider orientation="vertical" />
        <MetricCell
          label={MAX}
          value={formatColumnValueWith(max, formatNumber)}
          subvalue={subvalue}
        />
      </Flex>
    </Flex>
  );
}
