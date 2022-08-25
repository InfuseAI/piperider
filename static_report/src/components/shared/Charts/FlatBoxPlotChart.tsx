import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  LinearScale,
  CategoryScale,
  Legend,
  LegendItem,
} from 'chart.js';
import {
  BoxPlotController,
  BoxAndWiskers,
} from '@sgratzl/chartjs-chart-boxplot';

import { Chart } from 'react-chartjs-2';
import { Histogram } from '../../../sdlc/single-report-schema';

ChartJS.register(
  BoxPlotController,
  BoxAndWiskers,
  LinearScale,
  CategoryScale,
  Tooltip,
);
type Props = {
  histogram: Histogram;
};
/**
 * A flat boxplot chart that visualizes a single dataset (e.g. quantiles)
 * @param data the counts labels & values
 */
export function FlatBoxPlotChart({ histogram: { counts } }: Props) {
  const medianColor = '#63B3ED';
  const meanBackgroundColor = '#4780A8';
  const itemBackgroundColor = '#51DBCB';
  const backgroundColor = '#D9D9D9';
  const outlierBackgroundColor = '#FFCF36';
  const legendItems: LegendItem[] = [
    { text: 'box region', fillStyle: backgroundColor },
    { text: 'data plots', fillStyle: itemBackgroundColor },
    { text: 'mean', fillStyle: meanBackgroundColor },
    { text: 'outliers', fillStyle: outlierBackgroundColor },
  ];
  const chartOptions: ChartOptions<'boxplot'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
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
    },
  };
  const chartData: ChartData<'boxplot'> = {
    labels: [''],
    datasets: [
      {
        data: [counts],
        borderWidth: 1,
        itemRadius: 1,
        medianColor,
        meanBackgroundColor,
        itemBackgroundColor,
        backgroundColor,
        outlierBackgroundColor,
        borderColor: '#FF0861',
        outlierBorderColor: '#DBB32E',
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
