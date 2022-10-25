import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartDataset,
  AnimationOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatIntervalMinMax } from '../../../utils/formatters';

/**
 * Props to create FlatStackedBarChart Component
 */
export interface FlatStackedBarChartProps {
  data: {
    labels: string[];
    counts: number[];
    ratios: number[];
    colors: string[];
  };
  animation?: AnimationOptions<'bar'>['animation'];
}
/**
 * A stacked bar chart that visualizes a flat dataset, where every item in the list is shown as a bar segment of the entire stack (e.g. data composition - valids, negatives, zeroes, positives)
 * @param data the values labels & values
 * @returns a stacked bar chart that shows the composition: null + invalid + trues + falses = 100%
 */
export function FlatStackedBarChart({
  data,
  animation = false,
}: FlatStackedBarChartProps) {
  ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

  const chartOptions = getFlatSackedBarChartOptions(data, { animation });
  const chartData = getFlatSackedBarChartData(data);
  return <Bar data={chartData} options={chartOptions} plugins={[]} />;
}
/**
 * @param param0 chart data
 * @param param1  chart option overrides
 * @returns merged Chart.js option object for 'bar'
 */
export function getFlatSackedBarChartOptions(
  { counts, labels, ratios }: FlatStackedBarChartProps['data'],
  { ...configOverrides }: ChartOptions<'bar'> = {},
): ChartOptions<'bar'> {
  const max = counts.reduce((accum, v) => accum + v, 0);
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', //makes chart horizontal
    scales: {
      x: {
        max,
        stacked: true,
        display: false,
        grid: { display: false },
      },
      y: {
        stacked: true,
        display: false,
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title([{ datasetIndex }]) {
            const title = labels[datasetIndex];
            return title;
          },
          label({ datasetIndex }) {
            const ratio = formatIntervalMinMax(ratios[datasetIndex]);
            const count = counts[datasetIndex];
            const label = `${ratio}\n${count}`;
            return label;
          },
        },
      },
    },
    ...configOverrides,
  };
}
/**
 * @param param0 chart data
 * @returns merged Chart.js data object for 'bar'
 */
export function getFlatSackedBarChartData({
  counts,
  labels,
  colors,
}: FlatStackedBarChartProps['data']): ChartData<'bar'> {
  const datasets: ChartDataset<'bar'>[] = labels.map((label, idx) => {
    return {
      label,
      data: [counts[idx]], //one-slot only per dataset (flat)
      borderWidth: 0,
      barThickness: 16,
      barPercentage: 1.0,
      backgroundColor: colors[idx],
    };
  });

  return {
    labels: [''], //one-slot only
    datasets,
  };
}
