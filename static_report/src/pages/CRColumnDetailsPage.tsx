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

import { ColumnTypeHeader } from '../components/shared/Columns/ColumnTypeHeader';
import { Main } from '../components/shared/Layouts/Main';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { ColumnDetailMasterList } from '../components/shared/Columns/ColumnDetailMasterList/ColumnDetailMasterList';
import { mainContentAreaHeight } from '../utils/layout';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';

import { formatReportTime } from '../utils/formatters';

import type {
  ColumnSchema,
  ComparisonReportSchema,
  SaferTableSchema,
} from '../types';
import { NoData } from '../components/shared/Layouts/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/shared/Columns/utils';
import { TableOverview } from '../components/shared/Tables/TableOverview';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';
import {
  BreadcrumbMetaItem,
  BreadcrumbNav,
} from '../components/shared/Layouts/BreadcrumbNav';
import { ColumnSchemaDeltaSummary } from '../components/shared/Tables/TableList/ColumnSchemaDeltaSummary';
import { transformAsNestedBaseTargetRecord } from '../utils';
import { TableHeader } from '../components/shared/Tables/TableHeader';
import { SRAssertionDetailsWidget } from '../lib';
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
  const {
    base: { tables: baseTables, created_at: baseTime },
    input: { tables: targetTables, created_at: targetTime },
  } = data;
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);
  const time = `${formatReportTime(baseTime)} -> ${formatReportTime(
    targetTime,
  )}`;

  if (!tableName || !baseTables || !targetTables) {
    return (
      <Main isSingleReport={false} time={time}>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  const decodedColName = decodeURIComponent(columnName);
  const decodedTableName = decodeURIComponent(tableName);
  const isTableDetailsView = decodedColName.length === 0;

  const baseDataTable = baseTables[decodedTableName];
  const targetDataTable = targetTables[decodedTableName];
  const baseDataColumns = baseDataTable?.columns || {};
  const targetDataColumns = targetDataTable?.columns || {};

  const baseColumnDatum = baseDataColumns[decodedColName];
  const targetColumnDatum = targetDataColumns[decodedColName];
  const columnHeaderDatum = baseColumnDatum?.type
    ? baseColumnDatum
    : targetColumnDatum;

  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  const comparedColumns = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseDataColumns, targetDataColumns, { metadata: true });

  const {
    __meta__: { added, deleted, changed },
  } = comparedColumns;
  const breadcrumbList: BreadcrumbMetaItem[] = [
    { label: 'Tables', path: '/' },
    { label: decodedTableName, path: `/tables/${decodedTableName}/columns/` },
    {
      label: decodedColName,
      path: `/tables/${decodedTableName}/columns/${decodedColName}`,
    },
  ];
  return (
    <Main isSingleReport={false} time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav breadcrumbList={breadcrumbList} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            baseDataTables={baseTables}
            targetDataTables={targetTables}
            currentTable={decodedTableName}
            currentColumn={decodedColName}
            onSelect={({ tableName, columnName }) => {
              setTabIndex(0); //reset tabs
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
          />
        </GridItem>
        {/* Detail Area - Table Detail */}
        {isTableDetailsView ? (
          <GridItem maxHeight={mainContentAreaHeight} overflowY={'auto'} p={10}>
            <TableHeader tableName={tableName} mb={5} />
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
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr 1px 1fr'} gap={3} height={'100%'}>
                    <SRAssertionDetailsWidget
                      assertions={{
                        piperider: baseDataTable?.piperider_assertion_result,
                        dbt: baseDataTable?.dbt_assertion_result,
                      }}
                    />
                    <Divider orientation="vertical" />
                    <SRAssertionDetailsWidget
                      assertions={{
                        piperider: targetDataTable?.piperider_assertion_result,
                        dbt: targetDataTable?.dbt_assertion_result,
                      }}
                    />
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    <ColumnSchemaDeltaSummary
                      added={added}
                      deleted={deleted}
                      changed={changed}
                    />
                    <TableColumnSchemaList
                      baseTableDatum={baseDataTable}
                      targetTableDatum={targetDataTable}
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
            templateRows={'5em 3em 1fr 1fr'}
            width={'100%'}
            maxHeight={mainContentAreaHeight}
            overflowY={'auto'}
          >
            {/* Label Block */}
            <GridItem colSpan={2} rowSpan={1}>
              <ColumnTypeHeader
                columnDatum={columnHeaderDatum}
                maxHeight={'5em'}
                height={'100%'}
                bg={'blue.800'}
                color={'white'}
              />
            </GridItem>
            {/* Sticky Sublabel */}
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
    <Grid templateColumns={'1fr 1fr'} mb={2} gap={5}>
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
