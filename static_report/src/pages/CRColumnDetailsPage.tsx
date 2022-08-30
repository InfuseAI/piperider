import { Box, Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { QuantilesMatrix } from '../components/shared/ColumnMetrics/QuantilesMatrix';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { Main } from '../components/shared/Main';
import { SummaryStats } from '../components/shared/ColumnMetrics/SummaryStats';
import { formatReportTime, formatTitleCase } from '../utils/formatters';
import { FlatBoxPlotChart } from '../components/shared/Charts/FlatBoxPlotChart';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { ComparisonReportSchema } from '../types';
import { ColumnDetailsMasterList } from '../components/shared/ColumnDetails/ColumnDetailsMasterList';
import { mainContentAreaHeight } from '../utils/layout';
import { NO_VALUE } from '../components/shared/ColumnCard/ColumnTypeDetail/constants';
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

  const baseDataColumns = baseTables[reportName]?.columns || {};
  const targetDataColumns = targetTables[reportName]?.columns || {};

  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];
  const columnHeaderDatum = baseColumnDatum?.type
    ? baseColumnDatum
    : targetColumnDatum;

  const {
    type: baseType,
    avg: baseAvg,
    min: baseMin,
    max: baseMax,
    p25: baseP25,
    p75: baseP75,
  } = baseColumnDatum || {};
  const {
    type: targetType,
    avg: targetAvg,
    min: targetMin,
    max: targetMax,
    p25: targetP25,
    p75: targetP75,
  } = targetColumnDatum || {};

  return (
    <Main isSingleReport={false} time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailsMasterList
            baseDataColumns={baseDataColumns}
            targetDataColumns={targetDataColumns}
            currentReport={reportName}
            currentColumn={columnName}
          />
        </GridItem>
        {/* Detail Area */}
        <Grid
          templateColumns={'1fr 1fr'}
          templateRows={'5em 3em 1fr 1fr'}
          width={'100%'}
          maxHeight={mainContentAreaHeight}
          overflowY={'auto'}
        >
          {/* Label Block */}
          <GridItem colSpan={2} rowSpan={1}>
            <ColumnCardHeader
              columnDatum={columnHeaderDatum}
              maxHeight={'5em'}
              height={'100%'}
              bg={'blue.700'}
              color={'white'}
            />
          </GridItem>
          <GridItem colSpan={2} rowSpan={1} position={'sticky'} top={0}>
            <Grid templateColumns={'1fr 1fr'} h={'100%'}>
              {['Base', 'Target'].map((v, i) => (
                <Flex
                  key={i}
                  alignItems={'center'}
                  pl={9}
                  bg={'blackAlpha.300'}
                >
                  <Text
                    color={'white'}
                    fontWeight={'semibold'}
                    fontSize={'2xl'}
                  >
                    {v}
                  </Text>
                </Flex>
              ))}
            </Grid>
          </GridItem>
          {/* Data Composition Block */}
          <GridItem colSpan={1} p={9} bg={'gray.50'} minWidth={0}>
            <DataCompositionWidget columnDatum={baseColumnDatum} />
          </GridItem>
          <GridItem colSpan={1} p={9} bg={'gray.50'} minWidth={0}>
            <DataCompositionWidget columnDatum={targetColumnDatum} />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem
            colSpan={2}
            gridRow={'span 1'}
            minWidth={0}
            p={9}
            bg={'gray.50'}
          >
            <ChartTabsWidget
              baseColumnDatum={baseColumnDatum}
              targetColumnDatum={targetColumnDatum}
            />
          </GridItem>
          <GridItem colSpan={2} gridRow={'span 1'} p={9} bg={'gray.50'}>
            <Grid templateColumns={'1fr 1fr'} gap={8}>
              {baseType !== 'other' && baseType !== 'boolean' && (
                <GridItem>
                  <Text fontSize={'xl'}>
                    {formatTitleCase(baseType || NO_VALUE)} Statistics
                  </Text>
                  <Divider my={3} />
                  <SummaryStats baseColumn={baseColumnDatum} width={'100%'} />
                </GridItem>
              )}
              {targetType !== 'other' && targetType !== 'boolean' && (
                <GridItem>
                  <Divider mt={42} mb={3} />
                  <SummaryStats baseColumn={targetColumnDatum} width={'100%'} />
                </GridItem>
              )}
            </Grid>
          </GridItem>
          {/* Quantiles Block */}
          {(baseType === 'integer' || baseType === 'numeric') && (
            <GridItem gridRow={'span 1'} p={9} bg={'gray.50'} minWidth={'0px'}>
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
            <GridItem gridRow={'span 1'} p={9} bg={'gray.50'} minWidth={'0px'}>
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
