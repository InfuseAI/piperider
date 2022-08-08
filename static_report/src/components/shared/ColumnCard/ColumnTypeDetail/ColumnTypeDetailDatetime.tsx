import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { StatisticalMetrics } from '../ColumnMetrics/StatisticalMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailDatetime: React.FC<Props> = ({ columnDatum }) => {
  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum} />
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <StatisticalMetrics columnDatum={columnDatum} />
    </Flex>
  );
};
