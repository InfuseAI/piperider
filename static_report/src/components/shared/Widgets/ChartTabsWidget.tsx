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
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
export function ChartTabsWidget({ baseColumnDatum, targetColumnDatum }: Props) {
  var {
    type: baseType,
    topk: baseTopK,
    histogram: baseHistogram,
    trues: baseTrues,
    falses: baseFalses,
  } = baseColumnDatum || {};
  var {
    type: targetType,
    topk: targetTopK,
    histogram: targetHistogram,
    trues: targetTrues,
    falses: targetFalses,
  } = targetColumnDatum || {};

  // show tabs based when either column has at least one occurance of metric existence
  const topk = baseTopK || targetTopK;
  const type = baseType || targetType;
  const histogram = baseHistogram || targetHistogram;
  const trues = baseTrues || targetTrues;
  const falses = baseFalses || targetFalses;

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
              <TabPanel>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  'topk',
                )}
              </TabPanel>
            )}
            {hasHistogram && (
              <TabPanel>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  'histogram',
                )}
              </TabPanel>
            )}
            {hasBoolean && (
              <TabPanel>
                {_renderGridSplitView(
                  baseColumnDatum,
                  targetColumnDatum,
                  'pie',
                )}
              </TabPanel>
            )}
            {hasOther && (
              <TabPanel>
                {_renderGridSplitView(baseColumnDatum, targetColumnDatum)}
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
  chartKind?: ChartKind,
) {
  return (
    <Grid templateColumns={targetColumnDatum ? '1fr 1fr' : '1fr'}>
      <GridItem minWidth={0}>
        {baseColumnDatum && (
          <ColumnCardDataVisualContainer p={0} title={baseColumnDatum.name}>
            {getDataChart(baseColumnDatum, targetColumnDatum, chartKind)}
          </ColumnCardDataVisualContainer>
        )}
      </GridItem>
      {targetColumnDatum && (
        <GridItem minWidth={0}>
          {targetColumnDatum && (
            <ColumnCardDataVisualContainer p={0} title={targetColumnDatum.name}>
              {getDataChart(targetColumnDatum, baseColumnDatum, chartKind)}
            </ColumnCardDataVisualContainer>
          )}
        </GridItem>
      )}
    </Grid>
  );
}
