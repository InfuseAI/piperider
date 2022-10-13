import {
  Divider,
  Flex,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useLocation } from 'wouter';
import { useState } from 'react';

import { Main } from '../components/shared/Layouts/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { ColumnDetailMasterList } from '../components/shared/Columns/ColumnDetailMasterList/ColumnDetailMasterList';
import { borderVal, mainContentAreaHeight } from '../utils/layout';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';

import type { ComparisonReportSchema } from '../types';
import { NoData } from '../components/shared/Layouts/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/shared/Columns/utils';
import {
  TableDescription,
  TableOverview,
} from '../components/shared/Tables/TableOverview';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';
import {
  BreadcrumbMetaItem,
  BreadcrumbNav,
} from '../components/shared/Layouts/BreadcrumbNav';
import { ColumnSchemaDeltaSummary } from '../components/shared/Tables/TableList/ColumnSchemaDeltaSummary';
import { TableColumnHeader } from '../components/shared/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { getBreadcrumbPaths } from '../utils/routes';
import { AssertionListWidget } from '../components/shared/Widgets/AssertionListWidget';
import { getAssertionStatusCountsFromList } from '../components/shared/Tables/utils';
import { TableListAssertionSummary } from '../components/shared/Tables/TableList/TableListAssertions';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL } from '../utils';

interface Props {
  data: ComparisonReportSchema;
  columnName: string;
  tableName: string;
}

export default function CRColumnDetailsPage({
  data,
  columnName,
  tableName,
}: Props) {
  useDocumentTitle('Comparison Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });
  const {
    base: { tables: baseTables },
    input: { tables: targetTables },
  } = data;
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const isTableDetailsView = columnName.length === 0;
  const setReportData = useReportStore((s) => s.setReportRawData);

  setReportData({ base: data.base, input: data.input });
  const { tableColumnsOnly = [], tableColumnAssertionsOnly } =
    useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  if (!tableName || !baseTables || !targetTables || !currentTableEntry) {
    return (
      <Main isSingleReport={false}>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  const [, { base: baseTableColEntry, target: targetTableColEntry }, metadata] =
    currentTableEntry;
  const baseDataTable = baseTables[tableName];
  const targetDataTable = targetTables[tableName];
  const baseDataColumns = baseDataTable?.columns || {};
  const targetDataColumns = targetDataTable?.columns || {};

  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];
  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  //TODO: move to store after assertions schema-change
  const { failed: baseFailed, total: baseTotal } =
    getAssertionStatusCountsFromList([
      baseDataTable?.piperider_assertion_result,
      baseDataTable?.dbt_assertion_result,
    ]);
  const { failed: targetFailed, total: targetTotal } =
    getAssertionStatusCountsFromList([
      targetDataTable?.piperider_assertion_result,
      targetDataTable?.dbt_assertion_result,
    ]);

  const breadcrumbList: BreadcrumbMetaItem[] = getBreadcrumbPaths(
    tableName,
    columnName,
  );
  const { backgroundColor, icon } = getIconForColumnType(baseColumnDatum);
  return (
    <Main isSingleReport={false} maxHeight={mainContentAreaHeight}>
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
              setTabIndex(0); //reset tabs
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
          />
        </GridItem>
        {/* Detail Area - Table Detail */}
        {isTableDetailsView ? (
          <GridItem maxHeight={mainContentAreaHeight} overflowY={'auto'} p={10}>
            <TableColumnHeader title={tableName} subtitle={'Table'} mb={5} />
            <Tabs defaultIndex={0}>
              <TabList>
                <Tab>Overview</Tab>
                <Tab>Assertions</Tab>
                <Tab>Schema</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
                    <TableOverview tableDatum={baseDataTable} />
                    <Divider orientation="vertical" />
                    <TableOverview tableDatum={targetDataTable} />
                    <TableDescription
                      description={baseDataTable?.description}
                    />
                    <Divider orientation="vertical" />
                    <TableDescription
                      description={targetDataTable?.description}
                    />
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <Flex mb={5} ml={-8}>
                    <TableListAssertionSummary
                      baseAssertionFailed={baseFailed}
                      baseAssertionTotal={baseTotal}
                      targetAssertionFailed={targetFailed}
                      targetAssertionTotal={targetTotal}
                    />
                  </Flex>
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    <AssertionListWidget
                      filterString={tableName}
                      comparableAssertions={tableColumnAssertionsOnly}
                      tableSize={'sm'}
                    />
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <Flex pb={3}>
                    <ColumnSchemaDeltaSummary
                      fontWeight={'semibold'}
                      color={'gray.600'}
                      added={metadata.added}
                      deleted={metadata.deleted}
                      changed={metadata.changed}
                    />
                  </Flex>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    <TableColumnSchemaList
                      baseTableEntryDatum={baseTableColEntry}
                      targetTableEntryDatum={targetTableColEntry}
                      onSelect={() => {}}
                    />
                  </Grid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
        ) : (
          // {/* Detail Area */}
          <Grid
            templateColumns={'1fr 1fr'}
            templateRows={'5em 5em 1fr 1fr'}
            width={'100%'}
            maxHeight={mainContentAreaHeight}
            overflowY={'auto'}
          >
            {/* Label Block */}
            <GridItem colSpan={2} rowSpan={2} p={9}>
              <TableColumnHeader
                title={columnName}
                subtitle={'Column'}
                mb={5}
                borderBottom={borderVal}
                icon={icon}
                iconColor={backgroundColor}
              />
              <ComparableGridHeader />
            </GridItem>
            {/* Data Composition Block */}
            <GridItem colSpan={2} p={9} bg={'gray.50'}>
              <Grid templateColumns={'1fr 1fr'} gap={8} minWidth={0}>
                <DataCompositionWidget columnDatum={baseColumnDatum} />
                <DataCompositionWidget columnDatum={targetColumnDatum} />
              </Grid>
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
                hasSplitView
                hasAnimation
                tabIndex={tabIndex}
                onSelectTab={(i) => setTabIndex(i)}
              />
            </GridItem>
            {/* Data Summary Block (avg, stddev, ...) */}
            {(containsDataSummary(baseType) ||
              containsDataSummary(targetType)) && (
              <GridItem colSpan={2} gridRow={'span 1'} p={9} bg={'gray.50'}>
                <Grid templateColumns={'1fr 1fr'} gap={8}>
                  {<DataSummaryWidget columnDatum={baseColumnDatum} />}
                  {<DataSummaryWidget columnDatum={targetColumnDatum} />}
                </Grid>
              </GridItem>
            )}
            {/* Quantiles Block */}
            {(containsColumnQuantile(baseType) ||
              containsColumnQuantile(targetType)) && (
              <GridItem colSpan={2} gridRow={'span 1'} p={9} bg={'gray.50'}>
                <Grid templateColumns={'1fr 1fr'} gap={8}>
                  <QuantilesWidget columnDatum={baseColumnDatum} />
                  <QuantilesWidget columnDatum={targetColumnDatum} />
                </Grid>
              </GridItem>
            )}
          </Grid>
        )}
      </Grid>
    </Main>
  );
}
function ComparableGridHeader() {
  return (
    <Grid templateColumns={'1fr 1fr'} mb={2} gap={10}>
      {['Base', 'Target'].map((v, i) => (
        <Flex key={i} alignItems={'center'} w={'100%'}>
          <Text
            fontWeight={'semibold'}
            fontSize={'2xl'}
            color={'gray.400'}
            w={'100%'}
          >
            {v}
          </Text>
        </Flex>
      ))}
    </Grid>
  );
}
