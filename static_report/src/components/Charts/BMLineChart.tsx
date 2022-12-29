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
import { BLACK_COLOR, colorMap, DBTBusinessMetricGroupItem } from '../../lib';

import 'chartjs-adapter-date-fns';
/**
 * A line chart variant to visualize dbt processed business metrics, based on the dimension and time grain provided via Piperider CLI's report `metrics` property.
 */
type Props = {
  data?: (DBTBusinessMetricGroupItem | undefined)[]; //treat as multiple datasets
  timeGrain?: TimeUnit;
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
  //NOTE: colorList (max: up to 6)
  const colorList = [...colorMap.values()];

  // for each BMGroup, map its chart dataset
  data.forEach((d, i) => {
    const { data = [] } = d ?? {};
    const [labels, dataValues] = data;

    //NOTE: narrow dependency (first-val: target > base)
    labelVal = labelVal ?? labels;

    const numericalDataValues = dataValues.map((v) => Number(v) ?? 0);
    datasets.push({
      data: numericalDataValues,
      borderColor: colorList[i],
      pointBorderColor: BLACK_COLOR,
    });
  });

  const chartOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      tooltip: {
        mode: 'index',
        position: 'nearest',
        intersect: false,
        callbacks: {
          labelColor: function ({ datasetIndex }) {
            return {
              borderColor: BLACK_COLOR,
              backgroundColor: colorList[datasetIndex],
            };
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeGrain,
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
