import { Flex, Grid } from '@chakra-ui/react';
import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';
import { transformAsNestedBaseTargetRecord } from '../../utils/transformers';
import { getDataChart } from '../shared/ColumnCard';
import { ColumnCardDataVisualContainer } from '../shared/ColumnCard/ColumnCardDataVisualContainer';
import { CRTableColumnDetails } from './CRTableColumnDetails';

type CRTabProfilingDetailsProps = {
  baseTable?: TableSchema;
  targetTable?: TableSchema;
};
export function CRTabProfilingDetails({
  baseTable,
  targetTable,
}: CRTabProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const transformedData = transformAsNestedBaseTargetRecord<
    TableSchema['columns'],
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
  // Show combined base|target chart or split charts
  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="400px 1fr" gap={12} overflowX={'hidden'}>
        <CRTableColumnDetails baseColumn={base} targetColumn={target} />

        <Flex my={4} alignItems={'center'}>
          <ColumnCardDataVisualContainer>
            {base ? getDataChart(base) : <NoData />}
          </ColumnCardDataVisualContainer>
          <ColumnCardDataVisualContainer>
            {target ? getDataChart(target, base) : <NoData />}
          </ColumnCardDataVisualContainer>
        </Flex>
      </Grid>
    </Flex>
  );
}

function NoData() {
  return (
    <Flex alignItems="center" justifyContent="center" color="gray.500">
      No data available
    </Flex>
  );
}
