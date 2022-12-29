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
  TimeUnit,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DBTBusinessMetricGroupItem } from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: DBTBusinessMetricGroupItem;
  timeGrain: string;
};
export function BMLineChart({ data, timeGrain }: Props) {
  ChartJS.register(
    LineController,
    LineElement,
    PointElement,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
    Tooltip,
  );

  const { results = [] } = data ?? {};

  const { data: [labels, dataValues] = [] } =
    results.find(
      (timeGrainGroup) => timeGrainGroup.params.grain === timeGrain,
    ) ?? {};
  // console.log(data?.name, timeGrain, { labels, dataValues });

  const numericalDataValues = dataValues.map((v) => Number(v) ?? 0);
  const datasets: ChartDataset<'line'>[] = [{ data: numericalDataValues }];

  const chartOpts: ChartOptions<'line'> = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeGrain as TimeUnit,
        },
      },
    },
  };
  const chartData: ChartData<'line'> = {
    datasets,
    labels,
  };

  return <Line data={chartData} options={chartOpts} />;
}
