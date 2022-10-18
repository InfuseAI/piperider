import { Box, Divider, Flex, Link, Text } from '@chakra-ui/react';
import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  BarElement,
  Tooltip,
  ChartData,
  AnimationOptions,
} from 'chart.js';
import { Fragment, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Topk } from '../../../sdlc';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
} from '../../../utils/formatters';

interface Props {
  topk: Topk;
  valids: number;
}
/**
 * A list of each topk summary item (categorical)
 */
export function TopKSummaryList({ topk, valids }: Props) {
  const [isDisplayTopTen, setIsDisplayTopTen] = useState<boolean>(true);
  const endAtIndex = isDisplayTopTen ? 10 : topk.counts.length;
  const displayList = topk.counts.slice(0, endAtIndex);
  const remainingSumCount = topk.counts
    .slice(endAtIndex)
    .reduce((accum, curr) => accum + curr, 0);

  return (
    <Box w={'100%'} px={3}>
      {displayList
        .concat(remainingSumCount ? [remainingSumCount] : [])
        .map((v, index) => {
          const isLastItemOthers =
            remainingSumCount && index === displayList.length;
          const topkCount = isLastItemOthers ? remainingSumCount : v;
          const topkLabel = isLastItemOthers ? 'Others' : topk.values[index];

          return (
            <Fragment key={index}>
              <Flex
                alignItems={'center'}
                width={'100%'}
                _hover={{ bg: 'blackAlpha.300' }}
              >
                <Text noOfLines={1} width={'14em'} fontSize={'sm'}>
                  {topkLabel}
                </Text>
                <Flex height={'2em'} width={'10em'}>
                  <CategoricalBarChart
                    topkCount={topkCount}
                    topkLabel={topkLabel}
                    valids={valids}
                  />
                </Flex>
                <Text mr={5} fontSize={'sm'}>
                  {formatAsAbbreviatedNumber(topkCount)}
                </Text>
                <Text color={'gray.400'} fontSize={'sm'}>
                  {formatIntervalMinMax(topkCount / valids)}
                </Text>
              </Flex>
              <Divider />
            </Fragment>
          );
        })}
      {topk.values.length > 10 && (
        <Flex py={5} justify={'start'}>
          <Link
            onClick={() => setIsDisplayTopTen((prevState) => !prevState)}
            textColor={'blue.500'}
          >
            {isDisplayTopTen ? 'View Remaining Items' : 'View Top-10 Only'}
          </Link>
        </Flex>
      )}
    </Box>
  );
}

/**
 * Props for creating a CategoricalBarChart Component
 */
export interface CategoricalBarChartProps {
  topkCount: number;
  topkLabel: number | string;
  valids: number;
  animation?: AnimationOptions<'bar'>['animation'];
}
/**
 * A Singular horizontal progress bar chart that visualizes categorical dataset, plotted 1:1 category group
 */
export function CategoricalBarChart({
  topkCount,
  topkLabel,
  valids,
  animation = false,
}: CategoricalBarChartProps) {
  ChartJS.register(CategoryScale, BarElement);
  const chartOptions = getCatBarChartOptions(topkCount, valids, { animation });
  const chartData = getCatBarChartData({
    topkCount,
    topkLabel,
  });

  return <Bar data={chartData} options={chartOptions} plugins={[Tooltip]} />;
}

/**
 * @returns merged Chart.js option object for categorical 'bar'
 */
export function getCatBarChartOptions(
  count: CategoricalBarChartProps['topkCount'],
  valids: number,
  { ...configOverrides }: ChartOptions<'bar'> = {},
): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        display: false,
        max: valids,
        grid: { display: false },
      },
      y: {
        display: false,
      },
    },
    plugins: {
      tooltip: {
        mode: 'y',
        position: 'nearest',
        padding: 5,
        titleMarginBottom: 0,
        intersect: false,
        callbacks: {
          title([{ dataIndex, dataset, label }]) {
            const result = dataset.data[dataIndex];
            const percentOfTotal = formatIntervalMinMax(count / valids);

            return `${label}: ${result} (${percentOfTotal})`;
          },
          label() {
            return '';
          },
        },
      },
    },
    ...configOverrides,
  };
}
/**
 * @returns merged Chart.js data object for categorical 'bar'
 */
export function getCatBarChartData({
  topkLabel,
  topkCount,
}: Omit<CategoricalBarChartProps, 'animation' | 'valids'>): ChartData<'bar'> {
  return {
    labels: [topkLabel], // showing top cats
    datasets: [
      {
        indexAxis: 'y',
        data: [topkCount], // showing top cats
        backgroundColor: '#63B3ED',
        hoverBackgroundColor: '#002a53',
        borderWidth: 1,
        borderColor: '#002a53',
        barPercentage: 1,
        categoryPercentage: 0.6,
      },
    ],
  };
}
