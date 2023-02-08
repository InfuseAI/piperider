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
interface Props {
  data: SingleReportSchema;
  columnName: string;
  tableName: string;
}
export default function SRProfileRunPage({
  data,
  columnName,
  tableName,
}: Props) {
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
  const dataColumns = dataTable.columns;
  const columnDatum = dataColumns[columnName];

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
    <Main isSingleReport>
      <MasterDetailContainer
        rawData={rawData}
        tableColEntries={tableColumnsOnly}
        tableName={tableName}
        columnName={columnName}
        singleOnly
      >
        {/* Detail Area - Table Detail */}
        {isTableDetailsView ? (
          <GridItem h={mainContentAreaHeight} overflowY={'auto'} p={10}>
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
        ) : (
          // {/* Detail Area - Columns */}
          <Grid
            templateColumns={'1fr 1fr'}
            templateRows={`8em 1fr 1fr ${hasQuantile ? '1fr' : ''}`}
            gridAutoFlow={'column'}
            width={'100%'}
            pb={5}
            h={mainContentAreaHeight}
            overflowY={'auto'}
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
            <GridItem
              colSpan={1}
              px={10}
              bg={'gray.50'}
              borderRight={borderVal}
            >
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
        )}
      </MasterDetailContainer>
    </Main>
  );
}
