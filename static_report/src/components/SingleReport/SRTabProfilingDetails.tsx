import { Flex, Text } from '@chakra-ui/react';
import { SRBarChart } from './SRBarChart';
import type { TableSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
import { ColumnCard } from '../shared/ColumnCard';
import { nanoid } from 'nanoid';

interface Props {
  data: TableSchema['columns'];
}
export function SRTabProfilingDetails({ data }: Props) {
  return (
    <Flex direction="row" flexWrap={'wrap'} gap={4} justify={'center'}>
      {Object.keys(data).map((key) => {
        const column = data[key];
        ZColSchema.parse(column);

        const distribution = column.distribution;

        return (
          <ColumnCard key={nanoid()} columnDatum={column}>
            {distribution ? (
              <SRBarChart
                data={distribution.labels.map((label, i) => ({
                  label,
                  value: distribution.counts[i],
                  total: column.total,
                }))}
              />
            ) : (
              <Text>No data available</Text>
            )}
          </ColumnCard>
        );
      })}
    </Flex>
  );
}
