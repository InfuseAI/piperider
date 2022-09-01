import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { DataCompositionMatrix } from '../ColumnMatrices/DataCompositionMatrix';
import { StatisticalMatrix } from '../ColumnMatrices/StatisticalMatrix';
import { UniquenessMetrics } from '../ColumnMatrices/UniquenessMatrix';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailDatetime: React.FC<Props> = ({ columnDatum }) => {
  return (
    <Flex direction={'column'}>
      <DataCompositionMatrix columnDatum={columnDatum} />
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      <StatisticalMatrix columnDatum={columnDatum} />
    </Flex>
  );
};
