import {
  Divider,
  Flex,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';

import { Main } from '../components/Common/Main';
import { DataCompositionWidget } from '../components/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/Widgets/ChartTabsWidget';
import { borderVal, mainContentAreaHeight } from '../utils/layout';
import { DataSummaryWidget } from '../components/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/Widgets/QuantilesWidget';

import type { ComparisonReportSchema } from '../types';
import { NoData } from '../components/Common/NoData';
import {
  containsDataSummary,
  containsColumnQuantile,
  getIconForColumnType,
} from '../components/Columns/utils';
import { TableOverview } from '../components/Tables/TableOverview';
import { TableColumnSchemaList } from '../components/Tables/Schema/TableColumnSchemaList';
import { ColumnSchemaDeltaSummary } from '../components/Tables/Schema/ColumnSchemaDeltaSummary';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useDocumentTitle, useAmplitudeOnMount } from '../hooks';
import { AMPLITUDE_EVENTS, CR_TYPE_LABEL } from '../utils';
import { MasterDetailContainer } from '../components/Common/MasterDetailContainer';

interface Props {
  data: ComparisonReportSchema;
  columnName: string;
  tableName: string;
}

export default function CRProfileRunPage({
  data,
  columnName,
  tableName,
}: Props) {
  useDocumentTitle('Comparison Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });
  const {
    base: { tables: baseTables },
    input: { tables: targetTables },
  } = data;
  const [tabIndex, setTabIndex] = useState<number>(0);
  const isTableDetailsView = columnName.length === 0;
  const setReportData = useReportStore((s) => s.setReportRawData);

  setReportData({ base: data.base, input: data.input });
  const { tableColumnsOnly = [], rawData } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  if (!tableName || !baseTables || !targetTables || !currentTableEntry) {
    return (
      <Main isSingleReport={false}>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }

  const [, { base: baseTableColEntry, target: targetTableColEntry }, metadata] =
    currentTableEntry;
  const baseDataTable = baseTables[tableName];
  const targetDataTable = targetTables[tableName];
  const baseDataColumns = baseDataTable?.columns || {};
  const targetDataColumns = targetDataTable?.columns || {};

  const baseColumnDatum = baseDataColumns[columnName];
  const targetColumnDatum = targetDataColumns[columnName];
  const fallbackColumnDatum = targetColumnDatum || baseColumnDatum;
  const { type: baseType } = baseColumnDatum || {};
  const { type: targetType } = targetColumnDatum || {};

  const { backgroundColor, icon } = getIconForColumnType(fallbackColumnDatum);
  return (
    <Main isSingleReport={false}>
      <MasterDetailContainer
        rawData={rawData}
        tableColEntries={tableColumnsOnly}
        tableName={tableName}
        columnName={columnName}
      >
        {/* Detail Area - Table Detail */}
        {isTableDetailsView ? (
          <GridItem maxHeight={mainContentAreaHeight} overflowY={'auto'} p={10}>
            <TableColumnHeader
              title={tableName}
              subtitle={'Table'}
              mb={5}
              infoTip={(targetDataTable || baseDataTable)?.description}
            />
            <Tabs defaultIndex={0}>
              <TabList>
                <Tab>Overview</Tab>
                <Tab>Schema</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <ComparableGridHeader />
                  <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
                    <TableOverview tableDatum={baseDataTable} />
                    <Divider orientation="vertical" />
                    <TableOverview tableDatum={targetDataTable} />
                  </Grid>
                </TabPanel>
                <TabPanel>
                  <Flex pb={3}>
                    <ColumnSchemaDeltaSummary
                      fontWeight={'semibold'}
                      color={'gray.600'}
                      added={metadata.added}
                      deleted={metadata.deleted}
                      changed={metadata.changed}
                    />
                  </Flex>
                  <Grid templateColumns={'1fr'} gap={3} height={'100%'}>
                    <TableColumnSchemaList
                      baseTableEntryDatum={baseTableColEntry}
                      targetTableEntryDatum={targetTableColEntry}
                    />
                  </Grid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
        ) : (
          // {/* Detail Area */}
          <Grid
            templateColumns={'1fr 1fr'}
            width={'100%'}
            maxHeight={mainContentAreaHeight}
            overflowY={'auto'}
          >
            {/* Label Block */}
            <GridItem colSpan={2} rowSpan={2} p={9}>
              <TableColumnHeader
                title={columnName}
                subtitle={fallbackColumnDatum?.schema_type}
                infoTip={
                  targetColumnDatum?.description || baseColumnDatum?.description
                }
                mb={5}
                borderBottom={borderVal}
                icon={icon}
                iconColor={backgroundColor}
              />
              <ComparableGridHeader />
            </GridItem>
            {/* Data Composition Block */}
            <GridItem colSpan={2} px={9} py={2} bg={'gray.50'}>
              <Grid templateColumns={'1fr 1fr'} gap={8} minWidth={0}>
                <DataCompositionWidget columnDatum={baseColumnDatum} />
                <DataCompositionWidget columnDatum={targetColumnDatum} />
              </Grid>
            </GridItem>
            {/* Data Summary Block (avg, stddev, ...) */}
            {(containsDataSummary(baseType) ||
              containsDataSummary(targetType)) && (
              <GridItem
                colSpan={2}
                gridRow={'span 1'}
                px={9}
                py={2}
                bg={'gray.50'}
              >
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
          </Grid>
        )}
      </MasterDetailContainer>
    </Main>
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