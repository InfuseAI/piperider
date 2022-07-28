import { Flex, Divider } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { NULLS, INVALIDS } from '../ColumnTypeDetail/constants';

type Props = { columnDatum: ColumnSchema; children?: ReactNode };
export function DataCompositionMetrics({ columnDatum, children }: Props) {
  const { nulls, invalids } = columnDatum;
  const { invalidsOfTotal } = getColumnDetails(columnDatum);

  return (
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
      {children}
    </Flex>
  );
}
