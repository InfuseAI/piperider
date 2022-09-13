import { Grid, GridItem } from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { ColumnTypeHeader } from '../components/shared/Columns/ColumnTypeHeader';
import { Main } from '../components/shared/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { mainContentAreaHeight } from '../utils/layout';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';
import { ColumnDetailsMasterList } from '../components/shared/Columns/ColumnDetailMasterList';

import {
  containsColumnQuantile,
  containsDataSummary,
} from '../utils/transformers';
import { formatReportTime } from '../utils/formatters';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { NoData } from '../components/shared/NoData';
import { BreadcrumbNav } from '../components/shared/BreadcrumbNav';
import { COLUMN_DETAILS_ROUTE_PATH } from '../utils/routes';
interface Props {
  data: SingleReportSchema;
  columnName: string;
  tableName: string;
}
export default function SRColumnDetailsPage({
  data: { tables, created_at },
  columnName,
  tableName,
}: Props) {
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const time = formatReportTime(created_at) || '';

  if (!columnName || !tableName) {
    return (
      <Main isSingleReport time={time}>
        <NoData text="No profile data found." />
      </Main>
    );
  }

  const decodedColName = decodeURIComponent(columnName);
  const decodedTableName = decodeURIComponent(tableName);

  const dataColumns = tables[decodedTableName].columns;
  const columnDatum = dataColumns[decodedColName];

  const { type, histogram } = columnDatum;

  const borderVal = '1px solid lightgray';

  return (
    <Main isSingleReport time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav routePathToMatch={COLUMN_DETAILS_ROUTE_PATH} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailsMasterList
            baseDataColumns={dataColumns}
            currentReport={decodedTableName}
            currentColumn={decodedColName}
            onSelect={({ tableName, columnName }) => {
              setTabIndex(0); //resets tabs
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
            singleOnly
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
            <ChartTabsWidget
              baseColumnDatum={columnDatum}
              hasAnimation
              tabIndex={tabIndex}
              onSelectTab={(i) => setTabIndex(i)}
            />
          </GridItem>
          <GridItem
            gridRow={'span 1'}
            p={9}
            bg={'gray.50'}
            borderRight={borderVal}
          >
            {containsDataSummary(type) && (
              <>
                <DataSummaryWidget columnDatum={columnDatum} />
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
