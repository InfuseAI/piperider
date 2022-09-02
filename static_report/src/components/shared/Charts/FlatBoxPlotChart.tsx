import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  LinearScale,
  CategoryScale,
  Legend,
  LegendItem,
  AnimationOptions,
} from 'chart.js';
import {
  BoxPlotController,
  BoxAndWiskers,
} from '@sgratzl/chartjs-chart-boxplot';

import { Chart } from 'react-chartjs-2';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { formatAsAbbreviatedNumber } from '../../../utils/formatters';

ChartJS.register(
  BoxPlotController,
  BoxAndWiskers,
  LinearScale,
  CategoryScale,
  Tooltip,
);
type Props = {
  quantileData: Pick<ColumnSchema, 'p50' | 'min' | 'max' | 'p25' | 'p75'>;
  animationOptions?: AnimationOptions<'boxplot'>['animation'];
};
/**
 * A flat boxplot chart that visualizes a single chartDataset (e.g. quantiles)
 * @param data the counts labels & values
 */
export function FlatBoxPlotChart({
  quantileData: { min, max, p25, p50, p75 },
  animationOptions = false,
}: Props) {
  const meanBackgroundColor = '#4780A8';
  const backgroundColor = '#D9D9D9';
  const legendItems: LegendItem[] = [
    { text: 'box region', fillStyle: backgroundColor },
    { text: 'p50', fillStyle: meanBackgroundColor },
  ];
  const newMin = Number(min);
  const newQ1 = Number(p25);
  const newMedian = Number(p50);
  const newQ3 = Number(p75);
  const newMax = Number(max);

  const chartOptions: ChartOptions<'boxplot'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animationOptions,
    layout: {
      padding: 10,
    },
    indexAxis: 'y',
    scales: {
      x: { offset: true },
      y: { display: false },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxHeight: 10,
          boxWidth: 10,
          usePointStyle: true,
          padding: 15,
          generateLabels() {
            return legendItems.map(({ text, fillStyle }) => ({
              lineWidth: 0,
              text,
              fillStyle,
            }));
          },
        },
      },
      tooltip: {
        callbacks: {
          label() {
            const formattedMin = formatAsAbbreviatedNumber(newMin);
            const formattedMax = formatAsAbbreviatedNumber(newMax);
            const formattedMean = formatAsAbbreviatedNumber(newMedian);
            const formattedQ1 = formatAsAbbreviatedNumber(newQ1);
            const formattedQ3 = formatAsAbbreviatedNumber(newQ3);
            const result = `MIN: ${formattedMin} / P25: ${formattedQ1} / P50 (median): ${formattedMean} / P75: ${formattedQ3} / MAX: ${formattedMax}`;
            return result;
          },
        },
      },
    },
  };
  const chartData: ChartData<'boxplot'> = {
    labels: [''],
    datasets: [
      {
        data: [
          {
            min: Number(min),
            q1: Number(p25),
            mean: Number(p50),
            q3: Number(p75),
            max: Number(max),
            //ignored but required interface
            median: Number(p50),
            items: [],
            outliers: [],
          },
        ],
        borderWidth: 1,
        itemRadius: 1,
        medianColor: meanBackgroundColor,
        meanBackgroundColor,
        backgroundColor,
        borderColor: '#FF0861',
        hitPadding: 10,
      },
    ],
  };
  return (
    <Chart
      type={'boxplot'}
      data={chartData}
      options={chartOptions}
      plugins={[Legend]}
    />
  );
}
