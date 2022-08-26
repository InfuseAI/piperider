import { Box, Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { QuantilesMatrix } from '../components/shared/ColumnMetrics/QuantilesMatrix';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { Main } from '../components/shared/Main';
import { NumericColumnMetrics } from '../components/shared/ColumnMetrics/NumericColumnMetrics';
import { formatTitleCase } from '../utils/formatters';
import { FlatBoxPlotChart } from '../components/shared/Charts/FlatBoxPlotChart';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { ComparisonReportSchema } from '../types';
import { ColumnDetailsMasterList } from '../components/shared/ColumnDetails/ColumnDetailsMasterList';
interface Props {
  data: ComparisonReportSchema;
}
export function CRColumnDetailsPage({
  data: {
    base: { tables: baseTables },
    input: { tables: targetTables },
  },
}: Props) {
  const [match, params] = useRoute('/tables/:reportName/columns/:columnName');

  if (!params?.columnName) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile column data found.
        </Flex>
      </Main>
    );
  }

  const { reportName, columnName } = params;

  const baseDataColumns = baseTables[reportName].columns;
  const targetDataColumns = targetTables[reportName].columns;

  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];

  const { type: baseType, histogram: baseHistogram } = baseColumnDatum;
  const { type: targetType, histogram: targetHistogram } = targetColumnDatum;

  // FIXME: IMPLEMENT TARGET SIDE
  return (
    <Main>
      <Flex
        width={'inherit'}
        minHeight="90vh"
        maxHeight="100vh"
        p={1}
        bg={'gray.200'}
        direction={['column', 'row']}
      >
        {/* Master Area */}
        <ColumnDetailsMasterList
          baseDataColumns={baseDataColumns}
          targetDataColumns={targetDataColumns}
          currentReport={reportName}
        />

        {/* Detail Area */}
        <Grid
          templateColumns={'500px 1fr'}
          templateRows={'3em 1fr 1fr'}
          gap={2}
          bg={'gray.200'}
          width={'100%'}
        >
          {/* Label Block */}
          <GridItem colSpan={2} rowSpan={1}>
            <ColumnCardHeader columnDatum={baseColumnDatum} />
          </GridItem>
          {/* Data Composition Block */}
          <GridItem p={9} bg={'white'}>
            <DataCompositionWidget columnDatum={baseColumnDatum} />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem gridRow={'span 1'} minWidth={0} p={9} bg={'white'}>
            <ChartTabsWidget columnDatum={baseColumnDatum} />
          </GridItem>
          <GridItem gridRow={'span 1'} p={9} bg={'white'}>
            <Box>
              <Text fontSize={'xl'}>
                {formatTitleCase(baseType)} Statistics
              </Text>
              <Divider my={3} />
              <NumericColumnMetrics
                baseColumn={baseColumnDatum}
                width={'100%'}
              />
            </Box>
          </GridItem>
          {/* Quantiles Block */}
          {(baseType === 'integer' || baseType === 'numeric') && baseHistogram && (
            <GridItem gridRow={'span 1'} p={9} bg={'white'} minWidth={'0px'}>
              <Text fontSize={'xl'}>Quantile Data</Text>
              <Divider my={3} />
              <Box my={5}>
                <FlatBoxPlotChart histogram={baseHistogram} />
              </Box>
              <QuantilesMatrix columnDatum={baseColumnDatum} />
            </GridItem>
          )}
        </Grid>
      </Flex>
    </Main>
  );
}
