import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  ArcElement,
  Legend,
  AnimationOptions,
  ChartDataset,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { formatIntervalMinMax } from '../../../utils/formatters';

/**
 * Props for creating a BooleanPieChart Component
 */
export interface BooleanPieChartProps {
  data: {
    labels: string[];
    counts: number[];
    ratios: number[];
  };
  animation?: AnimationOptions<'pie'>['animation'];
}
/**
 * @description A pie chart that visualizes boolean dataset
 * @param data the counts labels & values
 * @returns a pie chart that shows the composition: null + invalid + trues + falses = 100%
 */
export function BooleanPieChart({
  data: { counts, labels, ratios },
  animation = false,
}: BooleanPieChartProps) {
  ChartJS.register(ArcElement);
  const chartOptions = getBooleanPieChartOptions(ratios, {
    animation,
  });
  const chartData = getBooleanPieChartData(labels, {
    data: counts,
  });
  return (
    <Pie data={chartData} options={chartOptions} plugins={[Tooltip, Legend]} />
  );
}

/**
 * @param labels labels for each pie slice
 * @param dataset single dataset for the pie
 * @returns Chart.js data object
 */
export function getBooleanPieChartData(
  labels: string[],
  dataset: ChartDataset<'pie'>,
): ChartData<'pie'> {
  return {
    labels,
    datasets: [
      {
        borderWidth: 0,
        backgroundColor: ['#63B3ED', '#FFCF36', '#D9D9D9', '#FF0861'], // trues, falses, nulls, invalids
        hoverOffset: 4,
        ...dataset,
      },
    ],
  };
}
/**
 * @param ratios list of {v} / sample ratio metric
 * @param param1  chart option overrides
 * @returns merged Chart.js option object for 'pie'
 */
export function getBooleanPieChartOptions(
  ratios: BooleanPieChartProps['data']['ratios'],
  { ...configOverrides }: ChartOptions<'pie'> = {},
): ChartOptions<'pie'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 10,
    },
    plugins: {
      legend: {
        position: 'left',
        labels: {
          textAlign: 'left',
          boxHeight: 15,
          boxWidth: 15,
          generateLabels({ data: { datasets, labels } }) {
            return datasets[0].data.map((data, i) => ({
              text: `${labels?.[i]} \n ${formatIntervalMinMax(
                ratios[i],
              )} / ${data}`,
              fillStyle: datasets?.[0]?.backgroundColor?.[i],
            }));
          },
        },
      },
    },
    ...configOverrides,
  };
}
