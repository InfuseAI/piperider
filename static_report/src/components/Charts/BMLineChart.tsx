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
  data?: (DBTBusinessMetricGroupItem | undefined)[]; //treat as multiple datasets
  timeGrain: string;
};
export function BMLineChart({ data = [], timeGrain }: Props) {
  ChartJS.register(
    LineController,
    LineElement,
    PointElement,
    TimeSeriesScale,
    LinearScale,
    CategoryScale,
    Tooltip,
  );

  let labelVal;
  const datasets: ChartDataset<'line'>[] = [];

  // for each BMGroup, map its chart dataset
  data.forEach((d) => {
    const { results = [] } = d ?? {};

    // TODO: Figure out how to decide which label to use? (CR: data range desync)
    const { data: [labels, dataValues] = [] } =
      results.find(
        (timeGrainGroup) => timeGrainGroup.params.grain === timeGrain,
      ) ?? {};

    labelVal = labelVal ?? labels; //NOTE: narrow dependency (first-val-win)

    // TODO: Line Colors (Order-Specific Colors)
    const numericalDataValues = dataValues.map((v) => Number(v) ?? 0);
    datasets.push({ data: numericalDataValues });
  });

  // TODO: tooltip hover area increase
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
    labels: labelVal,
  };

  return <Line data={chartData} options={chartOpts} />;
}
