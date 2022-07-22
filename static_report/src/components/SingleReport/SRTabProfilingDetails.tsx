import { Flex, Grid, Divider, Text } from '@chakra-ui/react';
import { SRBarChart } from './SRBarChart';
import { SRTableColumnDetails } from './SRTableColumnDetails';
import type { TableSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
import { ColumnCard } from '../shared/ColumnCard';
import { nanoid } from 'nanoid';

interface Props {
  data: TableSchema['columns'];
}
export function SRTabProfilingDetails({ data }: Props) {
  return (
    //Layout Arrange: grid (expect 400x700); 16px even-spacing
    <Flex direction="row" gap={4}>
      {Object.keys(data).map((key) => {
        const column = data[key];
        ZColSchema.parse(column);

        const distribution = column.distribution;

        return (
          <ColumnCard key={nanoid()} columnDatum={column}>
            <Flex mt={8} justifyContent="center" alignItems="center">
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
            </Flex>
          </ColumnCard>
        );
      })}
    </Flex>
  );
}
