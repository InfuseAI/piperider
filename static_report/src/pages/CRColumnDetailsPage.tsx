import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';
import { useRoute } from 'wouter';
import { ColumnTypeHeader } from '../components/shared/Columns/ColumnTypeHeader';
import { Main } from '../components/shared/Main';
import { formatReportTime } from '../utils/formatters';
import { DataCompositionWidget } from '../components/shared/Widgets/DataCompositionWidget';
import { ChartTabsWidget } from '../components/shared/Widgets/ChartTabsWidget';
import { ComparisonReportSchema } from '../types';
import { ColumnDetailsMasterList } from '../components/shared/Columns/ColumnDetailMasterList';
import { mainContentAreaHeight } from '../utils/layout';
import { DataSummaryWidget } from '../components/shared/Widgets/DataSummaryWidget';
import { QuantilesWidget } from '../components/shared/Widgets/QuantilesWidget';
import {
  containsColumnQuantile,
  containsDataSummary,
} from '../utils/transformers';
interface Props {
  data: ComparisonReportSchema;
}
export function CRColumnDetailsPage({
  data: {
    base: { tables: baseTables, created_at: baseTime },
    input: { tables: targetTables, created_at: targetTime },
  },
}: Props) {
  // eslint-disable-next-line
  const [_, params] = useRoute('/tables/:reportName/columns/:columnName');

  const time = `${formatReportTime(baseTime)} -> ${formatReportTime(
    targetTime,
  )}`;
  if (!params?.columnName) {
    return (
      <Main isSingleReport={false} time={time}>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile column data found.
        </Flex>
      </Main>
    );
  }

  const { reportName, columnName } = params;
  const decodedColName = decodeURIComponent(columnName);
  const decodedTableName = decodeURIComponent(reportName);

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
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailsMasterList
            baseDataColumns={baseDataColumns}
            targetDataColumns={targetDataColumns}
            currentReport={decodedTableName}
            currentColumn={decodedColName}
            hasSplitView
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
