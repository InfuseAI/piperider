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
import { ColumnSchema } from '../../../sdlc/single-report-schema';

ChartJS.register(
  BoxPlotController,
  BoxAndWiskers,
  LinearScale,
  CategoryScale,
  Tooltip,
);
type Props = {
  columnDatum: ColumnSchema;
};
/**
 * A flat boxplot chart that visualizes a single dataset (e.g. quantiles)
 * @param data the counts labels & values
 */
export function FlatBoxPlotChart({
  columnDatum: { min, p5, p25, p50, p75, p95, max, histogram, avg },
}: Props) {
  const chartOptions: ChartOptions<'boxplot'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: {
      padding: 10,
    },
    indexAxis: 'y',
    scales: {
      x: {},
      y: { display: false },
    },
  };
  const chartData: ChartData<'boxplot'> = {
    labels: ['placeholder'],
    datasets: [
      {
        data: [
          {
            items: histogram?.counts ?? [],
            min: min as number,
            max: max as number,
            mean: avg as number,
            q1: p25 as number,
            q3: p75 as number,
            median: (avg as number) + 1,
            outliers: [0],
          },
        ],
        borderWidth: 1,
        borderColor: '#FF0861',
        medianColor: '#63B3ED',
        backgroundColor: '#D9D9D9',
        outlierBackgroundColor: '#FFCF36',
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
