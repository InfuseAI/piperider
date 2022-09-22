import { Flex, Grid, GridItem, Heading, Text } from '@chakra-ui/react';
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

import type { ComparisonReportSchema } from '../types';
import { NoData } from '../components/shared/Layouts/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/shared/Columns/utils';
import { TableOverview } from '../components/shared/Tables/TableOverview';
import { CRAssertionDetailsWidget } from '../components/shared/Widgets/CRAssertionDetailsWidget';
import { TableColumnSchemaList } from '../components/shared/Tables/TableList/TableColumnSchemaList';
import { getComparisonAssertions } from '../components/shared/Tables/utils';
import {
  BreadcrumbMetaItem,
  BreadcrumbNav,
} from '../components/shared/Layouts/BreadcrumbNav';
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
            <TableOverview
              baseTable={baseDataTable}
              targetTable={targetDataTable}
            />
            <Heading size="md" my={5}>
              Assertions
            </Heading>
            <CRAssertionDetailsWidget
              assertions={{
                piperider: piperiderAssertions,
                dbt: dbtAssertions,
              }}
            />
            <Heading size="md" my={5}>
              Schema
            </Heading>
            <TableColumnSchemaList
              baseTableDatum={baseDataTable}
              targetTableDatum={targetDataTable}
              onSelect={() => {}}
            />
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
