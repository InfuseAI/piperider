import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Text,
  Grid,
  GridItem,
  Divider,
} from '@chakra-ui/react';
import isNumber from 'lodash/isNumber';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import {
  ChartKind,
  getDataChart,
  renderChartUnavailableMsg,
} from '../Charts/utils';
import { ChartContainer } from '../Charts/ChartContainer';
import { TEXTLENGTH } from '../Columns/constants';

interface Props {
  tabIndex: number;
  onSelectTab: (index: number) => void;
  hasSplitView?: boolean;
  hasAnimation?: boolean;
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
export function ChartTabsWidget({
  hasAnimation,
  hasSplitView,
  baseColumnDatum,
  targetColumnDatum,
  tabIndex,
  onSelectTab,
}: Props) {
  const {
    type: baseType,
    topk: baseTopK,
    histogram: baseHistogram,
    trues: baseTrues,
    falses: baseFalses,
  } = baseColumnDatum || {};
  const {
    type: targetType,
    topk: targetTopK,
    histogram: targetHistogram,
    trues: targetTrues,
    falses: targetFalses,
  } = targetColumnDatum || {};

  // show tabs based when either column has at least one occurance of metric existence
  const hasTopk = baseTopK ?? targetTopK;
  const type = baseType ?? targetType;
  const histogram = baseHistogram ?? targetHistogram;
  const trues = baseTrues ?? targetTrues;
  const falses = baseFalses ?? targetFalses;

  //render conditions - column pairs can have multiple chart kinds shown, especially when asymmetric columns are encountered
  //(e.g. base: text [histogram, topk] -> target: boolean [pie])
  const hasBoolean = isNumber(trues) && isNumber(falses);
  const hasHistogram = histogram && type;
  const isOther = type === 'other';
  const isText = type === 'string';
  const hasAny = hasBoolean || hasHistogram || hasTopk || isOther;
  const histogramLabel = isText ? TEXTLENGTH : 'Histogram';

  return (
    <Box pb={10}>
      <Text fontSize={'xl'} mb={3}>
        Visualizations
      </Text>
      <Divider mb={3} />
      {hasAny ? (
        <Tabs isLazy index={tabIndex} onChange={(i) => onSelectTab(i)}>
          <TabList>
            {hasTopk && <Tab>Top Categories</Tab>}
            {hasHistogram && <Tab>{histogramLabel}</Tab>}
            {hasBoolean && <Tab>Boolean</Tab>}
            {isOther && <Tab>Other</Tab>}
          </TabList>

          <TabPanels>
            {hasTopk && (
              <TabPanel px={0}>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  hasSplitView,
                  'topk',
                  hasAnimation,
                )}
              </TabPanel>
            )}
            {hasHistogram && (
              <TabPanel px={0}>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  hasSplitView,
                  'histogram',
                  hasAnimation,
                )}
              </TabPanel>
            )}
            {hasBoolean && (
              <TabPanel px={0}>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  hasSplitView,
                  'pie',
                  hasAnimation,
                )}
              </TabPanel>
            )}
            {isOther && (
              <TabPanel px={0}>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  hasSplitView,
                )}
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      ) : (
        renderChartUnavailableMsg({
          valids: baseColumnDatum?.valids,
          schema_type: baseColumnDatum?.schema_type,
        })
      )}
    </Box>
  );
}

/**
 * A helper method to render two-col grid view or single-grid col, depending on target
 * @param baseColumnDatum
 * @param targetColumnDatum
 * @param chartKind
 * @returns
 */
function _renderGridSplitView(
  baseColumnDatum?: ColumnSchema,
  targetColumnDatum?: ColumnSchema,
  hasSplitView?: boolean,
  chartKind?: ChartKind,
  hasAnimation?: boolean,
) {
  return (
    <Grid templateColumns={hasSplitView ? '1fr 1fr' : '1fr'} gap={10}>
      <GridItem minWidth={0}>
        {
          <ChartContainer px={0} title={baseColumnDatum?.name}>
            {getDataChart(
              baseColumnDatum,
              targetColumnDatum,
              chartKind,
              hasAnimation,
            )}
          </ChartContainer>
        }
      </GridItem>
      {hasSplitView && (
        <GridItem minWidth={0}>
          {targetColumnDatum !== null && (
            <ChartContainer p={0} title={targetColumnDatum?.name}>
              {getDataChart(
                targetColumnDatum,
                baseColumnDatum,
                chartKind,
                hasAnimation,
              )}
            </ChartContainer>
          )}
        </GridItem>
      )}
    </Grid>
  );
}
