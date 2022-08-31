import { Box, Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { QuantilesMatrix } from '../components/shared/ColumnMetrics/QuantilesMatrix';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { Main } from '../components/shared/Main';
import { SRSummaryStats } from '../components/shared/ColumnMetrics/SRSummaryStats';
import { SingleReportSchema } from '../sdlc/single-report-schema';
import { formatReportTime, formatTitleCase } from '../utils/formatters';
import { FlatBoxPlotChart } from '../components/shared/Charts/FlatBoxPlotChart';
import { ColumnDetailsMasterList } from '../components/shared/ColumnDetails/ColumnDetailsMasterList';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { mainContentAreaHeight } from '../utils/layout';
interface Props {
  data: SingleReportSchema;
}
export function SRColumnDetailsPage({ data: { tables, created_at } }: Props) {
  const [match, params] = useRoute('/tables/:reportName/columns/:columnName');
  const time = formatReportTime(created_at);

  if (!params?.columnName) {
    return (
      <Main isSingleReport time={time}>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile column data found.
        </Flex>
      </Main>
    );
  }

  const { reportName, columnName } = params;
  const dataColumns = tables[reportName].columns;
  const columnDatum = dataColumns[columnName];
  const { type, histogram } = columnDatum;

  const { avg, min, max, p25, p75 } = columnDatum;

  return (
    <Main isSingleReport time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailsMasterList
            baseDataColumns={dataColumns}
            currentReport={reportName}
            currentColumn={columnName}
          />
        </GridItem>

        {/* Detail Area */}
        <Grid
          templateColumns={'500px 1fr'}
          templateRows={'5em 1fr 1fr'}
          width={'100%'}
          maxHeight={mainContentAreaHeight}
          overflowY={'auto'}
        >
          {/* Label Block */}
          <GridItem colSpan={2} rowSpan={1}>
            <ColumnCardHeader
              columnDatum={columnDatum}
              maxHeight={'5em'}
              height={'100%'}
              bg={'blue.700'}
              color={'white'}
            />
          </GridItem>
          {/* Data Composition Block */}
          <GridItem p={10} bg={'gray.50'}>
            <DataCompositionWidget columnDatum={columnDatum} />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem gridRow={'span 1'} minWidth={0} p={9} bg={'gray.50'}>
            <ChartTabsWidget baseColumnDatum={columnDatum} />
          </GridItem>
          <GridItem gridRow={'span 1'} p={9} bg={'gray.50'}>
            <Text fontSize={'xl'}>{formatTitleCase(type)} Statistics</Text>
            <Divider my={3} />
            <SRSummaryStats columnDatum={columnDatum} width={'100%'} />
          </GridItem>
          {/* Quantiles Block */}
          {(type === 'integer' || type === 'numeric') && histogram && (
            <GridItem gridRow={'span 1'} p={9} bg={'gray.50'} minWidth={'1px'}>
              <Text fontSize={'xl'}>Quantile Data</Text>
              <Divider my={3} />
              <Box my={5}>
                <FlatBoxPlotChart
                  quantileData={{
                    avg,
                    max,
                    min,
                    p25,
                    p75,
                  }}
                />
              </Box>
              <QuantilesMatrix columnDatum={columnDatum} />
            </GridItem>
          )}
        </Grid>
      </Grid>
    </Main>
  );
}
