import { Box, Grid, VStack } from '@chakra-ui/react';
import { useState } from 'react';

import { Main } from '../components/Common/Main';
import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/Columns/utils';
import {
  AMPLITUDE_EVENTS,
  SR_TYPE_LABEL,
  useAmplitudeOnMount,
  useDocumentTitle,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useRoute } from 'wouter';
import { COLUMN_DETAILS_ROUTE_PATH } from '../utils/routes';
interface Props {
  data: SingleReportSchema;
}
export default function SRColumnDetailPage({ data }: Props) {
  const [, params] = useRoute(COLUMN_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');
  const columnName = decodeURIComponent(params?.columnName || '');

  useDocumentTitle('Single Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });
  const [tabIndex, setTabIndex] = useState<number>(0);

  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const { tableColumnsOnly = [] } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const dataTable = data.tables[tableName];
  const dataColumns = dataTable?.columns;
  const columnDatum = dataColumns ? dataColumns[columnName] : undefined;

  const { type, histogram, schema_type } = columnDatum || {};
  const { backgroundColor, icon } = getIconForColumnType(columnDatum);

  if (!tableName || !dataTable || !currentTableEntry) {
    return (
      <Main isSingleReport>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
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
          <DataCompositionWidget columnDatum={columnDatum} />
          {containsDataSummary(type) && (
            <DataSummaryWidget columnDatum={columnDatum} />
          )}
          {hasQuantile && histogram && (
            <QuantilesWidget columnDatum={columnDatum} />
          )}
        </VStack>

        <Box width="1px" bg="lightgray"></Box>

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
