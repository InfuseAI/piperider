import {
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useState } from 'react';

import { Main } from '../components/Common/Main';
import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { borderVal, mainContentAreaHeight } from '../utils/layout';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/Columns/utils';
import { TableOverview } from '../components/Tables/TableOverview';
import {
  AMPLITUDE_EVENTS,
  SR_TYPE_LABEL,
  TableColumnSchemaList,
  useAmplitudeOnMount,
  useDocumentTitle,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';
import { useLocation, useRoute } from 'wouter';
import {
  COLUMN_DETAILS_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
} from '../utils/routes';
interface Props {
  data: SingleReportSchema;
}
export default function SRColumnDetailPage({ data }: Props) {
  const [match, params] = useRoute(COLUMN_DETAILS_ROUTE_PATH);
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
  const { tableColumnsOnly = [], rawData } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const isTableDetailsView = columnName.length === 0;

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
      <Grid
        templateColumns={'1fr 1fr'}
        templateRows={`8em 1fr 1fr ${hasQuantile ? '1fr' : ''}`}
        gridAutoFlow={'column'}
        width={'100%'}
        pb={5}
      >
        {/* Label Block */}
        <GridItem colSpan={2} p={9}>
          <TableColumnHeader
            title={columnName}
            subtitle={schema_type}
            infoTip={columnDatum?.description}
            icon={icon}
            iconColor={backgroundColor}
            mb={5}
          />
        </GridItem>
        {/* Data Composition Block */}
        <GridItem colSpan={1} px={10} bg={'gray.50'} borderRight={borderVal}>
          <DataCompositionWidget columnDatum={columnDatum} hasAnimation />
        </GridItem>
        {/** */}
        <GridItem
          gridRow={'auto'}
          px={10}
          bg={'gray.50'}
          borderRight={borderVal}
        >
          {containsDataSummary(type) && (
            <>
              <DataSummaryWidget columnDatum={columnDatum} />
            </>
          )}
        </GridItem>
        {/* Quantiles Block */}
        {hasQuantile && histogram && (
          <GridItem
            bg={'gray.50'}
            minWidth={'1px'}
            borderRight={borderVal}
            p={10}
          >
            <QuantilesWidget columnDatum={columnDatum} />
          </GridItem>
        )}
        {/* Chart Block - toggleable tabs */}
        <GridItem
          colSpan={1}
          rowSpan={hasQuantile ? 3 : 2}
          minWidth={0}
          px={10}
          bg={'gray.50'}
        >
          <ChartTabsWidget
            baseColumnDatum={columnDatum}
            hasAnimation
            tabIndex={tabIndex}
            onSelectTab={(i) => setTabIndex(i)}
          />
        </GridItem>
      </Grid>
    </>
  );
}
