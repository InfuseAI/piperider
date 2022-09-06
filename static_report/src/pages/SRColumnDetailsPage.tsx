import { Divider, Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useLocation, useRoute } from 'wouter';

import { ColumnTypeHeader } from '../components/shared/Columns/ColumnTypeHeader';
import { Main } from '../components/shared/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { mainContentAreaHeight } from '../utils/layout';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';
import { ColumnDetailsMasterList } from '../components/shared/Columns/ColumnDetailMasterList';
import { SRSummaryStats } from '../components/shared/Columns/ColumnMetrics/SRSummaryStats';

import {
  containsColumnQuantile,
  containsDataSummary,
} from '../utils/transformers';
import { formatReportTime, formatTitleCase } from '../utils/formatters';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
interface Props {
  data: SingleReportSchema;
}
export default function SRColumnDetailsPage({
  data: { tables, created_at },
}: Props) {
  const [, params] = useRoute('/tables/:reportName/columns/:columnName');
  const [, setLocation] = useLocation();
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

  const borderVal = '1px solid lightgray';

  return (
    <Main isSingleReport time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailsMasterList
            onSelect={({ tableName, columnName }) =>
              setLocation(`/tables/${tableName}/columns/${columnName}`)
            }
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
            <ColumnTypeHeader
              columnDatum={columnDatum}
              maxHeight={'5em'}
              height={'100%'}
              bg={'blue.800'}
              color={'white'}
            />
          </GridItem>
          {/* Data Composition Block */}
          <GridItem p={10} bg={'gray.50'} borderRight={borderVal}>
            <DataCompositionWidget columnDatum={columnDatum} hasAnimation />
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem gridRow={'span 1'} minWidth={0} p={9} bg={'gray.50'}>
            <ChartTabsWidget baseColumnDatum={columnDatum} hasAnimation />
          </GridItem>
          <GridItem
            gridRow={'span 1'}
            p={9}
            bg={'gray.50'}
            borderRight={borderVal}
          >
            {containsDataSummary(type) && (
              <>
                <Text fontSize={'xl'}>{formatTitleCase(type)} Statistics</Text>
                <Divider my={3} />
                <SRSummaryStats columnDatum={columnDatum} width={'100%'} />
              </>
            )}
          </GridItem>
          {/* Quantiles Block */}
          {containsColumnQuantile(type) && histogram && (
            <GridItem gridRow={'span 1'} p={9} bg={'gray.50'} minWidth={'1px'}>
              <QuantilesWidget columnDatum={columnDatum} />
            </GridItem>
          )}
        </Grid>
      </Grid>
    </Main>
  );
}
