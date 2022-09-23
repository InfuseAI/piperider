import { Flex, Grid } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import {
  SaferTableSchema,
  Selectable,
  zReport,
  ZTableSchema,
} from '../../../types';
import { getDataChart } from '../Charts/utils';
import { transformAsNestedBaseTargetRecord } from '../../../utils/transformers';
import { ChartContainer } from '../Charts/ChartContainer';
import { ColumnStatsCard } from '../Columns/ColumnCards/ColumnStatsCard';

interface CRProfilingDetailsProps extends Selectable {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
}
export function CRColumnSummaryListWidget({
  baseTable,
  targetTable,
  onSelect,
}: CRProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const transformedData = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseTable?.columns, targetTable?.columns);
  const tableName = baseTable?.name || targetTable?.name;

  return (
    <>
      {Object.entries(transformedData).map(([key, { base, target }]) => {
        return (
          <Flex key={key} direction="column">
            <Grid
              my={8}
              templateColumns="1fr 2fr"
              gap={12}
              overflowX={'hidden'}
            >
              <ColumnStatsCard
                baseColumn={base}
                targetColumn={target}
                onSelect={({ columnName }) =>
                  onSelect({ columnName, tableName })
                }
              />

              <Flex my={4} alignItems={'center'}>
                <ChartContainer height={350}>
                  {getDataChart(base)}
                </ChartContainer>
                <ChartContainer height={350}>
                  {getDataChart(target, base)}
                </ChartContainer>
              </Flex>
            </Grid>
          </Flex>
        );
      })}
    </>
  );
}
