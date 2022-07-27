import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatModeMetrics,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DISTINCTS, MODE, NULLS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailCategorical: React.FC<Props> = ({
  columnDatum,
}) => {
  const { nulls, distinct } = columnDatum;
  const { distinctOfTotal } = getColumnDetails(columnDatum);

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
        <MetricCell label={MODE} value={formatModeMetrics(columnDatum)} />
      </Flex>
    </Flex>
  );
};
