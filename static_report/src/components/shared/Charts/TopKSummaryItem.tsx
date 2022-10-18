import { Divider, Flex, Text } from '@chakra-ui/react';
import {
  ChartOptions,
  Chart as ChartJS,
  CategoryScale,
  BarElement,
  Tooltip,
  ChartData,
  AnimationOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  formatAsAbbreviatedNumber,
  formatIntervalMinMax,
} from '../../../utils/formatters';

interface Props {
  topkCount: number;
  topkLabel: number | string;
  samples: number; //FIXME: shouldn't this be valids?
}
/**
 * A list-item summary of each Topk item (categorical)
 * TODO:
 * - FIXME: [ASK??] Hover tooltip: show pct here only (hover area: list-item)
 * - Show 10 top (scroll beyond 10+)
 * - Add 'Others' (as valids only) to account for the remainder items (show remaining >10)
 */
export function TopKSummaryItem({ topkLabel, topkCount, samples }: Props) {
  return (
    <>
      <Flex
        alignItems={'center'}
        width={'100%'}
        px={3}
        _hover={{ bg: 'blackAlpha.300' }}
      >
        <Text noOfLines={1} width={'14em'} fontSize={'sm'}>
          {topkLabel}
        </Text>
        <Flex height={'3em'} width={'10em'}>
          <CategoricalBarChart
            topkCount={topkCount}
            topkLabel={topkLabel}
            samples={samples}
          />
        </Flex>
        <Text mx={3}>{formatAsAbbreviatedNumber(topkCount)}</Text>
        <Text color={'gray.400'}>
          {formatIntervalMinMax(topkCount / samples)}
        </Text>
      </Flex>
      <Divider />
    </>
  );
}

const barPercentage = 0.6;
const categoryPercentage = 0.5;
/**
 * Props for creating a CategoricalBarChart Component
 */
export interface CategoricalBarChartProps {
  topkCount: number;
  topkLabel: number | string;
  samples: number;
  animation?: AnimationOptions<'bar'>['animation'];
}
/**
 * A Singular horizontal progress bar chart that visualizes categorical dataset, plotted 1:1 category group
 */
export function CategoricalBarChart({
  topkCount,
  topkLabel,
  samples,
  animation = false,
}: CategoricalBarChartProps) {
  ChartJS.register(CategoryScale, BarElement);
  const chartOptions = getCatBarChartOptions(topkCount, samples, { animation });
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
  samples: number,
  { ...configOverrides }: ChartOptions<'bar'> = {},
): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        display: false,
        max: samples,
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
        intersect: false,
        callbacks: {
          title([{ dataIndex, dataset }]) {
            const result = dataset.data[dataIndex];
            const percentOfTotal = formatIntervalMinMax(count / samples);

            return `Count: ${result} (${percentOfTotal})`;
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
}: Omit<CategoricalBarChartProps, 'animation' | 'samples'>): ChartData<'bar'> {
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
        barPercentage,
        categoryPercentage,
      },
    ],
  };
}
