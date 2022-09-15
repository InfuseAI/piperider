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
import { getBoxPlotKeyData } from './utils';

const meanBackgroundColor = '#4780A8';
const backgroundColor = '#D9D9D9';

/**
 * Props for creating a FlatBoxPlotChart Component
 */
export interface FlatBoxPlotChartProps {
  quantileData: Pick<ColumnSchema, 'p50' | 'min' | 'max' | 'p25' | 'p75'>;
  animation?: AnimationOptions<'boxplot'>['animation'];
}
/**
 * A flat boxplot chart that visualizes a single chartDataset (e.g. quantiles)
 * @param data the counts labels & values
 */
export default function FlatBoxPlotChart({
  quantileData,
  animation = false,
}: FlatBoxPlotChartProps) {
  ChartJS.register(
    BoxPlotController,
    BoxAndWiskers,
    LinearScale,
    CategoryScale,
  );

  const chartOptions = getBoxPlotChartOptions(quantileData, { animation });
  const chartData = getBoxPlotChartData(quantileData);
  return (
    <Chart
      type={'boxplot'}
      data={chartData}
      options={chartOptions}
      plugins={[Legend, Tooltip]}
    />
  );
}

/**
 * @param quantileData max, min, mean, q1, q3
 * @param param1  chart option overrides
 * @returns merged Chart.js option object for 'boxplot'
 */
export function getBoxPlotChartOptions(
  quantileData: FlatBoxPlotChartProps['quantileData'],
  { ...configOverrides }: ChartOptions<'boxplot'> = {},
): ChartOptions<'boxplot'> {
  const {
    max: newMax,
    min: newMin,
    mean: newMean,
    q1: newQ1,
    q3: newQ3,
  } = getBoxPlotKeyData(quantileData);
  const legendItems: LegendItem[] = [
    { text: 'box region', fillStyle: backgroundColor },
    { text: 'p50', fillStyle: meanBackgroundColor },
  ];
  return {
    responsive: true,
    maintainAspectRatio: false,
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
            const formattedMean = formatAsAbbreviatedNumber(newMean);
            const formattedQ1 = formatAsAbbreviatedNumber(newQ1);
            const formattedQ3 = formatAsAbbreviatedNumber(newQ3);
            const result = `MIN: ${formattedMin} / P25: ${formattedQ1} / P50 (median): ${formattedMean} / P75: ${formattedQ3} / MAX: ${formattedMax}`;
            return result;
          },
        },
      },
    },
    ...configOverrides,
  };
}
/**
 * @param quantileData max, min, mean, q1, q3
 * @returns merged Chart.js data object for 'boxplot'
 */
export function getBoxPlotChartData(
  quantileData: FlatBoxPlotChartProps['quantileData'],
): ChartData<'boxplot'> {
  const {
    max: newMax,
    min: newMin,
    mean: newMean,
    q1: newQ1,
    q3: newQ3,
  } = getBoxPlotKeyData(quantileData);
  return {
    labels: [''],
    datasets: [
      {
        data: [
          {
            min: newMin,
            q1: newQ1,
            mean: newMean,
            q3: newQ3,
            max: newMax,
            median: newMean, //median is ignored but required interface
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
}
