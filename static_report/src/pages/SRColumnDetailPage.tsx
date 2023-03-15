import { Box, Grid, VStack, Text, Divider } from '@chakra-ui/react';
import { useState } from 'react';

import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/Columns/utils';
import {
  EVENTS,
  formatTitleCase,
  SR_TYPE_LABEL,
  useTrackOnMount,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useRoute } from 'wouter';
import { COLUMN_DETAILS_ROUTE_PATH } from '../utils/routes';

export default function SRColumnDetailPage() {
  const [, params] = useRoute(COLUMN_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');
  const columnName = decodeURIComponent(params?.columnName || '');

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });
  const [tabIndex, setTabIndex] = useState<number>(0);

  const {
    tableColumnsOnly = [],
    rawData: { base: data },
  } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const dataTable = data?.tables[tableName];
  const dataColumns = dataTable?.columns;
  const columnDatum = dataColumns ? dataColumns[columnName] : undefined;

  const { type, histogram, schema_type } = columnDatum || {};
  const { backgroundColor, icon } = getIconForColumnType(columnDatum);

  if (!tableName || !dataTable || !currentTableEntry) {
    return <NoData text={`No profile data found for '${tableName}'`} />;
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
          <ChartTabsWidget
            baseColumnDatum={columnDatum}
            hasAnimation
            tabIndex={tabIndex}
            onSelectTab={(i) => setTabIndex(i)}
          />
        </VStack>
      </Grid>
    </>
  );
}
