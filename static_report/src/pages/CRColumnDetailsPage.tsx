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

import type {
  ColumnSchema,
  ComparisonReportSchema,
  SaferTableSchema,
} from '../types';
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
import { transformAsNestedBaseTargetRecord } from '../utils';
import { TableColumnHeader } from '../components/shared/Tables/TableColumnHeader';
import { CRAssertionDetailsWidget, getComparisonAssertions } from '../lib';
import { useReportStore } from '../components/shared/Tables/store';
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
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data.base, input: data.input });
  const { tableColumnsOnly = [] } = useReportStore.getState();

  if (!tableName || tableColumnsOnly.length === 0) {
    return (
      <Main isSingleReport={false}>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  const isTableDetailsView = columnName.length === 0;

  const baseDataTable = data.base.tables[tableName];
  const targetDataTable = data.input.tables[tableName];

  const baseDataColumns = baseDataTable?.columns || {};
  const targetDataColumns = targetDataTable?.columns || {};
  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];
  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  //TODO: move to store
  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    tableName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    tableName,
    type: 'dbt',
  });
  const piperiderAssertions = [
    ...(baseOverview?.tests || []),
    ...(targetOverview?.tests || []),
  ];
  const dbtAssertions = [
    ...(dbtBaseOverview?.tests || []),
    ...(dbtTargetOverview?.tests || []),
  ];

  //TODO: move to store
  const { backgroundColor, icon } = getIconForColumnType(baseColumnDatum);

  // const comparedColumns = transformAsNestedBaseTargetRecord<
  //   SaferTableSchema['columns'],
  //   ColumnSchema
  // >(baseDataColumns, targetDataColumns, { metadata: true });

  // const {
  //   __meta__: { added, deleted, changed },
  // } = comparedColumns;

  const breadcrumbList: BreadcrumbMetaItem[] = [
    { label: 'Tables', path: '/' },
    { label: tableName, path: `/tables/${tableName}/columns/` },
    {
      label: columnName,
      path: `/tables/${tableName}/columns/${columnName}`,
    },
  ];
  return (
    <Main isSingleReport={false} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav breadcrumbList={breadcrumbList} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            baseDataTables={baseTables}
            targetDataTables={targetTables}
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
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    <CRAssertionDetailsWidget
                      assertions={{
                        piperider: piperiderAssertions,
                        dbt: dbtAssertions,
                      }}
                    />
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <Flex pb={3}>
                    <ColumnSchemaDeltaSummary
                      fontWeight={'semibold'}
                      color={'gray.600'}
                      added={metadata.added}
                      deleted={deleted}
                      changed={changed}
                    />
                  </Flex>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    {/* <TableColumnSchemaList
                      baseTableEntryDatum={baseDataTable}
                      targetTableEntryDatum={targetDataTable}
                      onSelect={() => {}}
                    /> */}
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
