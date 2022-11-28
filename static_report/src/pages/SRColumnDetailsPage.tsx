import {
  Flex,
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
import { Main } from '../components/shared/Layouts/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { borderVal, mainContentAreaHeight } from '../utils/layout';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';
import { ColumnDetailMasterList } from '../components/shared/Columns/ColumnDetailMasterList';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { NoData } from '../components/shared/Layouts/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/shared/Columns/utils';
import { TableOverview } from '../components/shared/Tables/TableOverview';
import {
  AMPLITUDE_EVENTS,
  AssertionPassFailCountLabel,
  AssertionListWidget,
  BreadcrumbMetaItem,
  BreadcrumbNav,
  SR_TYPE_LABEL,
  TableColumnSchemaList,
  useAmplitudeOnMount,
  useDocumentTitle,
  getAssertionStatusCountsFromList,
} from '../lib';
import { TableColumnHeader } from '../components/shared/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { getBreadcrumbPaths } from '../utils/routes';
import { DescriptionBlock } from '../components/shared/Layouts/DescriptionBlock';
interface Props {
  data: SingleReportSchema;
  columnName: string;
  tableName: string;
}
export default function SRColumnDetailsPage({
  data,
  columnName,
  tableName,
}: Props) {
  useDocumentTitle('Single Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);

  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const { tableColumnsOnly = [], assertionsOnly } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const isTableDetailsView = columnName.length === 0;

  const dataTable = data.tables[tableName];
  const dataColumns = dataTable.columns;
  const columnDatum = dataColumns[columnName];

  const { failed: baseFailed, total: baseTotal } =
    getAssertionStatusCountsFromList(
      assertionsOnly?.base?.filter((v) => v?.table === tableName) || [],
    );
  const { type, histogram, schema_type } = columnDatum || {};
  const { backgroundColor, icon } = getIconForColumnType(columnDatum);

  if (!tableName || !dataTable || !currentTableEntry) {
    return (
      <Main isSingleReport>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  const breadcrumbList: BreadcrumbMetaItem[] = getBreadcrumbPaths(
    tableName,
    columnName,
  );
  const hasQuantile = containsColumnQuantile(type);
  return (
    <Main isSingleReport maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav breadcrumbList={breadcrumbList} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            tableColEntry={currentTableEntry}
            currentTable={tableName}
            currentColumn={columnName}
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
            <TableColumnHeader
              title={dataTable.name}
              subtitle={'Table'}
              mb={5}
            />
            <DescriptionBlock description={dataTable.description} />
            <Tabs mt={3} defaultIndex={0}>
              <TabList>
                <Tab>Overview</Tab>
                <Tab>Assertions</Tab>
                <Tab>Schema</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  {/* FIXME: <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
                    <TableOverview tableDatum={dataTable} />
                    <Divider orientation="vertical" />
                    <DescriptionBlock description={dataTable.description} />
                  </Grid> */}
                  <Grid templateColumns={'1fr 1fr'} gap={3}>
                    <TableOverview tableDatum={dataTable} />
                    {/* <Divider orientation="vertical" />
                    <DescriptionBlock description={dataTable.description} /> */}
                  </Grid>
                </TabPanel>
                <TabPanel>
                  {Number(baseTotal) > 0 && (
                    <Flex mb={5}>
                      <AssertionPassFailCountLabel
                        total={baseTotal}
                        failed={baseFailed}
                      />
                    </Flex>
                  )}
                  <AssertionListWidget
                    filterString={dataTable.name}
                    caseSensitiveFilter
                    comparableAssertions={assertionsOnly}
                    singleOnly
                    tableSize={'sm'}
                  />
                </TabPanel>
                <TabPanel>
                  <TableColumnSchemaList
                    baseTableEntryDatum={currentTableEntry?.[1].base}
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
            templateColumns={'1fr 1fr'}
            templateRows={`1fr 1fr 1fr ${hasQuantile ? '1fr' : ''}`}
            gridAutoFlow={'column'}
            width={'100%'}
            pb={5}
            maxHeight={mainContentAreaHeight}
            overflowY={'auto'}
          >
            {/* Label Block */}
            <GridItem colSpan={2} p={9}>
              <TableColumnHeader
                title={columnName}
                subtitle={schema_type}
                icon={icon}
                iconColor={backgroundColor}
                mb={5}
              />
              <DescriptionBlock description={columnDatum.description} />
            </GridItem>
            {/* Data Composition Block */}
            <GridItem
              colSpan={1}
              px={10}
              bg={'gray.50'}
              borderRight={borderVal}
            >
              <DataCompositionWidget columnDatum={columnDatum} hasAnimation />
            </GridItem>
            {/** */}
            <GridItem
              gridRow={'auto'}
              px={10}
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
            {hasQuantile && histogram && (
              <GridItem
                bg={'gray.50'}
                minWidth={'1px'}
                borderRight={borderVal}
                p={10}
              >
                <QuantilesWidget columnDatum={columnDatum} />
              </GridItem>
            )}
            {/* Chart Block - toggleable tabs */}
            <GridItem
              colSpan={1}
              rowSpan={hasQuantile ? 3 : 2}
              minWidth={0}
              px={10}
              bg={'gray.50'}
            >
              <ChartTabsWidget
                baseColumnDatum={columnDatum}
                hasAnimation
                tabIndex={tabIndex}
                onSelectTab={(i) => setTabIndex(i)}
              />
            </GridItem>
          </Grid>
        )}
      </Grid>
    </Main>
  );
}
