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
  columnDatum: ColumnSchema;
}
export function ChartTabsWidget({ columnDatum }: Props) {
  const { type, topk, histogram, trues, falses, total, min, max, name } =
    columnDatum;
  return (
    <Box ml={3}>
      <Text fontSize={'xl'}>Visualizations</Text>
      {/* FIXME: Weird bug when switching from 1+n tab */}
      <Tabs>
        <TabList>
          {topk && <Tab>Categorical</Tab>}
          {histogram && <Tab>Histogram</Tab>}
          {trues && falses && <Tab>Boolean</Tab>}
          {type === 'other' && <Tab>Other</Tab>}
        </TabList>

        <TabPanels>
          {topk && (
            <TabPanel>
              <ColumnCardDataVisualContainer p={0} title={name} allowModalPopup>
                <CategoricalBarChart data={topk} total={total || 0} />
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
          {histogram && (
            <TabPanel>
              <ColumnCardDataVisualContainer p={0} title={name} allowModalPopup>
                <HistogramChart data={{ histogram, min, max, type, total }} />
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
          {trues && falses && (
            <TabPanel>
              <ColumnCardDataVisualContainer p={0} title={name} allowModalPopup>
                {getDataChart(columnDatum)}
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
          {type === 'other' && (
            <TabPanel>
              <ColumnCardDataVisualContainer p={0} title={name}>
                {getDataChart(columnDatum)}
              </ColumnCardDataVisualContainer>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
