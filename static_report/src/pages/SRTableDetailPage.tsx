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
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';
interface Props {
  data: SingleReportSchema;
}
export default function SRProfileRunPage({ data }: Props) {
  const [_, params] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');

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

  const dataTable = data.tables[tableName];

  if (!tableName || !dataTable || !currentTableEntry) {
    return (
      <Main isSingleReport>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }
  return (
    <GridItem h={mainContentAreaHeight} overflowY={'auto'} p={0}>
      <TableColumnHeader
        title={dataTable.name}
        subtitle={'Table'}
        infoTip={dataTable.description}
        mb={5}
      />
      <Tabs mt={3} defaultIndex={0}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Schema</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid templateColumns={'1fr 1fr'} gap={3}>
              <TableOverview tableDatum={dataTable} />
            </Grid>
          </TabPanel>
          <TabPanel>
            <TableColumnSchemaList
              baseTableEntryDatum={currentTableEntry?.[1].base}
              singleOnly
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </GridItem>
  );
}
