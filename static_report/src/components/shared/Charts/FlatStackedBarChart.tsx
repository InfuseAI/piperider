import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  CategoryScale,
  LinearScale,
  BarElement,
  Legend,
  ChartDataset,
  AnimationOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  formatIntervalMinMax,
  formatTitleCase,
} from '../../../utils/formatters';

ChartJS.register(Tooltip, CategoryScale, LinearScale, BarElement);
export interface FlatStackedBarChartProps {
  data: {
    labels: string[];
    counts: number[];
    ratios: number[];
    colors: string[];
  };
  animationOptions?: AnimationOptions<'bar'>['animation'];
}
/**
 * A stacked bar chart that visualizes a flat dataset, where every item in the list is shown as a bar segment of the entire stack (e.g. data composition - valids, negatives, zeroes, positives)
 * @param data the values labels & values
 * @returns a stacked bar chart that shows the composition: null + invalid + trues + falses = 100%
 */
export function FlatStackedBarChart({
  data: { labels, counts, ratios, colors },
  animationOptions = false,
}: FlatStackedBarChartProps) {
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    animation: animationOptions,
    maintainAspectRatio: false,
    indexAxis: 'y', //makes chart horizontal
    scales: {
      x: { stacked: true, display: false, grid: { display: false } },
      y: { stacked: true, display: false, grid: { display: false } },
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
      legend: {
        position: 'bottom',
        align: 'end',
        labels: {
          padding: 15,
          textAlign: 'left',
          boxHeight: 10,
          boxWidth: 10,
          usePointStyle: true,
          generateLabels({ data: { datasets } }) {
            return datasets.map(({ backgroundColor }, index) => {
              const ratio = formatIntervalMinMax(ratios[index]);
              const label = formatTitleCase(labels[index]);
              return {
                lineWidth: 0,
                text: `${label}  (${ratio})`,
                fontColor: 'rgba(0,0,0,0.7)',
                fillStyle: backgroundColor as string,
              };
            });
          },
        },
      },
    },
  };
  const datasets: ChartDataset<'bar'>[] = labels.map((label, idx) => {
    return {
      label,
      data: [counts[idx]], //one-slot only per dataset (flat)
      borderWidth: 0,
      backgroundColor: colors[idx],
    };
  });

  const chartData: ChartData<'bar'> = {
    labels: [''], //one-slot only
    datasets,
  };
  return <Bar data={chartData} options={chartOptions} plugins={[Legend]} />;
}
