import { Box, Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { QuantilesMatrix } from '../components/shared/QuantilesMatrix';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { Main } from '../components/shared/Main';
import { NumericTableColumn } from '../components/shared/NumericTableColumn';
import { SingleReportSchema } from '../sdlc/single-report-schema';
import { formatTitleCase } from '../utils/formatters';
import { FlatBoxPlotChart } from '../components/shared/Charts/FlatBoxPlotChart';
import { SRColumnDetailsMasterList } from '../components/SingleReport/SRColumnDetailsMasterList';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
interface Props {
  data: SingleReportSchema;
}
export function SRColumnDetailsPage({ data: { tables } }: Props) {
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
  const dataColumns = tables[reportName].columns;

  const columnDatum = dataColumns[columnName];
  const { type } = columnDatum;

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
        <SRColumnDetailsMasterList
          dataColumns={dataColumns}
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
            <ColumnCardHeader columnDatum={columnDatum} />
          </GridItem>
          {/* Data Composition Block */}
          <GridItem p={9} bg={'white'}>
            <DataCompositionWidget columnDatum={columnDatum} />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem gridRow={'span 1'} minWidth={0} p={9} bg={'white'}>
            <ChartTabsWidget columnDatum={columnDatum} />
          </GridItem>
          <GridItem gridRow={'span 1'} p={9} bg={'white'}>
            <Box>
              <Text fontSize={'xl'}>{formatTitleCase(type)} Statistics</Text>
              <Divider my={3} />
              <NumericTableColumn baseColumn={columnDatum} width={'100%'} />
            </Box>
          </GridItem>
          {/* Quantiles Block */}
          {(type === 'integer' || type === 'numeric') && (
            <GridItem gridRow={'span 1'} p={9} bg={'white'} minWidth={'0px'}>
              <Box>
                <FlatBoxPlotChart columnDatum={columnDatum} />
              </Box>
              <QuantilesMatrix columnDatum={columnDatum} />
            </GridItem>
          )}
        </Grid>
      </Flex>
    </Main>
  );
}
