import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatModeMetrics,
} from '../../../../utils/formatters';
import { MetricCell } from '../../MetricCell';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailBoolean: React.FC<Props> = ({ columnDatum }) => {
  const { total, nulls } = columnDatum;

  return (
    <Flex direction={'column'}>
      <MetricCell
        label={'NULLS'}
        value={formatColumnValueWith(nulls, formatIntervalMinMax)}
        subvalue={nulls}
      />
      <Divider />
      {/* FIXME: Change to correct categorical count */}
      <MetricCell label={'TOTAL CATEGORIES'} value={total} />
      <MetricCell
        label={'MOST COMMON'}
        value={formatModeMetrics(columnDatum)}
      />
    </Flex>
  );
};
