import {
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { ColumnTypeHeader } from '../components/shared/Columns/ColumnTypeHeader';
import { Main } from '../components/shared/Layouts/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { mainContentAreaHeight } from '../utils/layout';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';
import { ColumnDetailMasterList } from '../components/shared/Columns/ColumnDetailMasterList';

import { formatReportTime } from '../utils/formatters';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { NoData } from '../components/shared/Layouts/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/shared/Columns/utils';
import { TableOverview } from '../components/shared/Tables/TableOverview';
import { SRAssertionDetailsWidget } from '../components/shared/Widgets/SRAssertionDetailsWidget';
import {
  BreadcrumbMetaItem,
  BreadcrumbNav,
  TableColumnSchemaList,
} from '../lib';
import { TableHeader } from '../components/shared/Tables/TableHeader';
interface Props {
  data: SingleReportSchema;
  columnName: string;
  tableName: string;
}
export default function SRColumnDetailsPage({
  data: { tables: dataTables, created_at },
  columnName,
  tableName,
}: Props) {
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const time = formatReportTime(created_at) || '';

  const decodedColName = decodeURIComponent(columnName);
  const decodedTableName = decodeURIComponent(tableName);
  const isTableDetailsView = decodedColName.length === 0;

  const dataTable = dataTables[decodedTableName];
  const dataColumns = dataTable.columns;
  const columnDatum = dataColumns[decodedColName];

  //FIXME: <Schema> can be undefined if not matching columnDatum
  const { type, histogram } = columnDatum || {};

  if (!tableName || !dataTable) {
    return (
      <Main isSingleReport time={time}>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  //FIXME: Use Store for collectively SSOT handling data of tables + columns
  // right now, components are reusing the same utilities, causing execution/implementation redundancies in code

  const borderVal = '1px solid lightgray';
  const breadcrumbList: BreadcrumbMetaItem[] = [
    { label: 'Tables', path: '/' },
    { label: decodedTableName, path: `/tables/${decodedTableName}/columns/` },
    {
      label: decodedColName,
      path: `/tables/${decodedTableName}/columns/${decodedColName}`,
    },
  ];

  return (
    <Main isSingleReport time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav breadcrumbList={breadcrumbList} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            baseDataTables={dataTables}
            currentTable={decodedTableName}
            currentColumn={decodedColName}
            onSelect={({ tableName, columnName }) => {
              setTabIndex(0); //resets tabs
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
            singleOnly
          />
        </GridItem>
        {/* Detail Area - Table Detail */}
        {isTableDetailsView ? (
          <GridItem maxHeight={mainContentAreaHeight} overflowY={'auto'} p={10}>
            <TableHeader tableName={dataTable.name} mb={5} />
            <Tabs defaultIndex={0}>
              <TabList>
                <Tab>Overview</Tab>
                <Tab>Assertions</Tab>
                <Tab>Schema</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <TableOverview baseTable={dataTable} singleOnly />
                </TabPanel>
                <TabPanel>
                  <SRAssertionDetailsWidget
                    assertions={{
                      piperider: dataTable.piperider_assertion_result,
                      dbt: dataTable?.dbt_assertion_result,
                    }}
                  />
                </TabPanel>
                <TabPanel>
                  <TableColumnSchemaList
                    baseTableDatum={dataTable}
                    singleOnly
                    onSelect={() => {}}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
        ) : (
          // {/* Detail Area - Columns */}
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
              <GridItem
                gridRow={'span 1'}
                p={9}
                bg={'gray.50'}
                minWidth={'1px'}
              >
                <QuantilesWidget columnDatum={columnDatum} />
              </GridItem>
            )}
          </Grid>
        )}
      </Grid>
    </Main>
  );
}
