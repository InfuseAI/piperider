import { Box, Divider, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';

import { Main } from '../components/Common/Main';
import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { borderVal } from '../utils/layout';
import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import type { ComparisonReportSchema } from '../types';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/Columns/utils';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL, formatTitleCase } from '../utils';
import { COLUMN_DETAILS_ROUTE_PATH } from '../utils/routes';
import { useRoute } from 'wouter';

export default function CRColumnDetailPage() {
  const [, params] = useRoute(COLUMN_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');
  const columnName = decodeURIComponent(params?.columnName || '');

  useDocumentTitle('Comparison Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });

  const [tabIndex, setTabIndex] = useState<number>(0);
  const { rawData } = useReportStore.getState();
  const {
    base: { tables: baseTables },
    input: { tables: targetTables },
  } = rawData as ComparisonReportSchema;

  const { tableColumnsOnly = [] } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const baseDataTable = baseTables[tableName];
  const targetDataTable = targetTables[tableName];
  const baseDataColumns = baseDataTable?.columns || {};
  const targetDataColumns = targetDataTable?.columns || {};

  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];
  const fallbackColumnDatum = targetColumnDatum || baseColumnDatum;
  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  if (!baseColumnDatum && !targetColumnDatum) {
    return (
      <NoData text={`No profile data found for '${tableName}.${columnName}'`} />
    );
  }

  const { backgroundColor, icon } = getIconForColumnType(fallbackColumnDatum);
  return (
    <>
      <TableColumnHeader
        title={columnName}
        subtitle={fallbackColumnDatum?.schema_type}
        infoTip={targetColumnDatum?.description || baseColumnDatum?.description}
        mb={5}
        borderBottom={borderVal}
        icon={icon}
        iconColor={backgroundColor}
      />
      <ComparableGridHeader />
      <VStack spacing={10}>
        <Box width="100%">
          <Text fontSize={'xl'}>Data Composition</Text>
          <Divider />
          <Grid templateColumns={'1fr 1fr'} gap={8} minWidth={0}>
            <DataCompositionWidget columnDatum={baseColumnDatum} />
            <DataCompositionWidget columnDatum={targetColumnDatum} />
          </Grid>
        </Box>

        {(containsDataSummary(baseType) || containsDataSummary(targetType)) && (
          <Box width="100%">
            <Text fontSize={'xl'}>
              {fallbackColumnDatum
                ? formatTitleCase(fallbackColumnDatum?.type)
                : 'Type '}{' '}
              Statistics
            </Text>
            <Grid templateColumns={'1fr 1fr'} gap={8}>
              {<DataSummaryWidget columnDatum={baseColumnDatum} />}
              {<DataSummaryWidget columnDatum={targetColumnDatum} />}
            </Grid>
          </Box>
        )}
        {/* Quantiles Block */}
        {(containsColumnQuantile(baseType) ||
          containsColumnQuantile(targetType)) && (
          <Box width="100%">
            <Text fontSize={'xl'}>Quantile Data</Text>
            <Divider />
            <Grid templateColumns={'1fr 1fr'} gap={8}>
              <QuantilesWidget columnDatum={baseColumnDatum} />
              <QuantilesWidget columnDatum={targetColumnDatum} />
            </Grid>
          </Box>
        )}

        <ChartTabsWidget
          baseColumnDatum={baseColumnDatum}
          targetColumnDatum={targetColumnDatum}
          hasSplitView
          hasAnimation
          tabIndex={tabIndex}
          onSelectTab={(i) => setTabIndex(i)}
        />
      </VStack>
    </>
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
