import { Flex, Divider } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { NULLS, TOTAL, INVALIDS } from '../ColumnTypeDetail/constants';

type Props = { columnDatum: ColumnSchema };
export function DataCompositionMetrics({ columnDatum }: Props) {
  const { total, nulls, invalids } = columnDatum;
  const { invalidsOfTotal, totalOfTotal } = getColumnDetails(columnDatum);

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
      <Divider orientation="vertical" />
      <MetricCell
        label={TOTAL}
        value={formatColumnValueWith(totalOfTotal, formatIntervalMinMax)}
        subvalue={total}
      />
    </Flex>
  );
}
