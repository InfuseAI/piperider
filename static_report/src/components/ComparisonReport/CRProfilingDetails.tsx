import { Flex, Grid } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { SaferTableSchema, zReport, ZTableSchema } from '../../types';
import { getDataChart } from '../../utils/charts';
import { transformAsNestedBaseTargetRecord } from '../../utils/transformers';
import { ColumnCardDataVisualContainer } from '../shared/Columns/ColumnCard/ColumnCardDataVisualContainer';
import { CRColumnDetailsCard } from './CRColumnDetailsCard';

type CRProfilingDetailsProps = {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
};
export function CRProfilingDetails({
  baseTable,
  targetTable,
}: CRProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  // eslint-disable-next-line
  const [location, setLocation] = useLocation();
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
              <CRColumnDetailsCard
                baseColumn={base}
                targetColumn={target}
                onSelect={({ columnName }) =>
                  setLocation(`/tables/${tableName}/columns/${columnName}`)
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
