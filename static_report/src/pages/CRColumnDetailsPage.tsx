import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';
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
import { COLUMN_DETAILS_ROUTE_PATH } from '../utils/routes';
import { NoData } from '../components/shared/Layouts/NoData';
import { BreadcrumbNav } from '../components/shared/Layouts/BreadcrumbNav';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/shared/Columns/utils';
interface Props {
  data: ComparisonReportSchema;
  columnName: string;
  tableName: string;
}

export default function CRColumnDetailsPage({
  data: {
    base: { tables: baseTables, created_at: baseTime },
    input: { tables: targetTables, created_at: targetTime },
  },
  columnName,
  tableName,
}: Props) {
  const [, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState<number>(0);

  const time = `${formatReportTime(baseTime)} -> ${formatReportTime(
    targetTime,
  )}`;
  if (!columnName || !tableName) {
    return (
      <Main isSingleReport={false} time={time}>
        <NoData text="No profile data found." />
      </Main>
    );
  }

  const decodedColName = decodeURIComponent(columnName);
  const decodedTableName = decodeURIComponent(tableName);

  const baseDataColumns = baseTables[decodedTableName]?.columns || {};
  const targetDataColumns = targetTables[decodedTableName]?.columns || {};

  const baseColumnDatum = baseDataColumns[decodedColName];
  const targetColumnDatum = targetDataColumns[decodedColName];
  const columnHeaderDatum = baseColumnDatum?.type
    ? baseColumnDatum
    : targetColumnDatum;

  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  return (
    <Main isSingleReport={false} time={time} maxHeight={mainContentAreaHeight}>
      <Grid width={'inherit'} templateColumns={'1fr 2fr'}>
        <GridItem colSpan={3}>
          <BreadcrumbNav routePathToMatch={COLUMN_DETAILS_ROUTE_PATH} />
        </GridItem>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            currentReport={decodedTableName}
            currentColumn={decodedColName}
            onSelect={({ tableName, columnName }) => {
              setTabIndex(0); //reset tabs
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
          />
        </GridItem>
        {/* Detail Area */}
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
      </Grid>
    </Main>
  );
}
