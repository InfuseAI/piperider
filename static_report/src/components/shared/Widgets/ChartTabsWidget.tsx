import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Box,
  Text,
} from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { CategoricalBarChart } from '../Charts/CategoricalBarChart';
import { HistogramChart } from '../Charts/HistogramChart';
import { getDataChart } from '../ColumnCard';
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
    total: baseTotal,
    min: baseMin,
    max: baseMax,
    name: baseName,
  } = baseColumnDatum || {};
  var {
    type: targetType,
    topk: targetTopK,
    histogram: targetHistogram,
    trues: targetTrues,
    falses: targetFalses,
    total: targetTotal,
    min: targetMin,
    max: targetMax,
    name: targetName,
  } = targetColumnDatum || {};

  // show tabs based when either column has at least one occurance of metric existence
  const topk = baseTopK || targetTopK;
  const type = baseType || targetType;
  const histogram = baseHistogram || targetHistogram;
  const trues = baseTrues || targetTrues;
  const falses = baseFalses || targetFalses;
  const total = baseTotal || targetTotal;
  const min = baseMin || targetMin;
  const max = baseMax || targetMax;
  const name = baseName || targetName;

  //render conditions
  const hasBoolean = trues && falses;
  const hasHistogram = histogram && type;
  const hasTopk = topk;
  const hasOther = type === 'other';

  return (
    <Box ml={3}>
      <Text fontSize={'xl'}>Visualizations</Text>
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
              <ColumnCardDataVisualContainer p={0} title={name} allowModalPopup>
                <CategoricalBarChart data={topk} total={total || 0} />
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
          {hasHistogram && (
            <TabPanel>
              <ColumnCardDataVisualContainer p={0} title={name} allowModalPopup>
                <HistogramChart data={{ histogram, min, max, type, total }} />
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
          {hasBoolean && (
            <TabPanel>
              {baseColumnDatum && (
                <ColumnCardDataVisualContainer
                  p={0}
                  title={name}
                  allowModalPopup
                >
                  {getDataChart(baseColumnDatum)}
                </ColumnCardDataVisualContainer>
              )}
            </TabPanel>
          )}
          {hasOther && (
            <TabPanel>
              {baseColumnDatum && (
                <ColumnCardDataVisualContainer p={0} title={name}>
                  {getDataChart(baseColumnDatum)}
                </ColumnCardDataVisualContainer>
              )}
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
