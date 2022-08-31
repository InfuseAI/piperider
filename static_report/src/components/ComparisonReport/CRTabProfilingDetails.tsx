import { Flex, Grid } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { SaferTableSchema, zReport, ZTableSchema } from '../../types';
import { getDataChart } from '../../utils/charts';
import { transformAsNestedBaseTargetRecord } from '../../utils/transformers';
import { ColumnCardDataVisualContainer } from '../shared/ColumnCard/ColumnCardDataVisualContainer';
import { CRTableColumnDetails } from './CRTableColumnDetails';

type CRTabProfilingDetailsProps = {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
};
export function CRTabProfilingDetails({
  baseTable,
  targetTable,
}: CRTabProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const transformedData = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseTable?.columns, targetTable?.columns);

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CRProfilingColumn
            key={key}
            name={key}
            base={value?.base}
            target={value?.target}
          />
        );
      })}
    </>
  );
}

/**
 * Optional values due to column-drift across runs
 * Renders combined single chart when type is string or datetime
 * Otherwise, renders two charts per histogram
 */
type CRProfilingColumnProps = {
  name: string;
  base?: ColumnSchema;
  target?: ColumnSchema;
};
function CRProfilingColumn({ name, base, target }: CRProfilingColumnProps) {
  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="1fr 2fr" gap={12} overflowX={'hidden'}>
        <CRTableColumnDetails baseColumn={base} targetColumn={target} />

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
}
