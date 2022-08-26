import { Box, Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { QuantilesMatrix } from '../components/shared/ColumnMetrics/QuantilesMatrix';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { Main } from '../components/shared/Main';
import { NumericColumnMetrics } from '../components/shared/ColumnMetrics/NumericColumnMetrics';
import { formatReportTime, formatTitleCase } from '../utils/formatters';
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
    base: { tables: baseTables, created_at: baseTime },
    input: { tables: targetTables, created_at: targetTime },
  },
}: Props) {
  const [match, params] = useRoute('/tables/:reportName/columns/:columnName');

  const time = `${formatReportTime(baseTime)} -> ${formatReportTime(
    targetTime,
  )}`;
  if (!params?.columnName) {
    return (
      <Main isSingleReport={false} time={time}>
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
  const columnHeaderDatum = baseColumnDatum.type
    ? baseColumnDatum
    : targetColumnDatum;

  const {
    type: baseType,
    avg: baseAvg,
    min: baseMin,
    max: baseMax,
    p25: baseP25,
    p75: baseP75,
  } = baseColumnDatum;
  const {
    type: targetType,
    avg: targetAvg,
    min: targetMin,
    max: targetMax,
    p25: targetP25,
    p75: targetP75,
  } = targetColumnDatum;

  // FIXME: IMPLEMENT TARGET SIDE
  return (
    <Main isSingleReport={false} time={time}>
      <Grid width={'inherit'} p={1} bg={'gray.200'} templateColumns={'1fr 2fr'}>
        <Box h={'120vh'}>
          {/* Master Area */}
          <ColumnDetailsMasterList
            baseDataColumns={baseDataColumns}
            targetDataColumns={targetDataColumns}
            currentReport={reportName}
          />
        </Box>
        {/* Detail Area */}
        <Grid
          templateColumns={'1fr 1fr'}
          templateRows={'3em 3em 550px 500px'}
          bg={'gray.200'}
          width={'100%'}
          gap={1}
        >
          {/* Label Block */}
          <GridItem colSpan={2} rowSpan={1}>
            <ColumnCardHeader columnDatum={columnHeaderDatum} />
          </GridItem>
          <GridItem colSpan={2} rowSpan={1}>
            <Grid templateColumns={'1fr 1fr'} h={'100%'} gap={1}>
              <Flex alignItems={'center'} pl={9} bg={'white'}>
                <Text fontWeight={'light'} fontSize={'2xl'}>
                  Base
                </Text>
              </Flex>
              <Flex alignItems={'center'} pl={9} bg={'white'}>
                <Text fontWeight={'light'} fontSize={'2xl'}>
                  Target
                </Text>
              </Flex>
            </Grid>
          </GridItem>
          {/* Data Composition Block */}
          <GridItem colSpan={1} p={9} bg={'white'} minWidth={0}>
            <DataCompositionWidget columnDatum={baseColumnDatum} />
          </GridItem>
          <GridItem colSpan={1} p={9} bg={'white'} minWidth={0}>
            <DataCompositionWidget columnDatum={targetColumnDatum} />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem
            colSpan={2}
            gridRow={'span 1'}
            minWidth={0}
            p={9}
            bg={'white'}
          >
            {/* FIXME: Should handle both data - NEW UI HERE */}
            <ChartTabsWidget
              baseColumnDatum={baseColumnDatum}
              targetColumnDatum={targetColumnDatum}
            />
          </GridItem>
          <GridItem colSpan={2} gridRow={'span 1'} p={9} bg={'white'}>
            <Grid templateColumns={'1fr 1fr'} gap={8}>
              <GridItem>
                <Text fontSize={'xl'}>
                  {formatTitleCase(baseType)} Statistics
                </Text>
                <Divider my={3} />
                <NumericColumnMetrics
                  baseColumn={baseColumnDatum}
                  width={'100%'}
                />
              </GridItem>
              <GridItem>
                <Divider mt={42} mb={3} />
                <NumericColumnMetrics
                  baseColumn={baseColumnDatum}
                  width={'100%'}
                />
              </GridItem>
            </Grid>
          </GridItem>
          {/* Quantiles Block */}
          {/* FIXME: Box plot using wrong data */}
          {(baseType === 'integer' || baseType === 'numeric') && (
            <GridItem gridRow={'span 1'} p={9} bg={'white'} minWidth={'0px'}>
              <Text fontSize={'xl'}>Quantile Data</Text>
              <Divider my={3} />
              <Box my={5}>
                <FlatBoxPlotChart
                  quantileData={{
                    avg: baseAvg,
                    max: baseMax,
                    min: baseMin,
                    p25: baseP25,
                    p75: baseP75,
                  }}
                />
              </Box>
              <QuantilesMatrix columnDatum={baseColumnDatum} />
            </GridItem>
          )}
          {(targetType === 'integer' || targetType === 'numeric') && (
            <GridItem gridRow={'span 1'} p={9} bg={'white'} minWidth={'0px'}>
              <Divider mt={42} mb={3} />
              <Box my={5}>
                <FlatBoxPlotChart
                  quantileData={{
                    avg: targetAvg,
                    max: targetMax,
                    min: targetMin,
                    p25: targetP25,
                    p75: targetP75,
                  }}
                />
              </Box>
              <QuantilesMatrix columnDatum={targetColumnDatum} />
            </GridItem>
          )}
        </Grid>
      </Grid>
    </Main>
  );
}
