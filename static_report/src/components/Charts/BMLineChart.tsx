import {
  CategoryScale,
  ChartData,
  ChartDataset,
  LinearScale,
  TimeSeriesScale,
  Tooltip,
  Chart as ChartJS,
  ChartOptions,
  LineController,
  LineElement,
  PointElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DBTBusinessMetricItem } from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: DBTBusinessMetricItem;
};
export function BMLineChart({ data }: Props) {
  ChartJS.register(
    LineController,
    LineElement,
    PointElement,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
    Tooltip,
  );
  // Should get the list of dataset values list (2D), in indexed order
  const datasetDataValues = (data?.data || []).reduce<number[][]>(
    (accum, [, ...rowVals], i) => {
      //skips first element, which is the date timestamp
      rowVals.forEach((v, k) => {
        const value = Number(v);
        const datasetRow = accum[k];
        // add to existing OR initialize new array
        // ref integrity intact (dealing with array/objects)
        Array.isArray(datasetRow)
          ? datasetRow.push(value)
          : (accum[k] = [value]);
      });
      return accum;
    },
    [],
  );
  const datasets: ChartDataset<'line'>[] = datasetDataValues.map((data) => ({
    data,
  }));
  // timestamp per dataset row (all)
  const labels = data?.data.map(([dateString]) => dateString);
  const chartData: ChartData<'line'> = {
    datasets,
    labels,
  };
  const chartOpts: ChartOptions<'line'> = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month', //TODO: depends on time grain toggle event
        },
      },
    },
  };

  return <Line data={chartData} options={chartOpts} />;
}
