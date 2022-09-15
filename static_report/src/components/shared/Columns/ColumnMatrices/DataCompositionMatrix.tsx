import { Flex, Divider, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { MetricCell } from '../ColumnMetrics/MetricCell';
import { NULLS, INVALIDS } from '../constants';
import { getColumnMetricRatio } from '../utils';

type Props = { columnDatum: ColumnSchema; children?: ReactNode };
export function DataCompositionMatrix({ columnDatum, children }: Props) {
  const { nulls, invalids } = columnDatum;
  const invalidsOfTotal = getColumnMetricRatio('invalids', columnDatum);
  const nullsOfTotal = getColumnMetricRatio('nulls', columnDatum);

  return (
    <Flex direction={'column'}>
      <Text textAlign={'center'} fontWeight={'bold'} my={2}>
        Data Composition
      </Text>
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell
          metaKey="nulls"
          label={NULLS}
          value={formatColumnValueWith(nullsOfTotal, formatIntervalMinMax)}
          subvalue={nulls}
        />
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="invalids"
          label={INVALIDS}
          value={formatColumnValueWith(invalidsOfTotal, formatIntervalMinMax)}
          subvalue={invalids}
        />
        {children}
      </Flex>
    </Flex>
  );
}
