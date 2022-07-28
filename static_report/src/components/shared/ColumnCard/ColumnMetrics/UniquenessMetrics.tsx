import { Flex, Divider } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DISTINCTS, DUPLICATES } from '../ColumnTypeDetail/constants';

type Props = { columnDatum: ColumnSchema };
export function UniquenessMetrics({ columnDatum }: Props) {
  const { distinct, duplicates } = columnDatum;
  const { distinctOfTotal, duplicatesOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex justify={'space-evenly'}>
      <MetricCell
        label={DISTINCTS}
        value={formatColumnValueWith(distinctOfTotal, formatIntervalMinMax)}
        subvalue={distinct}
      />
      <Divider orientation="vertical" />
      <MetricCell
        label={DUPLICATES}
        value={formatColumnValueWith(duplicatesOfTotal, formatIntervalMinMax)}
        subvalue={duplicates}
      />
    </Flex>
  );
}
