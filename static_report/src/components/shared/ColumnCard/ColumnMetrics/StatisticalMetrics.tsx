import { Flex, Divider, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { checkColumnCategorical } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import {
  AVG,
  MAX,
  MIN,
  STDDEV,
  PLUSMINUS,
} from '../ColumnTypeDetail/constants';

type Props = { columnDatum: ColumnSchema };
export function StatisticalMetrics({ columnDatum }: Props) {
  const { avg, stddev, min, max, type } = columnDatum;

  const isTextType = type === 'string';
  const isCategorical = checkColumnCategorical(columnDatum);
  const titleNoun = isTextType && !isCategorical ? 'Length' : 'Data';

  return (
    <Flex direction={'column'}>
      <Text textAlign={'center'} fontWeight={'bold'} my={2}>
        {titleNoun} Statistics
      </Text>
      <Divider />
      {avg && (
        <Flex justify={'space-evenly'}>
          <MetricCell
            metaKey="avg"
            label={AVG}
            value={formatColumnValueWith(avg, formatNumber)}
          />
          <Divider orientation="vertical" />
          <MetricCell
            metaKey="stddev"
            label={STDDEV}
            value={PLUSMINUS + formatColumnValueWith(stddev, formatNumber)}
          />
          <Divider orientation="vertical" />
        </Flex>
      )}
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          metaKey="min"
          label={MIN}
          value={formatColumnValueWith(min, formatNumber)}
        />
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="max"
          label={MAX}
          value={formatColumnValueWith(max, formatNumber)}
        />
      </Flex>
    </Flex>
  );
}
