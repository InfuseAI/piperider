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
} from '@chakra-ui/react';
import { isNumber } from 'lodash';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { getDataChart, renderChartUnavailableMsg } from '../../../utils/charts';
import { ChartKind } from '../../../utils/transformers';
import { ColumnCardDataVisualContainer } from '../ColumnCard/ColumnCardDataVisualContainer';

interface Props {
  hasSplitView?: boolean;
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
export function ChartTabsWidget({
  hasSplitView,
  baseColumnDatum,
  targetColumnDatum,
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
  const topk = baseTopK ?? targetTopK;
  const type = baseType ?? targetType;
  const histogram = baseHistogram ?? targetHistogram;
  const trues = baseTrues ?? targetTrues;
  const falses = baseFalses ?? targetFalses;

  //render conditions - column pairs can have multiple chart kinds shown
  const hasBoolean = isNumber(trues) && isNumber(falses);
  const hasHistogram = histogram && type;
  const hasTopk = topk;
  const hasOther = type === 'other';
  const hasAny = hasBoolean || hasHistogram || hasTopk || hasOther;

  return (
    <Box>
      <Text fontSize={'xl'}>Visualizations</Text>
      {hasAny ? (
        <Tabs>
          <TabList>
            {hasTopk && <Tab>Categorical</Tab>}
            {hasHistogram && <Tab>Histogram</Tab>}
            {hasBoolean && <Tab>Boolean</Tab>}
            {hasOther && <Tab>Other</Tab>}
          </TabList>

          <TabPanels>
            {hasTopk && (
              <TabPanel px={0}>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  hasSplitView,
                  'topk',
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
                )}
              </TabPanel>
            )}
            {hasOther && (
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
        renderChartUnavailableMsg(
          baseColumnDatum?.valids,
          baseColumnDatum?.schema_type,
        )
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
) {
  return (
    <Grid templateColumns={hasSplitView ? '1fr 1fr' : '1fr'}>
      <GridItem minWidth={0}>
        {
          <ColumnCardDataVisualContainer p={0} title={baseColumnDatum?.name}>
            {getDataChart(baseColumnDatum, targetColumnDatum, chartKind)}
          </ColumnCardDataVisualContainer>
        }
      </GridItem>
      {hasSplitView && (
        <GridItem minWidth={0}>
          {targetColumnDatum !== null && (
            <ColumnCardDataVisualContainer
              p={0}
              title={targetColumnDatum?.name}
            >
              {getDataChart(targetColumnDatum, baseColumnDatum, chartKind)}
            </ColumnCardDataVisualContainer>
          )}
        </GridItem>
      )}
    </Grid>
  );
}
