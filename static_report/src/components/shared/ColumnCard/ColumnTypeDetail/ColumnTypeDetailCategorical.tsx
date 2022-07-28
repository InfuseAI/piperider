import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatModeMetrics,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { MODE, VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailCategorical: React.FC<Props> = ({
  columnDatum,
}) => {
  const { validsOfTotal } = getColumnDetails(columnDatum);
  const { valids } = columnDatum;
  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          label={VALIDS}
          value={formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
          subvalue={valids}
        />
      </DataCompositionMetrics>
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell label={MODE} value={formatModeMetrics(columnDatum)} />
      </Flex>
    </Flex>
  );
};
