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
import { useState } from 'react';

interface Props {
  columnDatum?: ColumnSchema;
}
export function ChartTabsWidget({ columnDatum }: Props) {
  const { type, topk, histogram, trues, falses } = columnDatum || {};

  const [tabIndex, setTabIndex] = useState<number>(0);

  //render conditions - column pairs can have multiple chart kinds shown, especially when asymmetric columns are encountered
  //(e.g. base: text [histogram, topk] -> target: boolean [pie])
  const hasBoolean = isNumber(trues) && isNumber(falses);
  const hasTopk = topk && type;
  const hasHistogram = histogram && type;
  const isOther = type === 'other';
  const isText = type === 'string';
  const hasAny = hasBoolean || hasHistogram || hasTopk || isOther;
  const histogramLabel = isText ? TEXTLENGTH : 'Histogram';

  type ChartViewProps = {
    columnDatum?: ColumnSchema;
    chartKind?: ChartKind;
    [key: string]: any;
  };
  function ChartView({ columnDatum, chartKind, ...restProps }: ChartViewProps) {
    return (
      <ChartContainer px={0} title={columnDatum?.name} {...restProps}>
        {getDataChart(columnDatum, chartKind)}
      </ChartContainer>
    );
  }

  return (
    <Box pb={10} width="100%">
      {hasAny ? (
        <Tabs isLazy index={tabIndex} onChange={(i) => setTabIndex(i)}>
          <TabList>
            {hasTopk && <Tab>Top Categories</Tab>}
            {hasHistogram && <Tab>{histogramLabel}</Tab>}
            {hasBoolean && <Tab>Boolean</Tab>}
            {isOther && <Tab>Other</Tab>}
          </TabList>

          <TabPanels>
            {hasTopk && (
              <TabPanel px={0}>
                <ChartView columnDatum={columnDatum} chartKind="topk" />
              </TabPanel>
            )}
            {hasHistogram && (
              <TabPanel px={0}>
                <ChartView
                  columnDatum={columnDatum}
                  chartKind="histogram"
                  minHeight="300px"
                  maxHeight="300px"
                />
              </TabPanel>
            )}
            {hasBoolean && (
              <TabPanel px={0}>
                <ChartView
                  columnDatum={columnDatum}
                  chartKind="pie"
                  minHeight="300px"
                  maxHeight="300px"
                />
              </TabPanel>
            )}

            {isOther && (
              <TabPanel px={0}>
                <ChartView
                  columnDatum={columnDatum}
                  minHeight="300px"
                  maxHeight="300px"
                />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      ) : (
        renderChartUnavailableMsg({
          valids: columnDatum?.valids,
          schema_type: columnDatum?.schema_type,
        })
      )}
    </Box>
  );
}
