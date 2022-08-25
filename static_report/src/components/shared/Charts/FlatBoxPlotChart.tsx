import {
  ChartOptions,
  Chart as ChartJS,
  Tooltip,
  ChartData,
  LinearScale,
  CategoryScale,
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
      tooltip: {
        callbacks: {},
      },
    },
  };
  const chartData: ChartData<'boxplot'> = {
    labels: [''],
    datasets: [
      {
        data: [counts],
        borderWidth: 1,
        itemRadius: 2,
        borderColor: '#FF0861',
        medianColor: '#63B3ED',
        meanBackgroundColor: '#4780A8',
        itemBackgroundColor: '#51DBCB',
        backgroundColor: '#D9D9D9',
        outlierBackgroundColor: '#FFCF36',
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
      plugins={[]}
    />
  );
}
