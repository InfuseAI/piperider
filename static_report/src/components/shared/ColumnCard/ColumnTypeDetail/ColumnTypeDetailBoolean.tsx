import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  getSRModeMetrics,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailBoolean: React.FC<Props> = ({ columnDatum }) => {
  const { missing, total } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <MetricCell
        label={'MISSING'}
        value={formatColumnValueWith(missing, formatIntervalMinMax)}
        subvalue={missing}
      />
      <Divider />
      {/* FIXME: Change to correct categorical count */}
      <MetricCell label={'TOTAL CATEGORIES'} value={total} />
      <MetricCell label={'MOST COMMON'} value={getSRModeMetrics(columnDatum)} />
    </Flex>
  );
};
