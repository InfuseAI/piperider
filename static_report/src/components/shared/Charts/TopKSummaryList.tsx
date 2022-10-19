import { Box, Divider, Flex, Link, Text, Tooltip } from '@chakra-ui/react';
import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  BarElement,
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
 * Last list item will show 'others', which is the count difference of valids and displayed topk items
 */
export function TopKSummaryList({ topk, valids }: Props) {
  const [isDisplayTopTen, setIsDisplayTopTen] = useState<boolean>(true);
  const endAtIndex = isDisplayTopTen ? 10 : topk.counts.length;
  const displayList = topk.counts.slice(0, endAtIndex);
  const remainingSumCount =
    valids - displayList.reduce((accum, curr) => accum + curr, 0);

  return (
    <Box w={'100%'}>
      {displayList.concat([remainingSumCount]).map((v, index) => {
        const isLastItemOthers = index === displayList.length;
        const topkCount = isLastItemOthers ? remainingSumCount : v;
        const topkLabel = isLastItemOthers ? 'Others' : topk.values[index];
        const displayTopkCount = formatAsAbbreviatedNumber(topkCount);
        const displayTopkRatio = formatIntervalMinMax(topkCount / valids);
        return (
          <Fragment key={index}>
            <Flex
              alignItems={'center'}
              width={'100%'}
              _hover={{ bg: 'blackAlpha.300' }}
              px={3}
            >
              <Tooltip label={topkLabel} placement="start">
                <Text noOfLines={1} width={'14em'} fontSize={'sm'}>
                  {topkLabel}
                </Text>
              </Tooltip>
              <Flex height={'2em'} width={'10em'}>
                <CategoricalBarChart
                  topkCount={topkCount}
                  topkLabel={topkLabel}
                  valids={valids}
                />
              </Flex>
              <Tooltip label={displayTopkCount} placement="start">
                <Text ml={5} mr={2} fontSize={'sm'} width={'4em'} noOfLines={1}>
                  {displayTopkCount}
                </Text>
              </Tooltip>
              <Tooltip label={displayTopkRatio} placement="start">
                <Text color={'gray.400'} fontSize={'sm'} width={'4em'}>
                  {displayTopkRatio}
                </Text>
              </Tooltip>
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
            {isDisplayTopTen ? 'View More Items' : 'View Only Top-10'}
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

  return <Bar data={chartData} options={chartOptions} plugins={[]} />;
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
        enabled: false,
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
