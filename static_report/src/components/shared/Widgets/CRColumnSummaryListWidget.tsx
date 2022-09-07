import { Flex, Grid } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import {
  SaferTableSchema,
  Selectable,
  zReport,
  ZTableSchema,
} from '../../../types';
import { getDataChart } from '../../../utils/charts';
import { transformAsNestedBaseTargetRecord } from '../../../utils/transformers';
import { ColumnCardDataVisualContainer } from '../Columns/ColumnCard/ColumnCardDataVisualContainer';
import { ColumnStatsCard } from '../Columns/ColumnCard/ColumnStatsCard';

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
                <ColumnCardDataVisualContainer height={350}>
                  {getDataChart(base)}
                </ColumnCardDataVisualContainer>
                <ColumnCardDataVisualContainer height={350}>
                  {getDataChart(target, base)}
                </ColumnCardDataVisualContainer>
              </Flex>
            </Grid>
          </Flex>
        );
      })}
    </>
  );
}
