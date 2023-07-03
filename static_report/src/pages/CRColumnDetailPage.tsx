import { Box, Divider, Flex, Grid, Text, VStack } from '@chakra-ui/react';

import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { borderVal } from '../utils/layout';
import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import type { SaferTableSchema } from '../types';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/Columns/utils';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL, formatTitleCase } from '../utils';
import { useColumnRoute } from '../utils/routes';
import React from 'react';
import { getIconForColumnType } from '../components/Icons';

export default function CRColumnDetailPage() {
  const params = useColumnRoute();
  const uniqueId = params?.uniqueId;
  let tableName = decodeURIComponent(params?.tableName || '');
  const columnName = decodeURIComponent(params?.columnName || '');

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });

  ///
  const { tableColumnsOnly = [] } = useReportStore.getState();

  const tableKey = uniqueId ? uniqueId : `table.${tableName}`;
  if (tableKey === undefined) {
    return <NoData text={`No data found for '${tableKey}.${columnName}'`} />;
  }

  const currentTableEntry = tableColumnsOnly.find(([key]) => key === tableKey);
  if (!currentTableEntry) {
    return <NoData text={`No data found for '${tableKey}.${columnName}'`} />;
  }

  const baseDataTable = currentTableEntry[1].base
    ?.__table as any as SaferTableSchema;
  const baseDataColumns = baseDataTable?.columns;
  const baseColumnDatum = baseDataColumns
    ? baseDataColumns[columnName]
    : undefined;
  const targetDataTable = currentTableEntry[1].target
    ?.__table as any as SaferTableSchema;
  const targetDataColumns = targetDataTable?.columns;
  const targetColumnDatum = targetDataColumns
    ? targetDataColumns[columnName]
    : undefined;

  const fallbackColumnDatum = targetColumnDatum || baseColumnDatum;
  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  if (!baseColumnDatum && !targetColumnDatum) {
    return (
      <NoData text={`No profile data found for '${tableName}.${columnName}'`} />
    );
  }

  function SeparateView({
    title,
    Comp,
  }: {
    title: string;
    Comp: React.FC<{ columnDatum: any }>;
  }) {
    if (baseColumnDatum === undefined) {
      return (
        <Box width="100%">
          <Text fontSize={'xl'}>{title}</Text>
          <Divider />
          <Comp columnDatum={targetColumnDatum} />
        </Box>
      );
    } else if (targetColumnDatum === undefined) {
      return (
        <Box width="100%">
          <Text fontSize={'xl'}>{title}</Text>
          <Divider />
          <Comp columnDatum={baseColumnDatum} />
        </Box>
      );
    } else {
      return (
        <Box width="100%">
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <Text fontSize={'xl'}>{title}</Text>
            <Divider orientation="vertical" />
            <Text fontSize={'xl'}>{title}</Text>
          </Grid>
          <Divider />
          <Grid templateColumns={'1fr 1px 1fr'} gap={8} minWidth={0}>
            <Comp columnDatum={baseColumnDatum} />
            <Divider orientation="vertical" />
            <Comp columnDatum={targetColumnDatum} />
          </Grid>
        </Box>
      );
    }
  }

  function ComparisonContent({ children }: { children: React.ReactNode }) {
    function EmptyBox() {
      return (
        <Box
          bg="gray.100"
          width="100%"
          height="100%"
          borderWidth="2px"
          borderColor="lightgray"
        />
      );
    }
    if (baseColumnDatum === undefined) {
      return (
        <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
          <EmptyBox />
          <Divider orientation="vertical" />
          {children}
        </Grid>
      );
    } else if (targetColumnDatum === undefined) {
      return (
        <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
          {children}
          <Divider orientation="vertical" />
          <EmptyBox />
        </Grid>
      );
    } else {
      return <>{children}</>;
    }
  }

  const { backgroundColor, icon } = getIconForColumnType(
    fallbackColumnDatum?.type,
  );
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
      <ComparisonContent>
        <VStack spacing={10}>
          <SeparateView title="Data Composition" Comp={DataCompositionWidget} />
          {(containsDataSummary(baseType) ||
            containsDataSummary(targetType)) && (
            <SeparateView
              title={
                fallbackColumnDatum
                  ? `${formatTitleCase(fallbackColumnDatum?.type)} Statistics`
                  : 'Type Statistics'
              }
              Comp={DataSummaryWidget}
            />
          )}

          {/* Quantiles Block */}
          {(containsColumnQuantile(baseType) ||
            containsColumnQuantile(targetType)) && (
            <SeparateView title="Quantile Data" Comp={QuantilesWidget} />
          )}

          <SeparateView title="Visualizations" Comp={ChartTabsWidget} />
        </VStack>
      </ComparisonContent>
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
