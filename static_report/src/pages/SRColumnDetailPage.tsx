import { Box, Grid, VStack, Text, Divider } from '@chakra-ui/react';

import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
} from '../components/Columns/utils';
import {
  EVENTS,
  formatTitleCase,
  SaferTableSchema,
  SR_TYPE_LABEL,
  useTrackOnMount,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useColumnRoute } from '../utils/routes';
import { getIconForColumnType } from '../components/Icons';

export default function SRColumnDetailPage() {
  const params = useColumnRoute();
  const uniqueId = params?.uniqueId;
  const tableName = decodeURIComponent(params?.tableName || '');
  const columnName = decodeURIComponent(params?.columnName || '');

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });

  const { tableColumnsOnly = [] } = useReportStore.getState();

  const tableKey = uniqueId ? uniqueId : `table.${tableName}`;
  if (tableKey === undefined) {
    return <NoData text={`No data found for '${tableKey}.${columnName}'`} />;
  }

  const currentTableEntry = tableColumnsOnly.find(([key]) => key === tableKey);
  if (!currentTableEntry) {
    return <NoData text={`No data found for '${tableKey}.${columnName}'`} />;
  }

  const dataTable = currentTableEntry[1].base
    ?.__table as any as SaferTableSchema;
  const dataColumns = dataTable?.columns;
  const columnDatum = dataColumns ? dataColumns[columnName] : undefined;

  const { type, histogram, schema_type } = columnDatum || {};
  const { backgroundColor, icon } = getIconForColumnType(columnDatum?.type);

  if (!tableKey || !dataTable || !currentTableEntry || !columnDatum) {
    return <NoData text={`No data found for '${tableKey}.${columnName}'`} />;
  }

  const hasQuantile = containsColumnQuantile(type);
  return (
    <>
      <TableColumnHeader
        title={columnName}
        subtitle={schema_type}
        infoTip={columnDatum?.description}
        icon={icon}
        iconColor={backgroundColor}
        mb={5}
      />
      <Grid
        width={'100%'}
        templateColumns={{ base: '1fr', xl: '1fr 1px 1fr' }}
        gap={5}
      >
        <VStack
          spacing={10}
          flex="1"
          width={'100%'}
          flexGrow={1}
          flexShrink={1}
        >
          <Box width="100%">
            <Text fontSize={'xl'}>Data Composition</Text>
            <Divider />
            <DataCompositionWidget columnDatum={columnDatum} />
          </Box>
          {containsDataSummary(type) && (
            <Box width="100%">
              <Text fontSize={'xl'}>
                {columnDatum ? formatTitleCase(columnDatum?.type) : 'Type '}{' '}
                Statistics
              </Text>
              <Divider />
              <DataSummaryWidget columnDatum={columnDatum} />
            </Box>
          )}
          {hasQuantile && histogram && (
            <Box width="100%">
              <Text fontSize={'xl'}>Quantile Data</Text>
              <Divider />
              <QuantilesWidget columnDatum={columnDatum} />
            </Box>
          )}
        </VStack>

        <Divider orientation="vertical" />

        <VStack spacing={10} width={'100%'}>
          <ChartTabsWidget columnDatum={columnDatum} />
        </VStack>
      </Grid>
    </>
  );
}
