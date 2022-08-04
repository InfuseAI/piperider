import { Flex, Grid, Divider, Text } from '@chakra-ui/react';
import { SRBarChart } from './SRBarChart';
import { SRTableColumnDetails } from './SRTableColumnDetails';
import type { TableSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';

interface Props {
  data: TableSchema['columns'];
}
export function SRTabProfilingDetails({ data }: Props) {
  return (
    <Flex direction="column" gap={4}>
      {Object.keys(data).map((key) => {
        const column = data[key];
        zReport(ZColSchema.safeParse(column));

        const distribution = column.distribution;

        return (
          <Flex key={key} direction="column" px={4}>
            <Grid my={4} templateColumns="minmax(270px, 1fr) 1fr" gap={12}>
              <SRTableColumnDetails column={column} />
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
            </Grid>

            <Divider my={4} />
          </Flex>
        );
      })}
    </Flex>
  );
}
