import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { formatModeMetrics } from '../../../../utils/formatters';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { MODE } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailCategorical: React.FC<Props> = ({
  columnDatum,
}) => {
  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum} />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <Flex justify={'space-evenly'}>
        <MetricCell label={MODE} value={formatModeMetrics(columnDatum)} />
      </Flex>
    </Flex>
  );
};
